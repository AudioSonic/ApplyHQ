var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var ALLOWED_ORIGIN = "*";
var BA_API_BASE_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
var BA_API_KEY = "jobboerse-jobsuche";
var ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api";
var rateLimitBuckets = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW_MS = 10 * 60 * 1e3;
var RATE_LIMIT_MAX_REQUESTS = 10;
var MAX_DETAIL_REQUESTS = 25;
var DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";
var AI_MAX_INPUT_LENGTH = 4e3;
var OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
function jsonResponse(body, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store"
    }
  });
}
__name(jsonResponse, "jsonResponse");
function getCorsOrigin(request, env) {
  const requestOrigin = request.headers.get("Origin");
  const configuredOrigin = env.ALLOWED_ORIGIN || ALLOWED_ORIGIN;
  const allowedOrigins = configuredOrigin.split(",").map((origin) => origin.trim()).filter(Boolean);
  return allowedOrigins.includes("*") || allowedOrigins.includes(requestOrigin) ? requestOrigin || configuredOrigin : "null";
}
__name(getCorsOrigin, "getCorsOrigin");
function normalizeText(value) {
  return String(value || "").trim();
}
__name(normalizeText, "normalizeText");
function isNationwideLocation(value) {
  const location = normalizeText(value);
  return !location || /^(deutschland|bundesweit|ganz deutschland)$/i.test(location);
}
__name(isNationwideLocation, "isNationwideLocation");
function getSearchTerm(profile) {
  const terms = Array.isArray(profile.searchTerms) ? profile.searchTerms.map(normalizeText).filter(Boolean) : [];
  return terms.join(" ") || normalizeText(profile.position);
}
__name(getSearchTerm, "getSearchTerm");
function validateProfile(profile) {
  if (!profile) return "Ein g\xFCltiges Suchprofil ist erforderlich.";
  if (normalizeText(profile.location).length > 120) return "Der Standort ist zu lang.";
  if (profile.radius !== void 0 && (!Number.isFinite(Number(profile.radius)) || Number(profile.radius) < 0 || Number(profile.radius) > 500)) {
    return "Der Suchradius muss zwischen 0 und 500 km liegen.";
  }
  if (Array.isArray(profile.searchTerms) && profile.searchTerms.length > 20) return "Es sind h\xF6chstens 20 Suchbegriffe erlaubt.";
  return "";
}
__name(validateProfile, "validateProfile");
function isRateLimited(request) {
  const key = request.headers.get("CF-Connecting-IP") || "unknown-client";
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);
  if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}
__name(isRateLimited, "isRateLimited");
function getFirstValue(...values) {
  return values.find((value) => value !== void 0 && value !== null && normalizeText(value)) || "";
}
__name(getFirstValue, "getFirstValue");
function getCity(job) {
  const location = job.arbeitsort || job.arbeitsortString || job.arbeitsortText || job.stellenlokationen?.[0]?.adresse || {};
  return getFirstValue(
    typeof location === "string" ? location : location.ort,
    typeof location === "string" ? "" : location.stadt,
    job.ort,
    job.stadt,
    job.stellenlokationen?.[0]?.adresse?.ort
  );
}
__name(getCity, "getCity");
function getState(job) {
  const location = job.arbeitsort || job.stellenlokationen?.[0]?.adresse || {};
  return getFirstValue(
    typeof location === "string" ? "" : location.bundesland,
    typeof location === "string" ? "" : location.region,
    job.bundesland,
    job.stellenlokationen?.[0]?.adresse?.region
  );
}
__name(getState, "getState");
function getPublishedAt(job) {
  const value = getFirstValue(
    job.veroeffentlichungsdatum,
    job.aktuelleVeroeffentlichungsdatum,
    job.datumErsteVeroeffentlichung,
    job.onlineSeit,
    job.online_seit,
    job.publishedAt
  );
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}
__name(getPublishedAt, "getPublishedAt");
function isNewSinceLastSearch(job, profile) {
  return !profile.lastSearch || !job.publishedAt || job.publishedAt > profile.lastSearch;
}
__name(isNewSinceLastSearch, "isNewSinceLastSearch");
function normalizeJob(job) {
  const reference = getFirstValue(job.refnr, job.referenznummer, job.externalId, job.id);
  const position = getFirstValue(job.beruf, job.stellenangebotsTitel, job.stellentitel, job.titel, job.position);
  const company = getFirstValue(job.arbeitgeber, job.firma, job.unternehmen, job.company);
  const city = getCity(job);
  const state = getState(job);
  const url = getFirstValue(job.externeUrl, job.externeURL, job.externalUrl, job.url, job.href);
  return {
    externalId: reference,
    company,
    position,
    contactName: getFirstValue(job.ansprechpartner, job.ansprechperson, job.kontaktperson, job.contactName, job.contact),
    description: getFirstValue(job.stellenbeschreibung, job.stellenangebotsBeschreibung, job.description),
    keywords: Array.isArray(job.alleBerufe) ? job.alleBerufe.filter(Boolean) : [],
    city,
    state,
    remote: Boolean(job.homeofficemoeglich) || /remote|homeoffice|home-office|mobiles arbeiten/i.test(JSON.stringify(job)),
    employmentType: job.arbeitszeitVollzeit ? "full-time" : job.arbeitszeitTeilzeit ? "part-time" : getFirstValue(job.arbeitszeit, job.beschaeftigungsart, job.employmentType),
    publishedAt: getPublishedAt(job),
    url: url || (reference ? `https://www.arbeitsagentur.de/jobsuche/suche?angebotsart=1&id=${encodeURIComponent(reference)}` : ""),
    source: "Bundesagentur f\xFCr Arbeit"
  };
}
__name(normalizeJob, "normalizeJob");
function getDetailKeywords(details) {
  const skills = Array.isArray(details.fertigkeiten) ? details.fertigkeiten.flatMap((skill) => [
    skill.hierarchieName,
    ...Array.isArray(skill.auspraegungen) ? skill.auspraegungen : Object.values(skill.auspraegungen || {})
  ].filter(Boolean)) : [];
  return [details.beruf, details.titel, details.stellenangebotsTitel, ...skills].filter(Boolean);
}
__name(getDetailKeywords, "getDetailKeywords");
function encodeReference(reference) {
  return encodeURIComponent(btoa(reference));
}
__name(encodeReference, "encodeReference");
async function fetchJobDetails(job, env) {
  if (!job.externalId) return { job, fetched: false };
  try {
    const response = await fetch(`${BA_API_BASE_URL}/pc/v4/jobdetails/${encodeReference(job.externalId)}`, {
      headers: {
        "X-API-Key": env.BA_API_KEY || BA_API_KEY,
        Accept: "application/json",
        "User-Agent": "Jobsuche/2.9.2 (de.arbeitsagentur.jobboerse; build:1077; iOS 15.1.0) Alamofire/5.4.4"
      }
    });
    if (!response.ok) return { job, fetched: false };
    const details = await response.json();
    return {
      job: {
        ...job,
        description: getFirstValue(details.stellenbeschreibung, details.stellenangebotsBeschreibung, job.description),
        keywords: [.../* @__PURE__ */ new Set([...job.keywords || [], ...getDetailKeywords(details)])],
        remote: Boolean(job.remote || details.homeofficemoeglich),
        employmentType: details.arbeitszeitmodelle?.some((value) => /vollzeit/i.test(value)) ? "full-time" : details.arbeitszeitmodelle?.some((value) => /teilzeit/i.test(value)) ? "part-time" : job.employmentType
      },
      fetched: true
    };
  } catch {
    return { job, fetched: false };
  }
}
__name(fetchJobDetails, "fetchJobDetails");
async function enrichJobsWithDetails(jobs, env) {
  const jobsToEnrich = jobs.slice(0, MAX_DETAIL_REQUESTS);
  const enriched = [];
  let detailsFetchedCount = 0;
  let detailsFailedCount = 0;
  for (let index = 0; index < jobsToEnrich.length; index += 5) {
    const batch = await Promise.all(jobsToEnrich.slice(index, index + 5).map((job) => fetchJobDetails(job, env)));
    batch.forEach((result) => {
      enriched.push(result.job);
      if (result.fetched) detailsFetchedCount += 1;
      else detailsFailedCount += 1;
    });
  }
  return { jobs: enriched, detailsFetchedCount, detailsFailedCount };
}
__name(enrichJobsWithDetails, "enrichJobsWithDetails");
function buildSearchUrl(profile) {
  const url = new URL(`${BA_API_BASE_URL}/pc/v6/jobs`);
  url.searchParams.set("was", getSearchTerm(profile));
  if (!isNationwideLocation(profile.location)) {
    url.searchParams.set("wo", normalizeText(profile.location));
    url.searchParams.set("umkreis", String(Number(profile.radius) || 0));
  }
  url.searchParams.set("page", "1");
  url.searchParams.set("size", String(MAX_DETAIL_REQUESTS));
  return url;
}
__name(buildSearchUrl, "buildSearchUrl");
async function searchBundesagentur(profile, env) {
  const response = await fetch(buildSearchUrl(profile), {
    headers: {
      "X-API-Key": env.BA_API_KEY || BA_API_KEY,
      Accept: "application/json",
      "User-Agent": "Jobsuche/2.9.2 (de.arbeitsagentur.jobboerse; build:1077; iOS 15.1.0) Alamofire/5.4.4"
    }
  });
  if (!response.ok) {
    const responseBody = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 240);
    throw new Error(`BA-API antwortete mit HTTP ${response.status}${responseBody ? `: ${responseBody}` : "."}`);
  }
  const payload = await response.json();
  const jobs = payload.ergebnisliste || payload.stellenangebote || payload.jobs || payload.results || [];
  if (!Array.isArray(jobs)) throw new Error("BA-API lieferte kein g\xFCltiges Ergebnisformat.");
  const normalizedJobs = jobs.map(normalizeJob);
  const validJobs = normalizedJobs.filter((job) => job.company && job.position && (job.externalId || job.url));
  const newJobs = validJobs.filter((job) => isNewSinceLastSearch(job, profile));
  const enriched = await enrichJobsWithDetails(newJobs, env);
  return {
    jobs: enriched.jobs,
    rawCount: jobs.length,
    invalidCount: normalizedJobs.filter((job) => !job.company || !job.position || !job.externalId && !job.url).length,
    oldCount: validJobs.length - newJobs.length,
    detailsFetchedCount: enriched.detailsFetchedCount,
    detailsFailedCount: enriched.detailsFailedCount
  };
}
__name(searchBundesagentur, "searchBundesagentur");
function normalizeArbeitnowJob(job) {
  const createdAt = Number(job.created_at);
  return {
    externalId: `arbeitnow:${getFirstValue(job.slug, job.id, job.url)}`,
    company: normalizeText(job.company_name),
    position: normalizeText(job.title),
    contactName: "",
    city: normalizeText(job.location),
    state: "",
    description: normalizeText(job.description),
    keywords: Array.isArray(job.tags) ? job.tags : [],
    remote: Boolean(job.remote),
    employmentType: Array.isArray(job.job_types) && job.job_types.some((type) => /part.?time|teilzeit/i.test(type)) ? "part-time" : "",
    publishedAt: createdAt ? new Date(createdAt * 1e3).toISOString().slice(0, 10) : "",
    url: normalizeText(job.url),
    source: "Arbeitnow"
  };
}
__name(normalizeArbeitnowJob, "normalizeArbeitnowJob");
function isAiRateLimited(request) {
  return isRateLimited(request);
}
__name(isAiRateLimited, "isAiRateLimited");
function validateAiTestRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Ein JSON-Objekt ist erforderlich.";
  if (typeof payload.input !== "string" || !payload.input.trim()) return "Das Feld input ist erforderlich.";
  if (payload.input.length > AI_MAX_INPUT_LENGTH) return `input darf h\xF6chstens ${AI_MAX_INPUT_LENGTH} Zeichen enthalten.`;
  return "";
}
__name(validateAiTestRequest, "validateAiTestRequest");
function getOpenAiModel(env) {
  return normalizeText(env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
}
__name(getOpenAiModel, "getOpenAiModel");
function extractOpenAiText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  return (payload?.output || []).flatMap((item) => item.content || []).filter((item) => item.type === "output_text").map((item) => item.text).join("\n");
}
__name(extractOpenAiText, "extractOpenAiText");
function createOpenAiProvider(env, fetcher = fetch) {
  return {
    name: "openai",
    model: getOpenAiModel(env),
    async generate(input, outputSchema, instructions = "") {
      if (!env.OPENAI_API_KEY) return { error: "missing_key" };
      outputSchema = outputSchema || { name: "ai_test_response", schema: { type: "object", properties: { answer: { type: "string" } }, required: ["answer"], additionalProperties: false } };
      const response = await fetcher(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: getOpenAiModel(env),
          store: false,
          max_output_tokens: outputSchema.name === "ai_test_response" ? 120 : 2500,
          ...outputSchema.name === "ai_test_response" ? {} : { reasoning: { effort: "none" } },
          input: [{ role: "user", content: [{ type: "input_text", text: `${instructions}

${input}` }] }],
          text: { format: { type: "json_schema", name: outputSchema.name, strict: true, schema: outputSchema.schema } }
        })
      });
      if (!response.ok) return { error: response.status === 401 || response.status === 403 ? "auth" : response.status === 429 ? "rate_limit" : "provider", status: response.status };
      const data = await response.json();
      const text = extractOpenAiText(data);
      try {
        const parsed = JSON.parse(text);
        return { answer: outputSchema.name === "ai_test_response" ? parsed.answer : text };
      } catch {
        return { error: "invalid_output" };
      }
    }
  };
}
__name(createOpenAiProvider, "createOpenAiProvider");
function jobAnalysisOutputSchema() {
  const stringArray = { type: "array", items: { type: "string" } };
  const nullableBoolean = { type: ["boolean", "null"] };
  const skill = { type: "object", properties: { name: { type: "string" }, category: { type: "string" } }, required: ["name", "category"], additionalProperties: false };
  const object = /* @__PURE__ */ __name((properties, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false }), "object");
  const schema = object({
    version: { type: "integer" },
    analyzedAt: { type: "string" },
    position: object({ title: { type: "string" }, seniority: { type: "string" }, employmentType: { type: "string" } }),
    company: object({ name: { type: "string" } }),
    tasks: stringArray,
    requirements: object({ mustHave: stringArray, niceToHave: stringArray }),
    skills: object({ programmingLanguages: { type: "array", items: skill }, frontend: { type: "array", items: skill }, backend: { type: "array", items: skill }, frameworks: { type: "array", items: skill }, databases: { type: "array", items: skill }, tools: { type: "array", items: skill }, methods: { type: "array", items: skill } }),
    softSkills: stringArray,
    experience: object({ requiredYears: { type: ["integer", "null"] }, preferredYears: { type: ["integer", "null"] }, required: { type: "string" }, preferred: { type: "string" } }),
    education: stringArray,
    languages: { type: "array", items: object({ language: { type: "string" }, level: { type: "string" }, required: { type: "boolean" } }) },
    workModel: object({ remote: nullableBoolean, hybrid: nullableBoolean, onsite: nullableBoolean }),
    location: object({ city: { type: "string" }, region: { type: "string" } }),
    salary: object({ mentioned: { type: "boolean" }, text: { type: ["string", "null"] }, source: { type: ["string", "null"] } }),
    travel: object({ required: nullableBoolean, description: { type: "string" } }),
    benefits: stringArray,
    additionalRequirements: stringArray,
    summary: { type: "string" }
  });
  return { name: "job_analysis", schema };
}
__name(jobAnalysisOutputSchema, "jobAnalysisOutputSchema");
function validateJobAnalysisResponse(analysis) {
  if (!analysis || typeof analysis !== "object" || analysis.version !== 1) return "Analyse besitzt keine g\xFCltige Version.";
  if (!analysis.position || typeof analysis.position.title !== "string") return "Analyseposition fehlt.";
  if (!analysis.requirements || !Array.isArray(analysis.requirements.mustHave) || !Array.isArray(analysis.requirements.niceToHave)) return "Anforderungsstruktur fehlt.";
  if (!analysis.skills || ["programmingLanguages", "frontend", "backend", "frameworks", "databases", "tools", "methods"].some((key) => !Array.isArray(analysis.skills[key]))) return "Skillsstruktur fehlt.";
  return "";
}
__name(validateJobAnalysisResponse, "validateJobAnalysisResponse");
function validateJobAnalysisRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Ein JSON-Objekt ist erforderlich.";
  if (typeof payload.rawText !== "string" || !payload.rawText.trim()) return "rawText ist erforderlich.";
  if (payload.rawText.length > 5e4) return "rawText ist zu gro\xDF.";
  if (payload.details !== void 0 && typeof payload.details !== "string") return "details muss Text sein.";
  if ((payload.details || "").length > 5e3) return "details ist zu gro\xDF.";
  return "";
}
__name(validateJobAnalysisRequest, "validateJobAnalysisRequest");
function profileMatchingOutputSchema() {
  const object = /* @__PURE__ */ __name((properties, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false }), "object");
  const status = { type: "string", enum: ["matched", "partial", "missing", "unclear", "contradicted"] };
  const item = object({ requirement: { type: "string" }, status, profileEvidence: { type: "array", items: { type: "string" } } });
  const area = object({ status, rating: { type: "string" }, explanation: { type: "string" } });
  const schema = object({ version: { type: "integer" }, score: { type: "null" }, rating: { type: "string" }, requirements: object({ mustHave: object({ matched: { type: "integer" }, total: { type: "integer" }, items: { type: "array", items: item } }), niceToHave: object({ matched: { type: "integer" }, total: { type: "integer" }, items: { type: "array", items: item } }) }), skills: object({ matched: { type: "array", items: { type: "string" } }, partial: { type: "array", items: { type: "string" } }, missing: { type: "array", items: { type: "string" } } }), experience: area, education: area, projects: object({ status, rating: { type: "string" }, explanation: { type: "string" }, relevant: { type: "array", items: object({ projectId: { type: "string" }, relevance: { type: "string", enum: ["high", "medium", "low"] }, reasons: { type: "array", items: { type: "string" } } }) } }), softSkills: area, languages: area, missing: { type: "array", items: { type: "string" } }, strengths: { type: "array", items: { type: "string" } }, summary: { type: "string" }, matchedAt: { type: "string" } });
  return { name: "profile_matching", schema };
}
__name(profileMatchingOutputSchema, "profileMatchingOutputSchema");
function validateProfileMatchingResponse(matching, profile) {
  if (!matching || matching.version !== 1 || matching.score !== null) return "Matching muss versioniert sein und darf keinen KI-Score enthalten.";
  if (!matching.requirements?.mustHave || !matching.requirements?.niceToHave) return "Anforderungsmatches fehlen.";
  const references = /* @__PURE__ */ new Map();
  const addReference = /* @__PURE__ */ __name((item) => {
    if (!item || !item.id) return;
    references.set(String(item.id), String(item.id));
    if (item.name) references.set(String(item.name).trim().toLocaleLowerCase("de-DE"), String(item.id));
    if (item.title) references.set(String(item.title).trim().toLocaleLowerCase("de-DE"), String(item.id));
  }, "addReference");
  if (profile.skills) Object.values(profile.skills).flat().forEach(addReference);
  (profile.experience || []).forEach(addReference);
  (profile.education || []).forEach(addReference);
  (profile.projects || []).forEach(addReference);
  const ids = new Set(references.values());
  const normalizeReference = /* @__PURE__ */ __name((value) => references.get(String(value || "").trim()) || references.get(String(value || "").trim().toLocaleLowerCase("de-DE")) || value, "normalizeReference");
  [...matching.requirements.mustHave.items || [], ...matching.requirements.niceToHave.items || []].forEach((item) => {
    item.profileEvidence = (item.profileEvidence || []).map(normalizeReference);
  });
  (matching.projects?.relevant || []).forEach((item) => {
    item.projectId = normalizeReference(item.projectId);
  });
  const evidence = [...matching.requirements.mustHave.items || [], ...matching.requirements.niceToHave.items || []].flatMap((item) => item.profileEvidence || []);
  const projectIds = (matching.projects?.relevant || []).map((item) => item.projectId);
  if ([...evidence, ...projectIds].some((id) => !ids.has(id))) return "Matching enth\xE4lt unbekannte Profilreferenzen.";
  return "";
}
__name(validateProfileMatchingResponse, "validateProfileMatchingResponse");
async function handleProfileMatching(request, env, origin, fetcher = fetch) {
  if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterst\xFCtzt." }, 405, origin);
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
  if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte sp\xE4ter erneut versuchen." }, 429, origin);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Ung\xFCltiges JSON." }, 400, origin);
  }
  if (!payload?.jobAnalysis || !payload?.profile) return jsonResponse({ error: "jobAnalysis und profile sind erforderlich." }, 400, origin);
  const input = `JobAnalysis:
${JSON.stringify(payload.jobAnalysis)}

Bewerberprofil:
${JSON.stringify(payload.profile)}`;
  const provider = createOpenAiProvider(env, fetcher);
  const result = await provider.generate(input, profileMatchingOutputSchema(), "Vergleiche ausschlie\xDFlich JobAnalysis und Bewerberprofil. Erfinde keine Kenntnisse. Verwende in profileEvidence und projectId ausschlie\xDFlich die exakten id-Werte aus dem Bewerberprofil, niemals Anzeigenamen oder neue IDs. Setze score immer auf null; ApplyHQ berechnet ihn selbst. Verwende matched nur bei konkreter Profilevidenz, partial bei teilweiser Evidenz, unclear wenn die Information im Profil nicht ausreichend belegt ist, und contradicted ausschlie\xDFlich bei einer ausdr\xFCcklichen negativen Profilangabe. Das blo\xDFe Fehlen eines Skills, Soft Skills oder einer Sprache ist niemals contradicted.");
  if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
  if (result.error) return jsonResponse({ error: "Das Profil konnte nicht gematcht werden." }, 502, origin);
  let matching;
  try {
    matching = JSON.parse(result.answer);
  } catch {
    return jsonResponse({ error: "Die KI lieferte kein g\xFCltiges Matching." }, 502, origin);
  }
  const outputError = validateProfileMatchingResponse(matching, payload.profile);
  if (outputError) return jsonResponse({ error: outputError }, 502, origin);
  return jsonResponse({ success: true, provider: provider.name, model: provider.model, matching }, 200, origin);
}
__name(handleProfileMatching, "handleProfileMatching");
function coverLetterOutputSchema() {
  const stringArray = { type: "array", items: { type: "string" } };
  const schema = { type: "object", properties: { version: { type: "integer" }, generatedAt: { type: "string" }, subject: { type: "string" }, greeting: { type: "string" }, opening: { type: "string" }, body: stringArray, motivation: { type: "string" }, closing: { type: "string" }, signature: { type: "string" } }, required: ["version", "generatedAt", "subject", "greeting", "opening", "body", "motivation", "closing", "signature"], additionalProperties: false };
  return { name: "cover_letter", schema };
}
__name(coverLetterOutputSchema, "coverLetterOutputSchema");
function validateCoverLetterResponse(letter) {
  if (!letter || letter.version !== 1) return "Anschreiben besitzt keine g\xFCltige Version.";
  for (const key of ["subject", "greeting", "opening", "motivation", "closing", "signature"]) if (typeof letter[key] !== "string" || !letter[key].trim()) return `Anschreiben.${key} fehlt.`;
  if (!Array.isArray(letter.body) || !letter.body.length || letter.body.some((item) => typeof item !== "string" || !item.trim())) return "Anschreiben.body ist ung\xFCltig.";
  return "";
}
__name(validateCoverLetterResponse, "validateCoverLetterResponse");
async function handleCoverLetter(request, env, origin, fetcher = fetch) {
  if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterst\xFCtzt." }, 405, origin);
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
  if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte sp\xE4ter erneut versuchen." }, 429, origin);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Ung\xFCltiges JSON." }, 400, origin);
  }
  if (!payload?.jobAnalysis || !payload?.jobMatching || !payload?.profile) return jsonResponse({ error: "jobAnalysis, jobMatching und profile sind erforderlich." }, 400, origin);
  const input = `JobAnalysis:
${JSON.stringify(payload.jobAnalysis)}

JobMatching:
${JSON.stringify(payload.jobMatching)}

Bewerberprofil:
${JSON.stringify(payload.profile)}

Unternehmen:
${JSON.stringify(payload.company || {})}

Ansprechpartner:
${JSON.stringify(payload.contact || {})}`;
  const provider = createOpenAiProvider(env, fetcher);
  const result = await provider.generate(input, coverLetterOutputSchema(), "Erstelle ein individuelles deutsches Anschreiben mit dieser verbindlichen inhaltlichen Priorit\xE4t: 1. Warum dieses Unternehmen? Leite einen konkreten, glaubw\xFCrdigen Grund ausschlie\xDFlich aus den tats\xE4chlich genannten Aufgaben, Produkten, Technologien, Arbeitsweisen, Angeboten oder anderen Fakten der Stellenanzeige ab; erfinde keine Unternehmensmotivation. 2. Warum diese konkrete Stelle? Verkn\xFCpfe die Position und ihre wichtigsten Aufgaben mit dem Bewerber. 3. Warum passe ich grunds\xE4tzlich? Formuliere eine kurze Gesamtpassung. 4. Verwende nur 2 bis 3 besonders relevante Profilbelege, statt den Lebenslauf oder die Projektliste aufzuz\xE4hlen. 5. Wenn im Profil eine pers\xF6nliche Homepage vorhanden ist, verweise am Ende nat\xFCrlich darauf und \xFCbernimm die URL ausschlie\xDFlich aus profile.homepage; erfinde niemals eine URL. Verwende ausschlie\xDFlich belegte Profilinformationen. matched darf konkret verwendet werden, partial nur vorsichtig, unclear und contradicted niemals als vorhandene Qualifikation. Verwende nur relevante Projekte aus dem Profil. Erfinde keine Technologien, T\xE4tigkeiten, Erfolge, Zahlen, Motivation oder Unternehmensfakten. Fehlende Kenntnisse geh\xF6ren nicht als Negativliste in das Anschreiben. Wenn kein Ansprechpartnername vorhanden ist, nutze 'Sehr geehrte Damen und Herren,'. Vermeide generische KI-Floskeln. Zielumfang etwa 250 bis 400 W\xF6rter. Signatur nicht mit pers\xF6nlichen Daten erfinden; verwende einen neutralen Platzhalter wie '[Name]'.");
  if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
  if (result.error) return jsonResponse({ error: "Das Anschreiben konnte nicht generiert werden." }, 502, origin);
  let letter;
  try {
    letter = JSON.parse(result.answer);
  } catch {
    return jsonResponse({ error: "Die KI lieferte kein g\xFCltiges Anschreiben." }, 502, origin);
  }
  const validationError = validateCoverLetterResponse(letter);
  if (validationError) return jsonResponse({ error: validationError }, 502, origin);
  letter.generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return jsonResponse({ success: true, provider: provider.name, model: provider.model, coverLetter: letter }, 200, origin);
}
__name(handleCoverLetter, "handleCoverLetter");
function coverLetterReviewOutputSchema() {
  const area = { type: "object", properties: { score: { type: "integer" }, status: { type: "string" }, issues: { type: "array", items: { type: "object", properties: { type: { type: "string" }, severity: { type: "string", enum: ["critical", "high", "medium", "low"] }, claim: { type: "string" }, reason: { type: "string" } }, required: ["type", "severity", "claim", "reason"], additionalProperties: false } } }, required: ["score", "status", "issues"], additionalProperties: false };
  const schema = { type: "object", properties: { version: { type: "integer" }, overallScore: { type: "null" }, verdict: { type: "string" }, factualAccuracy: area, profileAlignment: area, jobAlignment: area, evidenceUsage: area, hallucinationRisk: area, style: area, personalization: area, length: area, issues: { type: "array", items: area.properties.issues.items }, strengths: { type: "array", items: { type: "string" } }, recommendations: { type: "array", items: { type: "string" } }, reviewedAt: { type: "string" }, coverLetterGeneratedAt: { type: "string" } }, required: ["version", "overallScore", "verdict", "factualAccuracy", "profileAlignment", "jobAlignment", "evidenceUsage", "hallucinationRisk", "style", "personalization", "length", "issues", "strengths", "recommendations", "reviewedAt", "coverLetterGeneratedAt"], additionalProperties: false };
  return { name: "cover_letter_review", schema };
}
__name(coverLetterReviewOutputSchema, "coverLetterReviewOutputSchema");
function coverLetterRevisionOutputSchema() {
  const stringArray = { type: "array", items: { type: "string" } };
  const schema = { type: "object", properties: { version: { type: "integer" }, generatedAt: { type: "string" }, subject: { type: "string" }, greeting: { type: "string" }, opening: { type: "string" }, body: stringArray, motivation: { type: "string" }, closing: { type: "string" }, signature: { type: "string" }, changes: { type: "array", items: { type: "object", properties: { type: { type: "string", enum: ["factual_correction", "evidence_alignment", "job_relevance", "profile_relevance", "style", "clarity", "length", "duplication", "structure"] }, section: { type: "string" }, description: { type: "string" } }, required: ["type", "section", "description"], additionalProperties: false } } }, required: ["version", "generatedAt", "subject", "greeting", "opening", "body", "motivation", "closing", "signature", "changes"], additionalProperties: false };
  return { name: "cover_letter_revision", schema };
}
__name(coverLetterRevisionOutputSchema, "coverLetterRevisionOutputSchema");
function validateCoverLetterRevisionResponse(result) {
  const letterError = validateCoverLetterResponse(result);
  if (letterError) return letterError;
  if (!Array.isArray(result.changes)) return "\xDCberarbeitung.changes ist ung\xFCltig.";
  if (result.changes.some((change) => !change || typeof change.type !== "string" || typeof change.section !== "string" || typeof change.description !== "string" || !change.description.trim())) return "\xDCberarbeitung.changes enth\xE4lt ung\xFCltige Eintr\xE4ge.";
  return "";
}
__name(validateCoverLetterRevisionResponse, "validateCoverLetterRevisionResponse");
function validateCoverLetterReviewResponse(review) {
  if (!review || review.version !== 1 || review.overallScore !== null) return "Review muss versioniert sein und darf keinen KI-Gesamtscore enthalten.";
  for (const key of ["factualAccuracy", "profileAlignment", "jobAlignment", "evidenceUsage", "hallucinationRisk", "style", "personalization", "length"]) if (!review[key] || !Number.isInteger(review[key].score) || review[key].score < 0 || review[key].score > 100 || !Array.isArray(review[key].issues)) return `Review.${key} ist ung\xFCltig.`;
  return "";
}
__name(validateCoverLetterReviewResponse, "validateCoverLetterReviewResponse");
async function handleCoverLetterReview(request, env, origin, fetcher = fetch) {
  if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterst\xFCtzt." }, 405, origin);
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
  if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte sp\xE4ter erneut versuchen." }, 429, origin);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Ung\xFCltiges JSON." }, 400, origin);
  }
  if (!payload?.coverLetter || !payload?.jobAnalysis || !payload?.jobMatching || !payload?.profile) return jsonResponse({ error: "coverLetter, jobAnalysis, jobMatching und profile sind erforderlich." }, 400, origin);
  const input = `CoverLetter:
${JSON.stringify(payload.coverLetter)}

JobAnalysis:
${JSON.stringify(payload.jobAnalysis)}

JobMatching:
${JSON.stringify(payload.jobMatching)}

Profil:
${JSON.stringify(payload.profile)}

Stelle:
${JSON.stringify({ company: payload.company || {}, position: payload.position || "", contact: payload.contact || {} })}`;
  const provider = createOpenAiProvider(env, fetcher);
  const result = await provider.generate(input, coverLetterReviewOutputSchema(), "Pr\xFCfe das Anschreiben ausschlie\xDFlich gegen die bereitgestellten Daten. Melde nur tats\xE4chlich begr\xFCndete Probleme. Anrede, Unternehmensname, Stellenbezeichnung und Signatur sind deterministische ApplyHQ-Daten; wenn sie zu den strukturierten Daten passen, d\xFCrfen sie nicht als generative Fehler kritisiert werden. matched ist belegte Evidenz, partial muss vorsichtig formuliert sein, unclear bedeutet nur nicht ausreichend belegt und ist kein Beweis f\xFCr Abwesenheit, contradicted bedeutet ausdr\xFCcklich widerlegt. Pr\xFCfe Fakten, Profil- und Stellenbezug, Evidenztreue, Halluzinationen, Stil, Individualit\xE4t und L\xE4nge. Setze overallScore immer auf null; ApplyHQ berechnet ihn.");
  if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
  if (result.error) return jsonResponse({ error: "Das Anschreiben konnte nicht gepr\xFCft werden." }, 502, origin);
  let review;
  try {
    review = JSON.parse(result.answer);
  } catch {
    return jsonResponse({ error: "Die KI lieferte kein g\xFCltiges Review." }, 502, origin);
  }
  const error = validateCoverLetterReviewResponse(review);
  if (error) return jsonResponse({ error }, 502, origin);
  review.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
  return jsonResponse({ success: true, provider: provider.name, model: provider.model, review }, 200, origin);
}
__name(handleCoverLetterReview, "handleCoverLetterReview");
async function handleCoverLetterRevision(request, env, origin, fetcher = fetch) {
  if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterst\xFCtzt." }, 405, origin);
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
  if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte sp\xE4ter erneut versuchen." }, 429, origin);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Ung\xFCltiges JSON." }, 400, origin);
  }
  if (!payload?.coverLetter || !payload?.coverLetterReview || !payload?.jobAnalysis || !payload?.jobMatching || !payload?.profile) return jsonResponse({ error: "coverLetter, coverLetterReview, jobAnalysis, jobMatching und profile sind erforderlich." }, 400, origin);
  const input = `Bestehendes Anschreiben:
${JSON.stringify(payload.coverLetter)}

Qualit\xE4tspr\xFCfung (prim\xE4re \xC4nderungsanweisung):
${JSON.stringify(payload.coverLetterReview)}

Eigener \xC4nderungswunsch (optional, nachrangig gegen\xFCber Fakten und Matching):
${String(payload.userRevisionInstruction || "Keine zus\xE4tzliche Anweisung.")}

Stellenanalyse:
${JSON.stringify(payload.jobAnalysis)}

Matching:
${JSON.stringify(payload.jobMatching)}

Profil:
${JSON.stringify(payload.profile)}

Stelle:
${JSON.stringify({ company: payload.company || {}, position: payload.position || "", contact: payload.contact || {} })}`;
  const provider = createOpenAiProvider(env, fetcher);
  const instructions = "\xDCberarbeite das bestehende Anschreiben konservativ anhand der Qualit\xE4tspr\xFCfung und, falls vorhanden, des eigenen \xC4nderungswunsches. Fakten, Profil und Matching haben Vorrang vor der Benutzeranweisung. Die Ausgabe version muss immer 1 sein; sie bezeichnet die Schema-Version, nicht die Dokumentrevision. Erhalte gute Abs\xE4tze und konkrete belegte Inhalte. Behebe zuerst Fakten- und Halluzinationsfehler. matched darf konkret verwendet werden, partial nur vorsichtig, unclear niemals als vorhandene F\xE4higkeit, contradicted keinesfalls, missing nicht automatisch als nicht vorhanden. Ver\xE4ndere Matching, Profil, Stellenanalyse und Bewerbungsdaten nicht. Erfinde keine Skills, Technologien, Projekte, Arbeitgeber, T\xE4tigkeiten, Erfolge, Zahlen, Zertifikate, Verantwortlichkeiten oder Motivation. Wenn eine Aussage nicht belegbar ist, entferne sie oder formuliere sie nur mit belegter Evidenz neutral. Keine neuen Behauptungen als Ersatz. Unternehmensname, Stellenbezeichnung, Anrede und Signatur werden von ApplyHQ deterministisch gesetzt und d\xFCrfen nicht inhaltlich ver\xE4ndert werden. Verbessere Stellenbezug, Stil, Klarheit, L\xE4nge und Wiederholungen nur soweit Review oder Benutzerwunsch dies begr\xFCnden. Bleibe ungef\xE4hr bei 250 bis 400 W\xF6rtern. Gib changes nur f\xFCr tats\xE4chlich vorgenommene \xC4nderungen zur\xFCck.";
  const result = await provider.generate(input, coverLetterRevisionOutputSchema(), instructions);
  if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
  if (result.error) return jsonResponse({ error: "Das Anschreiben konnte nicht \xFCberarbeitet werden." }, 502, origin);
  let revision;
  try {
    revision = JSON.parse(result.answer);
  } catch {
    return jsonResponse({ error: "Die KI lieferte keine g\xFCltige \xDCberarbeitung." }, 502, origin);
  }
  const error = validateCoverLetterRevisionResponse(revision);
  if (error) return jsonResponse({ error }, 502, origin);
  revision.generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return jsonResponse({ success: true, provider: provider.name, model: provider.model, coverLetter: { version: 1, generatedAt: revision.generatedAt, subject: revision.subject, greeting: revision.greeting, opening: revision.opening, body: revision.body, motivation: revision.motivation, closing: revision.closing, signature: revision.signature }, changes: revision.changes }, 200, origin);
}
__name(handleCoverLetterRevision, "handleCoverLetterRevision");
async function handleJobAnalysis(request, env, origin, fetcher = fetch) {
  if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterst\xFCtzt." }, 405, origin);
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
  if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte sp\xE4ter erneut versuchen." }, 429, origin);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Ung\xFCltiges JSON." }, 400, origin);
  }
  const validationError = validateJobAnalysisRequest(payload);
  if (validationError) return jsonResponse({ error: validationError }, 400, origin);
  const input = `Stellenanzeige (Originaltext):
${payload.rawText}

Zus\xE4tzliche Stellendetails (separate Quelle, nur verwenden wenn vorhanden):
${payload.details || "Keine zus\xE4tzlichen Details."}`;
  const provider = createOpenAiProvider(env, fetcher);
  const result = await provider.generate(input, jobAnalysisOutputSchema(), "Analysiere ausschlie\xDFlich die bereitgestellten Quellen. Erfinde nichts. Trenne Muss-Anforderungen und w\xFCnschenswerte Anforderungen. Wenn etwas nicht genannt wird, verwende leere Werte oder null. Speichere salary.source als jobPosting oder details.");
  if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
  if (result.error === "rate_limit") return jsonResponse({ error: "Der KI-Anbieter meldet ein Rate-Limit." }, 429, origin);
  if (result.error === "provider") {
    console.log(JSON.stringify({ event: "job_analysis_provider_error", status: result.status || 0 }));
    return jsonResponse({ error: "Der KI-Anbieter konnte die Analyse nicht verarbeiten.", providerStatus: result.status || null }, 502, origin);
  }
  if (result.error) return jsonResponse({ error: "Die Stellenanzeige konnte nicht analysiert werden." }, 502, origin);
  let analysis;
  try {
    analysis = JSON.parse(result.answer);
  } catch {
    return jsonResponse({ error: "Die KI lieferte keine g\xFCltige Analyse." }, 502, origin);
  }
  const outputError = validateJobAnalysisResponse(analysis);
  if (outputError) return jsonResponse({ error: outputError }, 502, origin);
  analysis.analyzedAt = (/* @__PURE__ */ new Date()).toISOString();
  return jsonResponse({ success: true, provider: provider.name, model: provider.model, analysis }, 200, origin);
}
__name(handleJobAnalysis, "handleJobAnalysis");
async function handleAiTest(request, env, origin, fetcher = fetch) {
  if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterst\xFCtzt." }, 405, origin);
  if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
  if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte sp\xE4ter erneut versuchen." }, 429, origin);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Ung\xFCltiges JSON." }, 400, origin);
  }
  const validationError = validateAiTestRequest(payload);
  if (validationError) return jsonResponse({ error: validationError }, 400, origin);
  const provider = createOpenAiProvider(env, fetcher);
  const startedAt = Date.now();
  const result = await provider.generate(payload.input.trim());
  console.log(JSON.stringify({ event: result.error ? "ai_request_failed" : "ai_request_completed", provider: provider.name, status: result.status || 200, durationMs: Date.now() - startedAt }));
  if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
  if (result.error === "auth") return jsonResponse({ error: "KI-Service konnte sich nicht authentifizieren." }, 502, origin);
  if (result.error === "rate_limit") return jsonResponse({ error: "Der KI-Anbieter meldet ein Rate-Limit." }, 429, origin);
  if (result.error === "invalid_output") return jsonResponse({ error: "Der KI-Anbieter lieferte keine g\xFCltige strukturierte Antwort." }, 502, origin);
  if (result.error) return jsonResponse({ error: "Der KI-Service ist momentan nicht verf\xFCgbar." }, 502, origin);
  return jsonResponse({ success: true, provider: provider.name, model: provider.model, output: result.answer }, 200, origin);
}
__name(handleAiTest, "handleAiTest");
function isGermanArbeitnowJob(job) {
  const country = normalizeText(job.country || job.land || job.country_code || job.countryCode);
  const location = normalizeText(job.location);
  const locationText = `${location} ${country}`.toLocaleLowerCase("de-DE");
  if (country) {
    return /^(de|deu|germany|deutschland)$/i.test(country.trim());
  }
  if (!locationText || /^(remote|fully remote|remote deutschland|deutschland|germany)$/i.test(locationText.trim())) {
    return true;
  }
  return !/\b(london|united kingdom|uk|england|scotland|wales|france|frankreich|paris|netherlands|niederlande|amsterdam|belgium|belgien|brussels|switzerland|schweiz|zurich|austria|österreich|vienna|wien|spain|spanien|madrid|italy|italien|rome|rom|usa|united states|canada|poland|polen|warsaw|warszawa)\b/i.test(locationText);
}
__name(isGermanArbeitnowJob, "isGermanArbeitnowJob");
async function searchArbeitnow(profile) {
  const response = await fetch(ARBEITNOW_API_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Arbeitnow antwortete mit HTTP ${response.status}.`);
  const payload = await response.json();
  const jobs = Array.isArray(payload.data) ? payload.data : [];
  return {
    jobs: jobs.map(normalizeArbeitnowJob).filter((job) => job.company && job.position && job.url && isGermanArbeitnowJob(job)),
    rawCount: jobs.length,
    invalidCount: 0,
    detailsFetchedCount: 0,
    detailsFailedCount: 0
  };
}
__name(searchArbeitnow, "searchArbeitnow");
var index_default = {
  async fetch(request, env) {
    const origin = getCorsOrigin(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Max-Age": "86400"
        }
      });
    }
    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === "/api/ai/test") return handleAiTest(request, env, origin);
    if (requestUrl.pathname === "/api/ai/job-analysis") return handleJobAnalysis(request, env, origin);
    if (requestUrl.pathname === "/api/ai/profile-matching") return handleProfileMatching(request, env, origin);
    if (requestUrl.pathname === "/api/ai/cover-letter") return handleCoverLetter(request, env, origin);
    if (requestUrl.pathname === "/api/ai/cover-letter-review") return handleCoverLetterReview(request, env, origin);
    if (requestUrl.pathname === "/api/ai/cover-letter-revision") return handleCoverLetterRevision(request, env, origin);
    if (request.method !== "POST") {
      return jsonResponse({ error: "Nur POST wird unterst\xFCtzt." }, 405, origin);
    }
    if (isRateLimited(request)) {
      return jsonResponse({ error: "Zu viele Suchanfragen. Bitte in einigen Minuten erneut versuchen." }, 429, origin);
    }
    try {
      const profile = await request.json();
      const validationError = validateProfile(profile);
      if (validationError) return jsonResponse({ error: validationError }, 400, origin);
      const providers = [
        { name: "Bundesagentur f\xFCr Arbeit", search: /* @__PURE__ */ __name(() => searchBundesagentur(profile, env), "search") },
        { name: "Arbeitnow", search: /* @__PURE__ */ __name(() => searchArbeitnow(profile), "search") }
      ];
      const results = await Promise.allSettled(providers.map((provider) => provider.search()));
      const successfulResults = results.map((result, index) => ({ result, provider: providers[index] })).filter((item) => item.result.status === "fulfilled");
      const errors = results.map((result, index) => ({ result, provider: providers[index] })).filter((item) => item.result.status === "rejected").map((item) => ({
        source: item.provider.name,
        message: item.result.reason instanceof Error ? item.result.reason.message : "Unbekannter Fehler bei einer Jobquelle."
      }));
      const jobs = successfulResults.flatMap((item) => item.result.value.jobs);
      return jsonResponse({
        source: "Bundesagentur f\xFCr Arbeit + Arbeitnow",
        jobs,
        rawCount: successfulResults.reduce((sum, item) => sum + item.result.value.rawCount, 0),
        invalidCount: successfulResults.reduce((sum, item) => sum + item.result.value.invalidCount, 0),
        detailsFetchedCount: successfulResults.reduce((sum, item) => sum + item.result.value.detailsFetchedCount, 0),
        detailsFailedCount: successfulResults.reduce((sum, item) => sum + item.result.value.detailsFailedCount, 0),
        providers: successfulResults.map((item) => ({
          source: item.provider.name,
          rawCount: item.result.value.rawCount,
          normalizedCount: item.result.value.jobs.length
        })),
        errors
      }, successfulResults.length ? 200 : 502, origin);
    } catch (error) {
      return jsonResponse({
        source: "Bundesagentur f\xFCr Arbeit",
        jobs: [],
        errors: [{ message: error instanceof Error ? error.message : "Unbekannter API-Fehler." }]
      }, 502, origin);
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
