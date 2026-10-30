// Sangh Wire — shared settings: people, queries, keyword lists
// Used by the live function (api/news.js) and the daily SerpAPI job (scripts/serp-daily.mjs)

export const G_RSS  = "(site:dbthengadi.in OR site:uttarapath.wordpress.com OR site:rssfacts.org OR site:sanghasthan.yuktaa.com OR site:prernasamvad.in OR site:organiser.org OR site:panchjanya.com OR site:vskbharat.com)";
export const G_INTL1 = "(site:ft.com OR site:wsj.com OR site:nytimes.com OR site:washingtonpost.com OR site:theguardian.com OR site:thetimes.com OR site:telegraph.co.uk OR site:independent.co.uk OR site:dailymail.com OR site:thesun.co.uk OR site:mirror.co.uk)";
export const G_INTL2 = "(site:latimes.com OR site:nydailynews.com OR site:chicagotribune.com OR site:nationalpost.com OR site:theglobeandmail.com OR site:scmp.com OR site:gulfnews.com OR site:elpais.com OR site:bild.de)";
export const G_IN   = "(site:statetimes.in OR site:economictimes.indiatimes.com OR site:thehindubusinessline.com OR site:financialexpress.com OR site:tribuneindia.com OR site:mid-day.com)";
const W = "when:7d";

export const PEOPLE = {
  bhagwat: {
    label: "Dr. Mohan Bhagwat", role: "Sarsanghchalak (Chief), RSS",
    strong: ["mohan bhagwat", "bhagwat", "bhagvat", "भागवत", "सरसंघचालक", "sarsanghchalak"],
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
      { q: `${G_INTL1} Mohan Bhagwat ${W}`, hl: "en" },
      { q: `${G_INTL2} Mohan Bhagwat ${W}`, hl: "en" },
      { q: `${G_IN} Bhagwat ${W}`, hl: "en" },
    ],
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
    strong: ["hosabale", "hosbale", "hosbole", "होसबाले", "होसबोले", "sarkaryavah", "सरकार्यवाह"],
    weak: ["dattatreya", "दत्तात्रेय", "rss general secretary", "general secretary of rss"],
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
      { q: `${G_INTL1} Dattatreya Hosabale ${W}`, hl: "en" },
      { q: `${G_INTL2} Dattatreya Hosabale ${W}`, hl: "en" },
      { q: `${G_IN} Hosabale ${W}`, hl: "en" },
    ],
    serpQueries: [
      { q: `"Dattatreya Hosabale"`, hl: "en" },
      { q: `"दत्तात्रेय होसबाले"`, hl: "hi" },
      { q: `"Hosabale" speech OR address OR statement OR visit ${W}`, hl: "en" },
      { q: `"सरकार्यवाह" OR "होसबोले" ${W}`, hl: "hi" },
    ],
  },
};

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
