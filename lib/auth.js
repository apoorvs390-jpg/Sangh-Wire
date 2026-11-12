// Sangh Wire — password protection (shared by Vercel middleware, Netlify edge function and the API functions)
// Uses only standard Web APIs (crypto.subtle, TextEncoder), so it runs on Vercel Edge, Netlify Edge (Deno) and Node 20+.

import { PASSWORD } from "./password.js";

const COOKIE = "sw_auth";
const SESSION_DAYS = 30;

// Files that must never be served to the public (source code, password file, config)
const BLOCKED_PREFIXES = ["/lib/", "/netlify/", "/scripts/", "/.github/"];
const BLOCKED_FILES = ["/middleware.js", "/package.json", "/netlify.toml", "/vercel.json", "/README.md"];

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (s) => new Uint8Array((s.match(/../g) || []).map((h) => parseInt(h, 16)));

export function isConfigured() {
  return Boolean(PASSWORD && PASSWORD.hash && PASSWORD.salt && PASSWORD.secret);
}

function safeEqual(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

// ---------- password check (PBKDF2-SHA256, same as the setup page) ----------
export async function checkPassword(pw) {
  if (!isConfigured() || typeof pw !== "string" || !pw) return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: unhex(PASSWORD.salt), iterations: PASSWORD.iterations || 210000 },
    key, 256);
  return safeEqual(hex(bits), PASSWORD.hash);
}

// ---------- session cookie: "<expiry>.<HMAC>" signed with the secret from password.js ----------
async function sign(msg) {
  const key = await crypto.subtle.importKey("raw", unhex(PASSWORD.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode("sw1." + msg)));
}

export async function makeSessionCookie(req) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const value = `${exp}.${await sign(String(exp))}`;
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookie(req) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
}

function readCookie(req, name) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

// ---------- admin system: only the browser that holds the admin key can change the password ----------
const ADMIN_COOKIE = "sw_admin";
const ADMIN_DAYS = 400; // browsers cap cookies at ~400 days; it is renewed on every visit
const normCode = (c) => String(c || "").toLowerCase().replace(/[^0-9a-f]/g, "");

async function sha256hex(s) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
}
export const adminIsSet = () => Boolean(PASSWORD.adminHash);

export async function isAdmin(req) {
  if (!PASSWORD.adminHash) return false;
  const k = normCode(readCookie(req, ADMIN_COOKIE));
  return k.length >= 24 && safeEqual(await sha256hex(k), PASSWORD.adminHash);
}
function adminCookie(req, key) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${normCode(key)}; Path=/; Max-Age=${ADMIN_DAYS * 86400}; HttpOnly; SameSite=Lax${secure}`;
}

export async function isAuthed(req) {
  if (!isConfigured()) return false;
  const v = readCookie(req, COOKIE);
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || +exp < Date.now()) return false;
  return safeEqual(sig, await sign(exp));
}

// Only allow redirects back to our own pages
export function safeNext(n) {
  n = String(n || "/");
  if (!n.startsWith("/") || n.startsWith("//") || n.startsWith("/\\") || n.startsWith("/api/") || n.startsWith("/login")) return "/";
  return n;
}

// ---------- the gate: returns a Response to stop the request, or null to let it through ----------
export async function gate(req) {
  const url = new URL(req.url);
  const p = url.pathname;

  if (BLOCKED_FILES.includes(p) || BLOCKED_PREFIXES.some((b) => p.startsWith(b)) || (p.startsWith("/api/") && p.endsWith(".js"))) {
    return new Response("Not found", { status: 404 });
  }
  // the login endpoint itself and platform-internal paths
  if (p === "/api/login" || p.startsWith("/.netlify/") || p.startsWith("/_vercel/")) return null;

  if (p === "/logout") {
    return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": clearSessionCookie(req) } });
  }

  const isData = p.startsWith("/api/") || p.startsWith("/data/");

  if (!isConfigured()) {
    if (isData) return jsonResp({ error: "Password abhi set nahi hua hai. Site kholkar password set karein." }, 401);
    return htmlResp(setupPage(true));
  }

  if (!(await isAuthed(req))) {
    if (isData) return jsonResp({ error: "Login required", login: true }, 401);
    const next = p === "/login" ? safeNext(url.searchParams.get("next")) : safeNext(p + url.search);
    return htmlResp(loginPage(next, url.searchParams.get("err") === "1"), 401);
  }

  if (p === "/login") return new Response(null, { status: 303, headers: { Location: safeNext(url.searchParams.get("next")) } });
  // tells the page whether to show "पासवर्ड बदलें"; also renews the admin cookie
  if (p === "/auth/status") {
    const admin = await isAdmin(req);
    const headers = { "Content-Type": "application/json", ...NOSTORE };
    if (admin) headers["Set-Cookie"] = adminCookie(req, readCookie(req, ADMIN_COOKIE));
    return new Response(JSON.stringify({ admin, adminSet: adminIsSet() }), { headers });
  }

  if (p === "/setup") {
    if (await isAdmin(req)) return htmlResp(setupPage(false, PASSWORD.adminHash));
    // old password file without an admin system: first person to make a new file becomes admin
    if (!adminIsSet()) return htmlResp(setupPage(false, ""));
    return htmlResp(notAdminPage(), 403);
  }

  // make this browser the admin again using the recovery code
  if (p === "/admin") {
    if (req.method === "POST") {
      const code = normCode(new URLSearchParams(await req.text()).get("code"));
      if (adminIsSet() && code.length >= 24 && safeEqual(await sha256hex(code), PASSWORD.adminHash)) {
        return new Response(null, { status: 303, headers: { Location: "/setup", "Set-Cookie": adminCookie(req, code) } });
      }
      await new Promise((r) => setTimeout(r, 800));
      return htmlResp(adminPage(true), 403);
    }
    if (await isAdmin(req)) return new Response(null, { status: 303, headers: { Location: "/setup" } });
    return htmlResp(adminPage(false));
  }
  return null;
}

const NOSTORE = { "Cache-Control": "no-store, private", "X-Robots-Tag": "noindex" };
const jsonResp = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...NOSTORE } });
const htmlResp = (html, status = 200) => new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...NOSTORE } });
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- pages ----------
const STYLE = `
:root{--bg:#f4f2ee;--surf:#fff;--line:#ddd9d0;--ink:#1a1814;--muted:#6b6560;--accent:#b5470f;--green:#1e7a4a}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans',system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.box{background:var(--surf);border:1px solid var(--line);border-radius:6px;box-shadow:0 2px 12px rgba(0,0,0,.08);padding:30px 28px;width:100%;max-width:440px}
.eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
h1{font-family:'Source Serif 4',Georgia,serif;font-size:28px;margin-bottom:6px}
p{color:var(--muted);font-size:13.5px;line-height:1.6;margin-bottom:16px}
label{display:block;font-size:12px;font-weight:600;margin:12px 0 5px}
input{width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:4px;font-size:15px;font-family:inherit}
input:focus{outline:2px solid rgba(181,71,15,.25);border-color:var(--accent)}
button,.btn{display:inline-block;margin-top:16px;width:100%;background:var(--accent);color:#fff;border:none;padding:12px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.07em;text-transform:uppercase;font-weight:600;cursor:pointer;text-align:center;text-decoration:none}
button:hover,.btn:hover{background:#9a3a08}
button.ghost{background:#fff;color:var(--accent);border:1px solid var(--accent)}
.err{background:rgba(181,71,15,.08);color:var(--accent);border:1px solid rgba(181,71,15,.25);padding:9px 12px;border-radius:4px;font-size:13px;margin-bottom:6px}
.ok{background:rgba(30,122,74,.08);border:1px solid rgba(30,122,74,.25);padding:14px;border-radius:4px;font-size:13px;line-height:1.7;margin-top:18px}
ol{padding-left:20px}code{font-family:'IBM Plex Mono',monospace;background:#f0ede8;padding:1px 5px;border-radius:3px;font-size:12px}
textarea{width:100%;height:120px;margin-top:10px;font-family:'IBM Plex Mono',monospace;font-size:11px;border:1px solid var(--line);border-radius:4px;padding:8px}
.show{font-size:12px;color:var(--muted);margin-top:8px;display:flex;gap:6px;align-items:center}
.show input{width:auto}
.foot{margin-top:14px;font-size:12px;text-align:center}.foot a{color:var(--muted)}
`;
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,700&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">`;
const HEAD = (title) => `<!DOCTYPE html><html lang="hi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>${FONTS}<style>${STYLE}</style></head><body>`;

function loginPage(next, err) {
  return HEAD("Sangh Wire — लॉगिन") + `
<form class="box" method="POST" action="/api/login">
  <div class="eyebrow">🔒 Protected</div>
  <h1>Sangh Wire</h1>
  <p>यह टूल पासवर्ड से सुरक्षित है। आगे बढ़ने के लिए पासवर्ड डालें।</p>
  ${err ? '<div class="err">पासवर्ड गलत है। दोबारा कोशिश करें।</div>' : ""}
  <label for="pw">पासवर्ड</label>
  <input id="pw" name="password" type="password" autocomplete="current-password" required autofocus>
  <label class="show"><input type="checkbox" onclick="pw.type=this.checked?'text':'password'"> पासवर्ड दिखाएँ</label>
  <input type="hidden" name="next" value="${escAttr(next)}">
  <button type="submit">खोलें →</button>
</form></body></html>`;
}

function setupPage(first, keepAdminHash = "") {
  return HEAD("Sangh Wire — पासवर्ड सेट करें") + `
<div class="box">
  <div class="eyebrow">${first ? "🔐 पहली बार सेटअप" : "🔐 पासवर्ड बदलें"}</div>
  <h1>${first ? "पासवर्ड सेट करें" : "नया पासवर्ड"}</h1>
  <p>${first
    ? "Sangh Wire को सुरक्षित करने के लिए एक पासवर्ड चुनें। इसके बाद जो भी लिंक खोलेगा, उसे यही पासवर्ड डालना होगा।"
    : "नया पासवर्ड डालें। नई फ़ाइल GitHub पर अपलोड होते ही पुराना पासवर्ड बंद हो जाएगा और सबको नए पासवर्ड से दोबारा लॉगिन करना होगा।"}</p>
  <div id="err" class="err" style="display:none"></div>
  <label for="p1">नया पासवर्ड (कम से कम 8 अक्षर)</label>
  <input id="p1" type="password" autocomplete="new-password">
  <label for="p2">पासवर्ड दोबारा डालें</label>
  <input id="p2" type="password" autocomplete="new-password">
  <label class="show"><input type="checkbox" onclick="p1.type=p2.type=this.checked?'text':'password'"> पासवर्ड दिखाएँ</label>
  <button id="go" onclick="gen()">पासवर्ड फ़ाइल बनाएँ</button>
  <div id="out" class="ok" style="display:none">
    <div id="adm" style="display:none;background:#fff7e6;border:1px solid #f0c36d;border-radius:4px;padding:10px 12px;margin-bottom:12px">
      <b>🛡 यह सिस्टम अब एडमिन है।</b> पासवर्ड सिर्फ़ इसी ब्राउज़र से बदला जा सकेगा।<br>
      <b>एडमिन रिकवरी कोड</b> (कहीं सुरक्षित लिख लें — ब्राउज़र का डेटा मिटने या नया कंप्यूटर लेने पर इसी से एडमिन वापस मिलेगा, <code>/admin</code> पेज पर):
      <div id="rc" style="font-family:'IBM Plex Mono',monospace;font-size:15px;font-weight:600;letter-spacing:.04em;margin-top:6px;word-break:break-all"></div>
    </div>
    <b>✅ फ़ाइल तैयार है। बस 2 काम बाकी हैं:</b>
    <ol>
      <li>नीचे वाले बटन से <code>password.js</code> डाउनलोड करें।</li>
      <li>GitHub पर अपनी Sangh-Wire repo में <code>lib</code> फ़ोल्डर खोलें → <b>Add file → Upload files</b> → यह <code>password.js</code> डालकर <b>Commit changes</b> दबाएँ (पुरानी फ़ाइल बदल जाएगी)।</li>
    </ol>
    1–2 मिनट में Vercel और Netlify दोनों अपने-आप अपडेट हो जाएँगे, फिर लिंक खोलने पर पासवर्ड माँगा जाएगा।
    <button id="dl" class="ghost">⬇ password.js डाउनलोड करें</button>
    <textarea id="code" readonly></textarea>
    <p style="margin:8px 0 0;font-size:11.5px">इस फ़ाइल में आपका असली पासवर्ड नहीं है, सिर्फ़ उसका सुरक्षित hash है। पासवर्ड कहीं लिखकर रखें — यह फ़ाइल से वापस नहीं निकाला जा सकता।</p>
  </div>
  ${first ? "" : '<div class="foot"><a href="/">← वापस Sangh Wire पर</a></div>'}
</div>
<script>
var ITER = 210000;
var KEEP_ADMIN = "${keepAdminHash}"; // filled only when this browser is already the admin
function hex(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return ('0'+x.toString(16)).slice(-2)}).join('')}
function fail(m){var e=document.getElementById('err');e.textContent=m;e.style.display='block'}
async function gen(){
  document.getElementById('err').style.display='none';
  var a=document.getElementById('p1').value, b=document.getElementById('p2').value;
  if(a.length<8) return fail('पासवर्ड कम से कम 8 अक्षर का होना चाहिए।');
  if(a!==b) return fail('दोनों पासवर्ड मेल नहीं खाते।');
  if(!window.crypto||!crypto.subtle) return fail('यह ब्राउज़र सपोर्ट नहीं करता। Chrome में https:// लिंक से खोलें।');
  var btn=document.getElementById('go'); btn.disabled=true; btn.textContent='बन रहा है…';
  try{
    var salt=crypto.getRandomValues(new Uint8Array(16)), secret=crypto.getRandomValues(new Uint8Array(32));
    var key=await crypto.subtle.importKey('raw',new TextEncoder().encode(a),'PBKDF2',false,['deriveBits']);
    var bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:salt,iterations:ITER},key,256);
    var adminHash = KEEP_ADMIN, code = '';
    if(!adminHash){
      var k = hex(crypto.getRandomValues(new Uint8Array(12)));          // 24-character admin key
      adminHash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k)));
      document.cookie = 'sw_admin='+k+'; Path=/; Max-Age='+(400*86400)+'; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
      code = k.match(/.{4}/g).join('-').toUpperCase();
    }
    var file='// Sangh Wire — password file (bana: '+new Date().toLocaleString('en-IN')+')\\n'+
      '// Isme asli password nahi hai, sirf uska hash. Password badalna ho to site par /setup kholein.\\n'+
      'export const PASSWORD = {\\n'+
      '  iterations: '+ITER+',\\n'+
      '  salt: "'+hex(salt)+'",\\n'+
      '  hash: "'+hex(bits)+'",\\n'+
      '  secret: "'+hex(secret)+'",\\n'+
      '  adminHash: "'+adminHash+'",\\n'+
      '  createdAt: "'+new Date().toISOString()+'"\\n'+
      '};\\n';
    document.getElementById('code').value=file;
    document.getElementById('dl').onclick=function(){
      var u=URL.createObjectURL(new Blob([file],{type:'text/javascript'}));
      var l=document.createElement('a'); l.href=u; l.download='password.js'; document.body.appendChild(l); l.click(); l.remove();
      setTimeout(function(){URL.revokeObjectURL(u)},2000);
    };
    if(code){ document.getElementById('rc').textContent=code; document.getElementById('adm').style.display='block'; }
    else document.getElementById('adm').style.display='none';
    document.getElementById('out').style.display='block';
    document.getElementById('p1').value=document.getElementById('p2').value='';
  }catch(e){ fail('गड़बड़ हुई: '+e.message); }
  btn.disabled=false; btn.textContent='पासवर्ड फ़ाइल बनाएँ';
}
</script></body></html>`;
}

function notAdminPage() {
  return HEAD("Sangh Wire — अनुमति नहीं") + `
<div class="box">
  <div class="eyebrow">🛡 सिर्फ़ एडमिन</div>
  <h1>अनुमति नहीं</h1>
  <p>पासवर्ड सिर्फ़ एडमिन सिस्टम (जिस ब्राउज़र से पासवर्ड सेट किया गया था) से बदला जा सकता है।</p>
  <p style="font-size:12.5px">अगर आप एडमिन हैं और ब्राउज़र/कंप्यूटर बदल गया है, तो अपना एडमिन रिकवरी कोड डालकर इस सिस्टम को एडमिन बना सकते हैं।</p>
  <a class="btn" href="/admin">रिकवरी कोड डालें</a>
  <div class="foot"><a href="/">← वापस Sangh Wire पर</a></div>
</div></body></html>`;
}

function adminPage(err) {
  return HEAD("Sangh Wire — एडमिन रिकवरी") + `
<form class="box" method="POST" action="/admin">
  <div class="eyebrow">🛡 एडमिन रिकवरी</div>
  <h1>इस सिस्टम को एडमिन बनाएँ</h1>
  <p>पासवर्ड सेट करते समय मिला एडमिन रिकवरी कोड डालें। इसके बाद इसी ब्राउज़र से पासवर्ड बदला जा सकेगा।</p>
  ${err ? '<div class="err">कोड गलत है।</div>' : ""}
  <label for="code">एडमिन रिकवरी कोड</label>
  <input id="code" name="code" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" autocomplete="off" required autofocus>
  <button type="submit">पुष्टि करें</button>
  <div class="foot"><a href="/">← वापस Sangh Wire पर</a></div>
</form></body></html>`;
}
