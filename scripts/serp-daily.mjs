// Runs once a day on GitHub Actions: 8 SerpAPI searches (fits the free 250/month plan)
// Saves results to data/serp.json, which the site mixes into every Refresh.
import { writeFileSync, mkdirSync } from "node:fs";
import { PEOPLE } from "../lib/shared.js";

const KEY = process.env.SERPAPI_KEY;
if (!KEY) { console.error("SERPAPI_KEY secret is missing in GitHub → Settings → Secrets → Actions"); process.exit(1); }
const hide = (s) => String(s).split(KEY).join("***");

async function search(q, hl) {
  const params = new URLSearchParams({ api_key: KEY, engine: "google_news", q, gl: "in", hl });
  const r = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(20000) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) {
    if (data.error && /hasn't returned any results/i.test(data.error)) return [];
    throw new Error(hide(data.error || `HTTP ${r.status}`));
  }
  const out = [];
  const push = (it) => {
    if (!it || !it.title) return;
    out.push({
      title: it.title.trim(),
      link: it.link || "#",
      pubDate: it.iso_date || it.date || null,
      source: (it.source && (it.source.name || it.source)) || null,
      snippet: it.snippet || null,
    });
  };
  for (const item of data.news_results || []) { push(item); for (const s of item.stories || []) push(s); }
  return out;
}

const people = {};
let failures = 0;
for (const [key, p] of Object.entries(PEOPLE)) {
  people[key] = [];
  for (const { q, hl } of p.serpQueries) {
    try {
      const items = await search(q, hl);
      people[key].push(...items);
      console.log(`${key}: ${items.length} results for ${q}`);
    } catch (e) {
      failures++;
      console.log(`${key}: FAILED ${q} → ${e.message}`);
    }
  }
}

const total = Object.values(people).reduce((n, a) => n + a.length, 0);
if (total === 0) { console.log("No results (quota used up or key problem) — keeping yesterday's file."); process.exit(0); }
mkdirSync("data", { recursive: true });
writeFileSync("data/serp.json", JSON.stringify({ updatedAt: new Date().toISOString(), people }, null, 1));
console.log(`Saved ${total} items (${failures} failed searches).`);
