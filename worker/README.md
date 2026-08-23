# ApplyHQ Job Search Worker

This Cloudflare Worker exposes `POST /api/job-search` and queries the Jobsuche API of the Bundesagentur für Arbeit.

## Local test

From this directory:

```text
npx wrangler dev
```

Then send a request to `http://localhost:8787`:

```text
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"location":"Leipzig","radius":25,"remote":true,"employmentType":"full-time","searchTerms":["html","javascript"]}'
```

## Deploy

```text
npx wrangler login
npx wrangler deploy
```

Set `ALLOWED_ORIGIN` in `wrangler.toml` to the exact GitHub Pages origin before deployment. Then put the deployed Worker URL into `js/config.js`. Do not put private API credentials into the repository. If a provider-specific key is needed later, store it with:

```text
npx wrangler secret put BA_API_KEY
```
