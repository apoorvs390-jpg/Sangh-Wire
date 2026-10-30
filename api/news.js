// Sangh Wire — news function (SerpAPI Google News)
// Last 7 days only. Hindi queries use Hindi language. Name-spelling variants handled.

const CACHE_TTL = 15 * 60 * 1000;           // protects SerpAPI search quota
globalThis.__SW_CACHE = globalThis.__SW_CACHE || {};

async function handler(req) {
  const API_KEY = process.env.SERPAPI_KEY;
  const NOW = Date.now();
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  const json = (obj) => new Response(JSON.stringify(obj), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });

  if (!API_KEY) return json({ error: "SERPAPI_KEY not set in your hosting environment variables (Vercel or Netlify) — redeploy after adding" });

  const url = new URL(req.url);
  const pk = url.searchParams.get("person");
  const fresh = url.searchParams.get("fresh") === "1";
  const cacheKey = pk || "all";
  const hit = globalThis.__SW_CACHE[cacheKey];
  if (hit && !fresh && NOW - hit.ts < CACHE_TTL) {
    return json({ ...hit.payload, cached: true });
  }

  // ---------- date handling ----------
  function parseDate(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim().toLowerCase();
    let m;
    if ((m = s.match(/(\d+)\s*minute/))) return NOW - +m[1] * 60000;
    if ((m = s.match(/(\d+)\s*hour/)))   return NOW - +m[1] * 3600000;
    if ((m = s.match(/(\d+)\s*day/)))    return NOW - +m[1] * 86400000;
    if ((m = s.match(/(\d+)\s*week/)))   return NOW - +m[1] * 604800000;
    if ((m = s.match(/(\d+)\s*month/)))  return NOW - +m[1] * 2592000000;
    if (s.includes("yesterday")) return NOW - 86400000;
    if (s.includes("today") || s.includes("just now")) return NOW;
    const p = new Date(dateStr);
    return isNaN(p.getTime()) ? null : p.getTime();
  }
  const ageDays = (d) => { const t = parseDate(d); return t === null ? null : (NOW - t) / 86400000; };
  const isRecent = (d) => { const t = parseDate(d); return t !== null && NOW - t <= MAX_AGE_MS && t - NOW < 86400000; };

  // ---------- search ----------
  async function searchNews(q, hl, errors) {
    try {
      const params = new URLSearchParams({
        api_key: API_KEY, engine: "google_news", q, gl: "in", hl: hl || "en",
      });
      const r = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) {
        const t = (await r.text()).slice(0, 140);
        errors.push(`HTTP ${r.status}: ${t}`);
        return [];
      }
      const data = await r.json();
      if (data.error && !/hasn't returned any results/i.test(data.error)) errors.push(String(data.error).slice(0, 140));
      const out = [];
      const push = (it) => {
        if (!it || !it.title || !isRecent(it.date)) return;
        out.push({
          title: it.title.trim(),
          link: it.link || "#",
          pubDate: it.date || null,
          source: (it.source && (it.source.name || it.source)) || null,
          ageDays: ageDays(it.date),
          snippet: it.snippet || null,
        });
      };
      for (const item of data.news_results || []) {
        push(item);
        for (const s of item.stories || []) push(s);
      }
      return out;
    } catch (e) {
      errors.push(String(e.message || e).slice(0, 140));
      return [];
    }
  }

  // Collect whatever finished inside the time budget (prevents 504 timeouts)
  async function runQueries(queries, errors) {
    const collected = [];
    const jobs = queries.map(({ q, hl }) =>
      searchNews(q, hl, errors).then((r) => { collected.push(...r); }));
    await Promise.race([Promise.allSettled(jobs), new Promise((res) => setTimeout(res, 8500))]);
    return collected.slice();
  }

  // ---------- sources (all sources you provided, grouped = few requests) ----------
  const G_RSS  = "(site:dbthengadi.in OR site:uttarapath.wordpress.com OR site:rssfacts.org OR site:sanghasthan.yuktaa.com OR site:prernasamvad.in OR site:organiser.org OR site:panchjanya.com OR site:vskbharat.com)";
  const G_INTL1 = "(site:ft.com OR site:wsj.com OR site:nytimes.com OR site:washingtonpost.com OR site:theguardian.com OR site:thetimes.com OR site:telegraph.co.uk OR site:independent.co.uk OR site:dailymail.com OR site:thesun.co.uk OR site:mirror.co.uk)";
  const G_INTL2 = "(site:latimes.com OR site:nydailynews.com OR site:chicagotribune.com OR site:nationalpost.com OR site:theglobeandmail.com OR site:scmp.com OR site:gulfnews.com OR site:elpais.com OR site:bild.de)";
  const G_IN   = "(site:statetimes.in OR site:economictimes.indiatimes.com OR site:thehindubusinessline.com OR site:financialexpress.com OR site:tribuneindia.com OR site:mid-day.com)";
  const W = "when:7d";

  const PEOPLE = {
    bhagwat: {
      label: "Dr. Mohan Bhagwat", role: "Sarsanghchalak (Chief), RSS",
      strong: ["mohan bhagwat", "bhagwat", "bhagvat", "भागवत", "सरसंघचालक", "sarsanghchalak"],
      weak: [], weakNeeds: [],
      queries: [
        { q: `"Mohan Bhagwat"`, hl: "en" },
        { q: `"Mohan Bhagwat" speech OR address OR statement OR says ${W}`, hl: "en" },
        { q: `"Mohan Bhagwat" visit OR program OR tour OR programme ${W}`, hl: "en" },
        { q: `"Mohan Bhagwat" interview OR podcast ${W}`, hl: "en" },
        { q: `"Mohan Bhagwat" RSS OR sangh OR Nagpur OR meeting ${W}`, hl: "en" },
        { q: `"मोहन भागवत"`, hl: "hi" },
        { q: `"मोहन भागवत" भाषण OR संबोधन OR बयान ${W}`, hl: "hi" },
        { q: `"सरसंघचालक" कार्यक्रम OR दौरा ${W}`, hl: "hi" },
        { q: `${G_RSS} Bhagwat ${W}`, hl: "en" },
        { q: `${G_INTL1} Mohan Bhagwat ${W}`, hl: "en" },
        { q: `${G_INTL2} Mohan Bhagwat ${W}`, hl: "en" },
        { q: `${G_IN} Bhagwat ${W}`, hl: "en" },
      ],
    },
    hosabale: {
      label: "Dattatreya Hosabale", role: "Sarkaryavah (Gen. Secretary), RSS",
      strong: ["hosabale", "hosbale", "hosbole", "होसबाले", "होसबोले", "sarkaryavah", "सरकार्यवाह"],
      weak: ["dattatreya", "दत्तात्रेय"],
      weakNeeds: ["rss", "sangh", "sarkaryavah", "संघ", "सरकार्यवाह", "आरएसएस"],
      queries: [
        { q: `"Dattatreya Hosabale"`, hl: "en" },
        { q: `"Hosabale" speech OR address OR statement OR says ${W}`, hl: "en" },
        { q: `"Hosabale" visit OR program OR tour OR programme ${W}`, hl: "en" },
        { q: `"Hosabale" interview OR podcast ${W}`, hl: "en" },
        { q: `"Sarkaryavah" RSS ${W}`, hl: "en" },
        { q: `"दत्तात्रेय होसबाले"`, hl: "hi" },
        { q: `"होसबाले" OR "होसबोले" भाषण OR संबोधन OR बयान ${W}`, hl: "hi" },
        { q: `"सरकार्यवाह" कार्यक्रम OR दौरा ${W}`, hl: "hi" },
        { q: `${G_RSS} Hosabale ${W}`, hl: "en" },
        { q: `${G_INTL1} Dattatreya Hosabale ${W}`, hl: "en" },
        { q: `${G_INTL2} Dattatreya Hosabale ${W}`, hl: "en" },
        { q: `${G_IN} Hosabale ${W}`, hl: "en" },
      ],
    },
  };

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
    // headline of the form "<topic>: <Person> ..." or with quotes = statement by that person
    return has(lo, p.strong) && /[:“‘"]/.test(it.title);
  }

  // ---------- de-duplication ----------
  const STOP = new Set(["a","an","the","in","on","at","to","of","for","and","or","is","are","was","were","by","with","be","been","has","have","had","will","says","said","rss","news","india"]);
  const slug = (t) => t.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
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
    const raw = await runQueries(p.queries, errors);
    const matched = raw.filter((i) => matchesPerson(i, p));
    const unique = urlDedupe(matched).sort((a, b) => (a.ageDays ?? 999) - (b.ageDays ?? 999));
    const pick = (fn, n) => dedupe(unique.filter(fn)).slice(0, n);

    result[key] = {
      label: p.label, role: p.role,
      allNews:    dedupe(unique).slice(0, 25),
      speeches:   pick((i) => isSpeech(i, p), 15),
      programs:   pick((i) => has(i.title.toLowerCase(), PROGRAM_KW), 12),
      interviews: pick((i) => has(i.title.toLowerCase(), INTERVIEW_KW), 10),
      hindiNews:  pick((i) => /[\u0900-\u097F]/.test(i.title), 15),
      orgEvents:  pick((i) => has(i.title.toLowerCase(), ORG_KW), 12),
      notice: errors.length ? `Some searches failed: ${[...new Set(errors)].slice(0, 2).join(" | ")}` : null,
      stats: { queries: p.queries.length, rawItems: raw.length, afterNameFilter: matched.length, uniqueItems: unique.length },
    };
  }));

  const payload = { generatedAt: new Date().toISOString(), people: result };
  const total = Object.values(result).reduce((n, r) => n + r.allNews.length, 0);
  if (total > 0) globalThis.__SW_CACHE[cacheKey] = { ts: NOW, payload };
  return json(payload);
}

// Vercel Node.js function (Web Request/Response signature)
export function GET(request) {
  return handler(request);
}
