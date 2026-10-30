# Sangh Wire

News wire for Dr. Mohan Bhagwat and Dattatreya Hosabale: last 7 days of English and Hindi coverage via SerpAPI Google News.

- `index.html` is the page
- `api/news.js` is the serverless function that runs the searches (served at `/api/news`)
- `netlify/functions/news.mjs` + `netlify.toml` make it run on Netlify too

## Deploy (GitHub → Vercel)

1. Push these files to a GitHub repo (keep the folder structure: `api/news.js` must stay inside `api/`).
2. On vercel.com: **Add New → Project → Import** the repo. Framework preset: **Other**. Leave build settings empty.
3. **Settings → Environment Variables** → add `SERPAPI_KEY` = your SerpAPI key (all environments).
4. **Deployments → Redeploy** so the key takes effect.

Every push to `main` redeploys automatically. Never commit the API key to the repo.

## Deploy (GitHub → Netlify)

The same repo also works on Netlify.

1. On netlify.com: **Add new site → Import an existing project** and choose the GitHub repo. Leave the build command empty and set the publish directory to `.`.
2. **Site configuration → Environment variables** → add `SERPAPI_KEY`.
3. **Deploys → Trigger deploy**.

`netlify.toml` points `/api/news` to the Netlify function, which reuses `api/news.js`, so both hosts run the same code.

## Quota note
One full refresh is about 24 SerpAPI searches. Results are cached for about 15 minutes per running instance, but a cold start can search again. Watch your usage on the SerpAPI dashboard.
