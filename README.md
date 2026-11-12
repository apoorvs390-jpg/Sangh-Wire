# Sangh Wire

News wire for Dr. Mohan Bhagwat and Dattatreya Hosabale: last 7 days of English and Hindi coverage. Free to run.

## How it gets news
1. **Every Refresh:** 31 Google News RSS searches (free, unlimited, no key), merged and de-duplicated.
2. **Once a day (6:00 AM IST):** a GitHub Action runs 8 SerpAPI searches (fits the free 250/month plan) and saves them to `data/serp.json`. Every Refresh mixes these in. Clicking Refresh never uses SerpAPI searches.

## 🔒 Password protection
The whole site (page, news API, data file) is locked behind one password, on both Vercel and Netlify.
1. **First time:** open the site link → "पासवर्ड सेट करें" page appears → type a password twice → download `password.js`.
2. Upload that `password.js` to GitHub in the `lib` folder (replace the old one) → Commit. Vercel and Netlify redeploy in 1–2 minutes.
3. Now anyone opening the link must type the password. After login it stays remembered for 30 days on that browser.
- **Admin system:** the browser used for the first setup becomes the admin. Only it sees "🔐 पासवर्ड बदलें" and can open `/setup`; everyone else gets "अनुमति नहीं".
- **Change password (admin only):** click "🔐 पासवर्ड बदलें", make a new `password.js`, upload it the same way. Everyone gets logged out; the admin system stays the same.
- **Admin recovery:** the setup page shows an admin recovery code once — keep it safe. On a new computer/browser, log in and open `/admin`, enter the code, and that browser becomes the admin.
- **Log out:** "लॉग आउट" link, or open `/logout`.
- The real password is never stored, only a salted hash. Source files (`/lib`, `/api/*.js`, etc.) are blocked from public view.

## Files
- `index.html`: the page
- `api/news.js`: the news function (served at `/api/news`)
- `middleware.js` (Vercel) + `netlify/edge-functions/gate.js` (Netlify): the password gate
- `lib/auth.js`: password check, login page, setup page
- `lib/password.js`: your password hash (made on the setup page)
- `api/login.js` + `netlify/functions/login.mjs`: login endpoint
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
