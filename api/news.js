// Sangh Wire — news function
// Free & unlimited: Google News RSS on every Refresh (no API key needed)
// + daily SerpAPI results saved by GitHub Actions in data/serp.json (no quota used by clicks)
// Last 7 days only. Works on Vercel (/api/news) and Netlify (netlify/functions/news.mjs).

import { PEOPLE, parseDate } from "../lib/shared.js";

const CACHE_TTL = 5 * 60 * 1000;   // 5 min saved copy, avoids hammering Google News
globalThis.__SW_CACHE = globalThis.__SW_CACHE || {};

async function handler(req) {
  const NOW = Date.now();
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const json = (obj) => new Response(JSON.stringify(obj), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });

  const url = new URL(req.url);
  const pk = url.searchParams.get("person");
  const fresh = url.searchParams.get("fresh") === "1";
  const cacheKey = pk || "all";
  const hit = globalThis.__SW_CACHE[cacheKey];
  if (hit && !fresh && NOW - hit.ts < CACHE_TTL) {
    return json({ ...hit.payload, cached: true });
  }

  const ageDays = (d) => { const t = parseDate(d, NOW); return t === null ? null : (NOW - t) / 86400000; };
  const isRecent = (d) => { const t = parseDate(d, NOW); return t !== null && NOW - t <= MAX_AGE_MS && t - NOW < 86400000; };

  // ---------- Google News RSS (free) ----------
  const decode = (s) => String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, "&");
  const tag = (block, name) => {
    const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
    return m ? decode(m[1]).trim() : null;
  };

  async function searchRss(q, hl, errors) {
    const lang = hl === "hi"
      ? { hl: "hi", gl: "IN", ceid: "IN:hi" }
      : { hl: "en-IN", gl: "IN", ceid: "IN:en" };
    const params = new URLSearchParams({ q, ...lang });
    try {
      const r = await fetch(`https://news.google.com/rss/search?${params}`, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SanghWire/1.0)" },
      });
      if (!r.ok) { errors.push(`Google News HTTP ${r.status}`); return []; }
      const xml = await r.text();
      const out = [];
      for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
        const b = m[1];
        const source = tag(b, "source");
        let title = tag(b, "title") || "";
        if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
        const pubDate = tag(b, "pubDate");
        if (!title || !isRecent(pubDate)) continue;
        const snippet = (tag(b, "description") || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        out.push({
          title: title.trim(), link: tag(b, "link") || "#", pubDate, source,
          ageDays: ageDays(pubDate), snippet: snippet || null,
        });
      }
      return out;
    } catch (e) {
      errors.push(String(e.message || e).slice(0, 120));
      return [];
    }
  }

  // Collect whatever finished inside the time budget (prevents timeouts)
  async function runQueries(queries, errors) {
    const collected = [];
    const jobs = queries.map(({ q, hl }) =>
      searchRss(q, hl, errors).then((r) => { collected.push(...r); }));
    await Promise.race([Promise.allSettled(jobs), new Promise((res) => setTimeout(res, 8500))]);
    return collected.slice();
  }

  // ---------- daily SerpAPI results (saved file, no quota used here) ----------
  let serp = null;
  try {
    const r = await fetch(new URL(`/data/serp.json?t=${Math.floor(NOW / 600000)}`, url), { signal: AbortSignal.timeout(4000) });
    if (r.ok) serp = await r.json();
  } catch { /* file missing or unreachable — RSS alone still works */ }

  // ---------- classification ----------
  const SPEECH_KW = ["speech","address","says","said","statement","warns","urges","calls","remarks","lecture","hails","flags","tells","stresses","emphasi","asserts","appeals","advocates","highlights","underscores","message","advice","pitches","reiterates","slams","bats for","भाषण","संबोधन","बोले","कहा","बयान","संदेश","आह्वान","अपील","बताया","मंत्र","साक्षात्कार"];
  const PROGRAM_KW = ["visit","tour","program","programme","schedule","scheduled","upcoming","inaugurat","attend","arrives","reaches","to address","to visit","कार्यक्रम","दौरा","पहुंचे","पहुंचेंगे","आगामी","आगमन","प्रवास","शिविर","समारोह"];
  const INTERVIEW_KW = ["interview","podcast","exclusive","in conversation","speaks to","talks to","साक्षात्कार","बातचीत","पॉडकास्ट"];
  const ORG_KW = ["rss","sangh","meeting","nagpur","pratinidhi","anniversary","vijayadashami","shakha","swayamsevak","karyakari","baithak","seva","शताब्दी","बैठक","संघ","स्वयंसेवक","विजयादशमी","शाखा","आरएसएस"];
  const has = (lo, list) => list.some((k) => lo.includes(k));

  function matchesPerson(it, p) {
    const lo = (it.title + " " + (it.snippet || "")).toLowerCase();
    if (has(lo, p.strong)) return true;
    return p.weak.length > 0 && has(lo, p.weak) && has(lo, p.weakNeeds);
  }
  function isSpeech(it, p) {
    const lo = it.title.toLowerCase();
    if (has(lo, SPEECH_KW)) return true;
    return has(lo, p.strong) && /[:“‘"]/.test(it.title);
  }

  // ---------- de-duplication ----------
  const STOP = new Set(["a","an","the","in","on","at","to","of","for","and","or","is","are","was","were","by","with","be","been","has","have","had","will","says","said","rss","news","india"]);
  const slug = (t) => t.toLowerCase().replace(/[^\w\sऀ-ॿ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  function sim(a, b) {
    const sa = new Set(slug(a)), sb = new Set(slug(b));
    if (!sa.size || !sb.size) return 0;
    let c = 0; for (const w of sa) if (sb.has(w)) c++;
    return c / Math.min(sa.size, sb.size);
  }
  function dedupe(items) {
    const groups = [];
    for (const item of items) {
      let hit = false;
      for (const g of groups) {
        if (sim(item.title, g.rep.title) >= 0.6) {
          g.sources.push({ name: item.source, link: item.link });
          if ((item.ageDays ?? 999) < (g.rep.ageDays ?? 999)) g.rep = item;
          hit = true; break;
        }
      }
      if (!hit) groups.push({ rep: item, sources: [{ name: item.source, link: item.link }] });
    }
    return groups.map((g) => ({
      ...g.rep,
      allSources: [...new Map(g.sources.filter((s) => s.name).map((s) => [s.name, s])).values()].slice(0, 5),
      sourceCount: g.sources.length,
    }));
  }
  const urlDedupe = (arr) => { const seen = new Set(); return arr.filter((i) => { const k = (i.link || "").split("?")[0]; return seen.has(k) ? false : (seen.add(k), true); }); };

  // ---------- run ----------
  const targets = pk && PEOPLE[pk] ? { [pk]: PEOPLE[pk] } : PEOPLE;
  const result = {};

  await Promise.all(Object.entries(targets).map(async ([key, p]) => {
    const errors = [];
    const rss = await runQueries(p.rssQueries, errors);
    const daily = ((serp && serp.people && serp.people[key]) || [])
      .filter((i) => i && i.title && isRecent(i.pubDate))
      .map((i) => ({ ...i, ageDays: ageDays(i.pubDate) }));
    const raw = [...rss, ...daily];
    const matched = raw.filter((i) => matchesPerson(i, p));
    const unique = urlDedupe(matched).sort((a, b) => (a.ageDays ?? 999) - (b.ageDays ?? 999));
    const pick = (fn, n) => dedupe(unique.filter(fn)).slice(0, n);

    result[key] = {
      label: p.label, role: p.role,
      allNews:    dedupe(unique).slice(0, 30),
      speeches:   pick((i) => isSpeech(i, p), 15),
      programs:   pick((i) => has(i.title.toLowerCase(), PROGRAM_KW), 12),
      interviews: pick((i) => has(i.title.toLowerCase(), INTERVIEW_KW), 10),
      hindiNews:  pick((i) => /[ऀ-ॿ]/.test(i.title), 15),
      orgEvents:  pick((i) => has(i.title.toLowerCase(), ORG_KW), 12),
      notice: errors.length > p.rssQueries.length / 2
        ? `Some searches failed: ${[...new Set(errors)].slice(0, 2).join(" | ")}` : null,
      stats: { rssQueries: p.rssQueries.length, rssItems: rss.length, dailyItems: daily.length, afterNameFilter: matched.length, uniqueItems: unique.length },
    };
  }));

  const payload = { generatedAt: new Date().toISOString(), dailyUpdatedAt: (serp && serp.updatedAt) || null, people: result };
  const total = Object.values(result).reduce((n, r) => n + r.allNews.length, 0);
  if (total > 0) globalThis.__SW_CACHE[cacheKey] = { ts: NOW, payload };
  return json(payload);
}

// Vercel Node.js function (Web Request/Response signature)
export function GET(request) {
  return handler(request);
}
