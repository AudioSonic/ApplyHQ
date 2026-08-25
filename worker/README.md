# ApplyHQ Job Search Worker

This Cloudflare Worker exposes `POST /api/job-search` and queries the Jobsuche APIs of the Bundesagentur für Arbeit and Arbeitnow.
It requests up to 25 current results and enriches them with the BA detail endpoint so the frontend can match keywords against descriptions and skills.

It also exposes `POST /api/ai/test` as a controlled OpenAI connectivity test and `POST /api/ai/job-analysis` for Phase 5. The analysis endpoint accepts only `rawText` plus optional `details`; profile data and personal notes are not accepted.

## Local test

From this directory:

```text
npx wrangler dev
```

The model is configured centrally as `OPENAI_MODEL = "gpt-5.6-luna"`. Set the API key locally as a Wrangler secret; never commit it:

```text
npx wrangler secret put OPENAI_API_KEY
```

The analysis endpoint can be called with a non-personal test posting:

```text
curl -X POST http://localhost:8787/api/ai/job-analysis \
  -H "Content-Type: application/json" \
  -d '{"rawText":"Junior Softwareentwickler C#/.NET (m/w/d)\n\nAnforderungen: C# und .NET. Von Vorteil: SQL.","details":"Hybrides Arbeiten"}'
```

Test the AI endpoint locally:

```text
curl -X POST http://localhost:8787/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{"input":"Antworte mit einem kurzen Satz auf Deutsch."}'
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

`ALLOWED_ORIGIN` is configured for the current GitHub Pages origin and local testing in `wrangler.toml`. Update it if the deployment origin changes. Then put the deployed Worker URL into `js/config.js`. Do not put private API credentials into the repository. If a provider-specific key is needed later, store it with:

```text
npx wrangler secret put BA_API_KEY
npx wrangler secret put OPENAI_API_KEY
```
