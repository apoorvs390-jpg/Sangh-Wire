# Sangh Wire

News wire for Dr. Mohan Bhagwat and Dattatreya Hosabale: last 7 days of English and Hindi coverage. Free to run.

## How it gets news
1. **Every Refresh:** 31 Google News RSS searches (free, unlimited, no key), merged and de-duplicated.
2. **Once a day (6:00 AM IST):** a GitHub Action runs 8 SerpAPI searches (fits the free 250/month plan) and saves them to `data/serp.json`. Every Refresh mixes these in. Clicking Refresh never uses SerpAPI searches.

## Files
- `index.html`: the page
- `api/news.js`: the news function (served at `/api/news`)
- `lib/shared.js`: people, name spellings and search queries (edit here to change searches)
- `netlify/functions/news.mjs` + `netlify.toml`: make it run on Netlify too
- `scripts/serp-daily.mjs` + `.github/workflows/serp-daily.yml`: the daily SerpAPI job
- `data/serp.json`: daily SerpAPI results (updated automatically)

## One-time setup
1. **GitHub secret:** repo → Settings → Secrets and variables → Actions → New repository secret. Set Name to `SERPAPI_KEY` and Value to your SerpAPI key.
2. **Test the daily job:** repo → Actions → "Daily SerpAPI news" → Run workflow. It should finish green and update `data/serp.json`.
3. Netlify and Vercel need no API key now. They redeploy automatically whenever the daily job updates the file.

## Quota note
8 searches × 31 days = 248 per month, just under the free 250. Each extra manual "Run workflow" uses 8 more.
