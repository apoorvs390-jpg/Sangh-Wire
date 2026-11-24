// Sangh Wire — shared settings: people, queries, keyword lists
// Used by the live function (api/news.js) and the daily SerpAPI job (scripts/serp-daily.mjs)

export const G_RSS  = "(site:organiser.org OR site:panchjanya.com OR site:vskbharat.com OR site:rssfacts.org)";
export const G_RSS2 = "(site:dbthengadi.in OR site:uttarapath.wordpress.com OR site:sanghasthan.yuktaa.com OR site:prernasamvad.in)";

// Sites read DIRECTLY through their own search feed (works even when Google News does not index them).
// Add / remove sites here. Must be WordPress-style sites (they all support ?s=term&feed=rss2).
export const DIRECT_SITES = [
  "https://www.organiser.org", "https://panchjanya.com", "https://www.vskbharat.com", "https://rssfacts.org",
  "https://dbthengadi.in", "https://uttarapath.wordpress.com", "https://sanghasthan.yuktaa.com", "https://prernasamvad.in",
];
export const G_INTL1 = "(site:ft.com OR site:wsj.com OR site:nytimes.com OR site:washingtonpost.com OR site:theguardian.com OR site:thetimes.com OR site:telegraph.co.uk OR site:independent.co.uk OR site:dailymail.com OR site:thesun.co.uk OR site:mirror.co.uk)";
export const G_INTL2 = "(site:latimes.com OR site:nydailynews.com OR site:chicagotribune.com OR site:nationalpost.com OR site:theglobeandmail.com OR site:scmp.com OR site:gulfnews.com OR site:elpais.com OR site:bild.de)";
export const G_IN   = "(site:statetimes.in OR site:economictimes.indiatimes.com OR site:thehindubusinessline.com OR site:financialexpress.com OR site:tribuneindia.com OR site:mid-day.com)";
const W = "when:7d";

// ALL the news websites you gave me (domains only). Add/remove here.
export const NEWS_SITES = [
  "ft.com","wsj.com","nytimes.com","washingtonpost.com","theguardian.com","thetimes.com","telegraph.co.uk",
  "independent.co.uk","dailymail.com","thesun.co.uk","mirror.co.uk","latimes.com","nydailynews.com",
  "chicagotribune.com","nationalpost.com","theglobeandmail.com","scmp.com","gulfnews.com","elpais.com","bild.de",
  "statetimes.in","economictimes.indiatimes.com","timesofindia.indiatimes.com","hindustantimes.com",
  "thehindubusinessline.com","financialexpress.com","tribuneindia.com","mid-day.com",
];
// Google News copes badly with long OR lists, so search 3 sites per query.
// trust:true = the query already requires the exact name, so we don't re-check it in the headline.
export function siteQueries(nameQuery) {
  const out = [];
  for (let i = 0; i < NEWS_SITES.length; i += 3) {
    const grp = NEWS_SITES.slice(i, i + 3).map((d) => `site:${d}`).join(" OR ");
    out.push({ q: `(${grp}) ${nameQuery} ${W}`, hl: "en", trust: true });
  }
  return out;
}

export const PEOPLE = {
  bhagwat: {
    label: "Dr. Mohan Bhagwat", role: "Sarsanghchalak (Chief), RSS",
    strong: ["mohan bhagwat", "mohanrao bhagwat", "mohan rao bhagwat", "mohan bhagvat", "bhagwat", "bhagvat", "भागवत", "सरसंघचालक", "sarsanghchalak", "sar sanghchalak"],
    weak: ["rss chief", "rss head", "rss supremo", "संघ प्रमुख", "आरएसएस प्रमुख"],
    weakNeeds: ["rss", "sangh", "संघ", "आरएसएस"],
    // Free, unlimited: Google News RSS (runs on every Refresh)
    rssQueries: [
      { q: `"Mohan Bhagwat" ${W}`, hl: "en" },
      { q: `"Mohan Bhagwat" speech OR address OR statement OR says ${W}`, hl: "en" },
      { q: `"Mohan Bhagwat" visit OR program OR tour OR programme ${W}`, hl: "en" },
      { q: `"Mohan Bhagwat" interview OR podcast ${W}`, hl: "en" },
      { q: `"Mohan Bhagwat" RSS OR sangh OR Nagpur OR meeting ${W}`, hl: "en" },
      { q: `"RSS chief" ${W}`, hl: "en" },
      { q: `Bhagwat RSS ${W}`, hl: "en" },
      { q: `"मोहन भागवत" ${W}`, hl: "hi" },
      { q: `"मोहन भागवत" भाषण OR संबोधन OR बयान ${W}`, hl: "hi" },
      { q: `"सरसंघचालक" कार्यक्रम OR दौरा ${W}`, hl: "hi" },
      { q: `"संघ प्रमुख" OR "आरएसएस प्रमुख" ${W}`, hl: "hi" },
      { q: `भागवत संघ ${W}`, hl: "hi" },
      { q: `${G_RSS} Bhagwat ${W}`, hl: "en" },
      { q: `${G_RSS} भागवत ${W}`, hl: "hi" },
      { q: `${G_RSS2} Bhagwat ${W}`, hl: "en" },
      { q: `${G_RSS2} भागवत ${W}`, hl: "hi" },
      { q: `"Dr Bhagwat" OR "Dr. Bhagwat" OR "Sarsanghchalak" ${W}`, hl: "en" },
      { q: `"डॉ. मोहन भागवत" OR "डॉ मोहन भागवत" ${W}`, hl: "hi" },
    ],
    feedTerms: ["Mohan Bhagwat", "मोहन भागवत"],   // searched on each DIRECT_SITES site
    // Daily SerpAPI boost (4 searches/day for this person)
    serpQueries: [
      { q: `"Mohan Bhagwat"`, hl: "en" },
      { q: `"मोहन भागवत"`, hl: "hi" },
      { q: `"Mohan Bhagwat" speech OR address OR statement OR visit ${W}`, hl: "en" },
      { q: `"सरसंघचालक" OR "संघ प्रमुख" ${W}`, hl: "hi" },
    ],
  },
  hosabale: {
    label: "Dattatreya Hosabale", role: "Sarkaryavah (Gen. Secretary), RSS",
    strong: ["hosabale", "hosabole", "hosbale", "hosbole", "hosable", "होसबाले", "होसबोले", "होसबले", "होसबळे",
      "dattatreya ji", "dattatrey ji", "dattatraya ji", "dattatray ji", "datta ji", "दत्तात्रेय जी", "दत्तात्रेय होसबाले", "दत्तात्रेय होसबले"],
    // "Sarkaryavah" is handled separately in news.js so "Sah-Sarkaryavah" (a different person) is ignored
    weak: ["dattatre", "dattatra", "दत्तात्रेय", "दत्तात्रय", "rss general secretary", "general secretary of rss", "rss gen sec"],
    weakNeeds: ["rss", "sangh", "sarkaryavah", "संघ", "सरकार्यवाह", "आरएसएस"],
    rssQueries: [
      { q: `"Dattatreya Hosabale" ${W}`, hl: "en" },
      { q: `"Hosabale" speech OR address OR statement OR says ${W}`, hl: "en" },
      { q: `"Hosabale" visit OR program OR tour OR programme ${W}`, hl: "en" },
      { q: `"Hosabale" interview OR podcast ${W}`, hl: "en" },
      { q: `"Sarkaryavah" RSS ${W}`, hl: "en" },
      { q: `"RSS general secretary" ${W}`, hl: "en" },
      { q: `Hosabale RSS ${W}`, hl: "en" },
      { q: `"दत्तात्रेय होसबाले" ${W}`, hl: "hi" },
      { q: `"होसबाले" OR "होसबोले" भाषण OR संबोधन OR बयान ${W}`, hl: "hi" },
      { q: `"सरकार्यवाह" कार्यक्रम OR दौरा ${W}`, hl: "hi" },
      { q: `होसबाले संघ ${W}`, hl: "hi" },
      { q: `${G_RSS} Hosabale ${W}`, hl: "en" },
      { q: `"Dattatreya ji" RSS ${W}`, hl: "en" },
      { q: `"Datta ji" RSS ${W}`, hl: "en" },
      { q: `"Hosable" OR "Dattatreya Hosable" ${W}`, hl: "en" },
      { q: `"दत्तात्रेय जी" संघ ${W}`, hl: "hi" },
      { q: `${G_RSS} होसबाले ${W}`, hl: "hi" },
      { q: `${G_RSS2} Hosabale ${W}`, hl: "en" },
      { q: `${G_RSS2} होसबाले ${W}`, hl: "hi" },
      { q: `"Hosbale" OR "Dattatrey Hosabale" OR "Dattatraya Hosabale" ${W}`, hl: "en" },
      { q: `"दत्तात्रेय होसबले" OR "दत्तात्रेय होसबोले" OR "सरकार्यवाह" ${W}`, hl: "hi" },
    ],
    feedTerms: ["Hosabale", "होसबाले", "Dattatreya"],
    serpQueries: [
      { q: `"Dattatreya Hosabale"`, hl: "en" },
      { q: `"दत्तात्रेय होसबाले"`, hl: "hi" },
      { q: `"Hosabale" speech OR address OR statement OR visit ${W}`, hl: "en" },
      { q: `"सरकार्यवाह" OR "होसबोले" ${W}`, hl: "hi" },
    ],
  },
};

PEOPLE.bhagwat.rssQueries.push(...siteQueries(`"Mohan Bhagwat"`));
PEOPLE.hosabale.rssQueries.push(...siteQueries(`Hosabale`));


// Second search engine (Bing News RSS) - works even when Google rate-limits us. 5 sites per query.
function bingSiteQueries(nameQuery, n = 5) {
  const out = [];
  for (let i = 0; i < NEWS_SITES.length; i += n)
    out.push({ q: `(${NEWS_SITES.slice(i, i + n).map((d) => `site:${d}`).join(" OR ")}) ${nameQuery}`, hl: "en", trust: true });
  return out;
}
PEOPLE.bhagwat.bingQueries = [
  { q: `"Mohan Bhagwat"`, hl: "en" }, { q: `"RSS chief" Bhagwat`, hl: "en" }, { q: `Bhagwat RSS speech`, hl: "en" },
  { q: `"मोहन भागवत"`, hl: "hi" }, { q: `सरसंघचालक भागवत`, hl: "hi" },
  ...bingSiteQueries(`"Mohan Bhagwat"`),
];
PEOPLE.hosabale.bingQueries = [
  { q: `"Dattatreya Hosabale"`, hl: "en" }, { q: `Hosabale RSS`, hl: "en" }, { q: `"Dattatreya ji" RSS`, hl: "en" },
  { q: `"दत्तात्रेय होसबाले"`, hl: "hi" }, { q: `होसबाले संघ`, hl: "hi" },
  ...bingSiteQueries(`Hosabale`),
];

// ---------- date helpers ----------
export function parseDate(dateStr, NOW = Date.now()) {
  if (!dateStr) return null;
  const s = String(dateStr).trim().toLowerCase();
  let m;
  if ((m = s.match(/^(\d+)\s*minute/))) return NOW - +m[1] * 60000;
  if ((m = s.match(/^(\d+)\s*hour/)))   return NOW - +m[1] * 3600000;
  if ((m = s.match(/^(\d+)\s*day/)))    return NOW - +m[1] * 86400000;
  if ((m = s.match(/^(\d+)\s*week/)))   return NOW - +m[1] * 604800000;
  if ((m = s.match(/^(\d+)\s*month/)))  return NOW - +m[1] * 2592000000;
  if (s.includes("yesterday")) return NOW - 86400000;
  if (s.includes("today") || s.includes("just now")) return NOW;
  const p = new Date(dateStr);
  return isNaN(p.getTime()) ? null : p.getTime();
}
