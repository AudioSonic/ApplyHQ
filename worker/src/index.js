const ALLOWED_ORIGIN = "*";
const BA_API_BASE_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const BA_API_KEY = "jobboerse-jobsuche";
const ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api";
const rateLimitBuckets = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_DETAIL_REQUESTS = 25;
const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";
const AI_MAX_INPUT_LENGTH = 4000;
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

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

function getCorsOrigin(request, env) {
    const requestOrigin = request.headers.get("Origin");
    const configuredOrigin = env.ALLOWED_ORIGIN || ALLOWED_ORIGIN;
    const allowedOrigins = configuredOrigin.split(",").map(origin => origin.trim()).filter(Boolean);
    return allowedOrigins.includes("*") || allowedOrigins.includes(requestOrigin) ? requestOrigin || configuredOrigin : "null";
}

function normalizeText(value) {
    return String(value || "").trim();
}

function isNationwideLocation(value) {
    const location = normalizeText(value);
    return !location || /^(deutschland|bundesweit|ganz deutschland)$/i.test(location);
}

function getSearchTerm(profile) {
    const terms = Array.isArray(profile.searchTerms)
        ? profile.searchTerms.map(normalizeText).filter(Boolean)
        : [];
    return terms.join(" ") || normalizeText(profile.position);
}

function validateProfile(profile) {
    if (!profile) return "Ein gültiges Suchprofil ist erforderlich.";
    if (normalizeText(profile.location).length > 120) return "Der Standort ist zu lang.";
    if (profile.radius !== undefined && (!Number.isFinite(Number(profile.radius)) || Number(profile.radius) < 0 || Number(profile.radius) > 500)) {
        return "Der Suchradius muss zwischen 0 und 500 km liegen.";
    }
    if (Array.isArray(profile.searchTerms) && profile.searchTerms.length > 20) return "Es sind höchstens 20 Suchbegriffe erlaubt.";
    return "";
}

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

function getFirstValue(...values) {
    return values.find(value => value !== undefined && value !== null && normalizeText(value)) || "";
}

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

function getState(job) {
    const location = job.arbeitsort || job.stellenlokationen?.[0]?.adresse || {};
    return getFirstValue(
        typeof location === "string" ? "" : location.bundesland,
        typeof location === "string" ? "" : location.region,
        job.bundesland,
        job.stellenlokationen?.[0]?.adresse?.region
    );
}

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

function isNewSinceLastSearch(job, profile) {
    return !profile.lastSearch || !job.publishedAt || job.publishedAt > profile.lastSearch;
}

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
        employmentType: job.arbeitszeitVollzeit ? "full-time" : (job.arbeitszeitTeilzeit ? "part-time" : getFirstValue(job.arbeitszeit, job.beschaeftigungsart, job.employmentType)),
        publishedAt: getPublishedAt(job),
        url: url || (reference ? `https://www.arbeitsagentur.de/jobsuche/suche?angebotsart=1&id=${encodeURIComponent(reference)}` : ""),
        source: "Bundesagentur für Arbeit"
    };
}

function getDetailKeywords(details) {
    const skills = Array.isArray(details.fertigkeiten)
        ? details.fertigkeiten.flatMap(skill => [
            skill.hierarchieName,
            ...(Array.isArray(skill.auspraegungen) ? skill.auspraegungen : Object.values(skill.auspraegungen || {}))
        ].filter(Boolean))
        : [];
    return [details.beruf, details.titel, details.stellenangebotsTitel, ...skills].filter(Boolean);
}

function encodeReference(reference) {
    return encodeURIComponent(btoa(reference));
}

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
                keywords: [...new Set([...(job.keywords || []), ...getDetailKeywords(details)])],
                remote: Boolean(job.remote || details.homeofficemoeglich),
                employmentType: details.arbeitszeitmodelle?.some(value => /vollzeit/i.test(value)) ? "full-time" : (details.arbeitszeitmodelle?.some(value => /teilzeit/i.test(value)) ? "part-time" : job.employmentType)
            },
            fetched: true
        };
    } catch {
        return { job, fetched: false };
    }
}

async function enrichJobsWithDetails(jobs, env) {
    const jobsToEnrich = jobs.slice(0, MAX_DETAIL_REQUESTS);
    const enriched = [];
    let detailsFetchedCount = 0;
    let detailsFailedCount = 0;

    for (let index = 0; index < jobsToEnrich.length; index += 5) {
        const batch = await Promise.all(jobsToEnrich.slice(index, index + 5).map(job => fetchJobDetails(job, env)));
        batch.forEach(result => {
            enriched.push(result.job);
            if (result.fetched) detailsFetchedCount += 1;
            else detailsFailedCount += 1;
        });
    }

    return { jobs: enriched, detailsFetchedCount, detailsFailedCount };
}

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
    if (!Array.isArray(jobs)) throw new Error("BA-API lieferte kein gültiges Ergebnisformat.");
    const normalizedJobs = jobs.map(normalizeJob);
    const validJobs = normalizedJobs.filter(job => job.company && job.position && (job.externalId || job.url));
    const newJobs = validJobs.filter(job => isNewSinceLastSearch(job, profile));
    const enriched = await enrichJobsWithDetails(newJobs, env);
    return {
        jobs: enriched.jobs,
        rawCount: jobs.length,
        invalidCount: normalizedJobs.filter(job => !job.company || !job.position || (!job.externalId && !job.url)).length,
        oldCount: validJobs.length - newJobs.length,
        detailsFetchedCount: enriched.detailsFetchedCount,
        detailsFailedCount: enriched.detailsFailedCount
    };
}

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
        employmentType: Array.isArray(job.job_types) && job.job_types.some(type => /part.?time|teilzeit/i.test(type)) ? "part-time" : "",
        publishedAt: createdAt ? new Date(createdAt * 1000).toISOString().slice(0, 10) : "",
        url: normalizeText(job.url),
        source: "Arbeitnow"
    };
}

function isAiRateLimited(request) {
    return isRateLimited(request);
}

function validateAiTestRequest(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Ein JSON-Objekt ist erforderlich.";
    if (typeof payload.input !== "string" || !payload.input.trim()) return "Das Feld input ist erforderlich.";
    if (payload.input.length > AI_MAX_INPUT_LENGTH) return `input darf höchstens ${AI_MAX_INPUT_LENGTH} Zeichen enthalten.`;
    return "";
}

function getOpenAiModel(env) {
    return normalizeText(env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
}

function extractOpenAiText(payload) {
    if (typeof payload?.output_text === "string") return payload.output_text;
    return (payload?.output || []).flatMap(item => item.content || []).filter(item => item.type === "output_text").map(item => item.text).join("\n");
}

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
                    ...(outputSchema.name === "ai_test_response" ? {} : { reasoning: { effort: "none" } }),
                    input: [{ role: "user", content: [{ type: "input_text", text: `${instructions}\n\n${input}` }] }],
                    text: { format: { type: "json_schema", name: outputSchema.name, strict: true, schema: outputSchema.schema } }
                })
            });
            if (!response.ok) return { error: response.status === 401 || response.status === 403 ? "auth" : response.status === 429 ? "rate_limit" : "provider", status: response.status };
            const data = await response.json();
            const text = extractOpenAiText(data);
            try {
                const parsed = JSON.parse(text);
                return { answer: outputSchema.name === "ai_test_response" ? parsed.answer : text };
            } catch { return { error: "invalid_output" }; }
        }
    };
}

function jobAnalysisOutputSchema() {
    const stringArray = { type: "array", items: { type: "string" } };
    const nullableBoolean = { type: ["boolean", "null"] };
    const skill = { type: "object", properties: { name: { type: "string" }, category: { type: "string" } }, required: ["name", "category"], additionalProperties: false };
    const object = (properties, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });
    const schema = object({
        version: { type: "integer" }, analyzedAt: { type: "string" },
        position: object({ title: { type: "string" }, seniority: { type: "string" }, employmentType: { type: "string" } }),
        company: object({ name: { type: "string" } }), tasks: stringArray,
        requirements: object({ mustHave: stringArray, niceToHave: stringArray }),
        skills: object({ programmingLanguages: { type: "array", items: skill }, frontend: { type: "array", items: skill }, backend: { type: "array", items: skill }, frameworks: { type: "array", items: skill }, databases: { type: "array", items: skill }, tools: { type: "array", items: skill }, methods: { type: "array", items: skill } }),
        softSkills: stringArray,
        experience: object({ requiredYears: { type: ["integer", "null"] }, preferredYears: { type: ["integer", "null"] }, required: { type: "string" }, preferred: { type: "string" } }),
        education: stringArray, languages: { type: "array", items: object({ language: { type: "string" }, level: { type: "string" }, required: { type: "boolean" } }) },
        workModel: object({ remote: nullableBoolean, hybrid: nullableBoolean, onsite: nullableBoolean }),
        location: object({ city: { type: "string" }, region: { type: "string" } }),
        salary: object({ mentioned: { type: "boolean" }, text: { type: ["string", "null"] }, source: { type: ["string", "null"] } }),
        travel: object({ required: nullableBoolean, description: { type: "string" } }), benefits: stringArray, additionalRequirements: stringArray, summary: { type: "string" }
    });
    return { name: "job_analysis", schema };
}

function validateJobAnalysisResponse(analysis) {
    if (!analysis || typeof analysis !== "object" || analysis.version !== 1) return "Analyse besitzt keine gültige Version.";
    if (!analysis.position || typeof analysis.position.title !== "string") return "Analyseposition fehlt.";
    if (!analysis.requirements || !Array.isArray(analysis.requirements.mustHave) || !Array.isArray(analysis.requirements.niceToHave)) return "Anforderungsstruktur fehlt.";
    if (!analysis.skills || ["programmingLanguages", "frontend", "backend", "frameworks", "databases", "tools", "methods"].some(key => !Array.isArray(analysis.skills[key]))) return "Skillsstruktur fehlt.";
    return "";
}

function validateJobAnalysisRequest(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "Ein JSON-Objekt ist erforderlich.";
    if (typeof payload.rawText !== "string" || !payload.rawText.trim()) return "rawText ist erforderlich.";
    if (payload.rawText.length > 50000) return "rawText ist zu groß.";
    if (payload.details !== undefined && typeof payload.details !== "string") return "details muss Text sein.";
    if ((payload.details || "").length > 5000) return "details ist zu groß.";
    return "";
}

function profileMatchingOutputSchema() {
    const object = (properties, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });
    const status = { type: "string", enum: ["matched", "partial", "missing", "unclear", "contradicted"] };
    const item = object({ requirement: { type: "string" }, status, profileEvidence: { type: "array", items: { type: "string" } } });
    const area = object({ status, rating: { type: "string" }, explanation: { type: "string" } });
    const schema = object({ version: { type: "integer" }, score: { type: "null" }, rating: { type: "string" }, requirements: object({ mustHave: object({ matched: { type: "integer" }, total: { type: "integer" }, items: { type: "array", items: item } }), niceToHave: object({ matched: { type: "integer" }, total: { type: "integer" }, items: { type: "array", items: item } }) }), skills: object({ matched: { type: "array", items: { type: "string" } }, partial: { type: "array", items: { type: "string" } }, missing: { type: "array", items: { type: "string" } } }), experience: area, education: area, projects: object({ status, rating: { type: "string" }, explanation: { type: "string" }, relevant: { type: "array", items: object({ projectId: { type: "string" }, relevance: { type: "string", enum: ["high", "medium", "low"] }, reasons: { type: "array", items: { type: "string" } } }) } }), softSkills: area, languages: area, missing: { type: "array", items: { type: "string" } }, strengths: { type: "array", items: { type: "string" } }, summary: { type: "string" }, matchedAt: { type: "string" } });
    return { name: "profile_matching", schema };
}

function validateProfileMatchingResponse(matching, profile) {
    if (!matching || matching.version !== 1 || matching.score !== null) return "Matching muss versioniert sein und darf keinen KI-Score enthalten.";
    if (!matching.requirements?.mustHave || !matching.requirements?.niceToHave) return "Anforderungsmatches fehlen.";
    const references = new Map();
    const addReference = item => { if (!item || !item.id) return; references.set(String(item.id), String(item.id)); if (item.name) references.set(String(item.name).trim().toLocaleLowerCase("de-DE"), String(item.id)); if (item.title) references.set(String(item.title).trim().toLocaleLowerCase("de-DE"), String(item.id)); };
    if (profile.skills) Object.values(profile.skills).flat().forEach(addReference);
    (profile.experience || []).forEach(addReference); (profile.education || []).forEach(addReference); (profile.projects || []).forEach(addReference);
    const ids = new Set(references.values());
    const normalizeReference = value => references.get(String(value || "").trim()) || references.get(String(value || "").trim().toLocaleLowerCase("de-DE")) || value;
    [...(matching.requirements.mustHave.items || []), ...(matching.requirements.niceToHave.items || [])].forEach(item => { item.profileEvidence = (item.profileEvidence || []).map(normalizeReference); });
    (matching.projects?.relevant || []).forEach(item => { item.projectId = normalizeReference(item.projectId); });
    const evidence = [...(matching.requirements.mustHave.items || []), ...(matching.requirements.niceToHave.items || [])].flatMap(item => item.profileEvidence || []);
    const projectIds = (matching.projects?.relevant || []).map(item => item.projectId);
    if ([...evidence, ...projectIds].some(id => !ids.has(id))) return "Matching enthält unbekannte Profilreferenzen.";
    return "";
}

async function handleProfileMatching(request, env, origin, fetcher = fetch) {
    if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterstützt." }, 405, origin);
    if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
    if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte später erneut versuchen." }, 429, origin);
    let payload; try { payload = await request.json(); } catch { return jsonResponse({ error: "Ungültiges JSON." }, 400, origin); }
    if (!payload?.jobAnalysis || !payload?.profile) return jsonResponse({ error: "jobAnalysis und profile sind erforderlich." }, 400, origin);
    const input = `JobAnalysis:\n${JSON.stringify(payload.jobAnalysis)}\n\nBewerberprofil:\n${JSON.stringify(payload.profile)}`;
    const provider = createOpenAiProvider(env, fetcher);
    const result = await provider.generate(input, profileMatchingOutputSchema(), "Vergleiche ausschließlich JobAnalysis und Bewerberprofil. Erfinde keine Kenntnisse. Verwende in profileEvidence und projectId ausschließlich die exakten id-Werte aus dem Bewerberprofil, niemals Anzeigenamen oder neue IDs. Setze score immer auf null; ApplyHQ berechnet ihn selbst. Verwende matched nur bei konkreter Profilevidenz, partial bei teilweiser Evidenz, unclear wenn die Information im Profil nicht ausreichend belegt ist, und contradicted ausschließlich bei einer ausdrücklichen negativen Profilangabe. Das bloße Fehlen eines Skills, Soft Skills oder einer Sprache ist niemals contradicted.");
    if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
    if (result.error) return jsonResponse({ error: "Das Profil konnte nicht gematcht werden." }, 502, origin);
    let matching; try { matching = JSON.parse(result.answer); } catch { return jsonResponse({ error: "Die KI lieferte kein gültiges Matching." }, 502, origin); }
    const outputError = validateProfileMatchingResponse(matching, payload.profile);
    if (outputError) return jsonResponse({ error: outputError }, 502, origin);
    return jsonResponse({ success: true, provider: provider.name, model: provider.model, matching }, 200, origin);
}

function coverLetterOutputSchema() {
    const stringArray = { type: "array", items: { type: "string" } };
    const schema = { type: "object", properties: { version: { type: "integer" }, generatedAt: { type: "string" }, subject: { type: "string" }, greeting: { type: "string" }, opening: { type: "string" }, body: stringArray, motivation: { type: "string" }, closing: { type: "string" }, signature: { type: "string" } }, required: ["version", "generatedAt", "subject", "greeting", "opening", "body", "motivation", "closing", "signature"], additionalProperties: false };
    return { name: "cover_letter", schema };
}

function validateCoverLetterResponse(letter) {
    if (!letter || letter.version !== 1) return "Anschreiben besitzt keine gültige Version.";
    for (const key of ["subject", "greeting", "opening", "motivation", "closing", "signature"]) if (typeof letter[key] !== "string" || !letter[key].trim()) return `Anschreiben.${key} fehlt.`;
    if (!Array.isArray(letter.body) || !letter.body.length || letter.body.some(item => typeof item !== "string" || !item.trim())) return "Anschreiben.body ist ungültig.";
    return "";
}

async function handleCoverLetter(request, env, origin, fetcher = fetch) {
    if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterstützt." }, 405, origin);
    if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
    if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte später erneut versuchen." }, 429, origin);
    let payload; try { payload = await request.json(); } catch { return jsonResponse({ error: "Ungültiges JSON." }, 400, origin); }
    if (!payload?.jobAnalysis || !payload?.jobMatching || !payload?.profile) return jsonResponse({ error: "jobAnalysis, jobMatching und profile sind erforderlich." }, 400, origin);
    const input = `JobAnalysis:\n${JSON.stringify(payload.jobAnalysis)}\n\nJobMatching:\n${JSON.stringify(payload.jobMatching)}\n\nBewerberprofil:\n${JSON.stringify(payload.profile)}\n\nUnternehmen:\n${JSON.stringify(payload.company || {})}\n\nAnsprechpartner:\n${JSON.stringify(payload.contact || {})}`;
    const provider = createOpenAiProvider(env, fetcher);
    const result = await provider.generate(input, coverLetterOutputSchema(), "Erstelle ein individuelles deutsches Anschreiben. Verwende ausschließlich belegte Profilinformationen. matched darf konkret verwendet werden, partial nur vorsichtig, unclear und contradicted niemals als vorhandene Qualifikation. Verwende nur relevante Projekte aus dem Profil. Erfinde keine Technologien, Tätigkeiten, Erfolge, Zahlen, Motivation oder Unternehmensfakten. Wenn kein Ansprechpartnername vorhanden ist, nutze 'Sehr geehrte Damen und Herren,'. Vermeide generische KI-Floskeln. Zielumfang etwa 250 bis 400 Wörter. Signatur nicht mit persönlichen Daten erfinden; verwende einen neutralen Platzhalter wie '[Name]'.");
    if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
    if (result.error) return jsonResponse({ error: "Das Anschreiben konnte nicht generiert werden." }, 502, origin);
    let letter; try { letter = JSON.parse(result.answer); } catch { return jsonResponse({ error: "Die KI lieferte kein gültiges Anschreiben." }, 502, origin); }
    const validationError = validateCoverLetterResponse(letter); if (validationError) return jsonResponse({ error: validationError }, 502, origin);
    letter.generatedAt = new Date().toISOString();
    return jsonResponse({ success: true, provider: provider.name, model: provider.model, coverLetter: letter }, 200, origin);
}

async function handleJobAnalysis(request, env, origin, fetcher = fetch) {
    if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterstützt." }, 405, origin);
    if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
    if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte später erneut versuchen." }, 429, origin);
    let payload; try { payload = await request.json(); } catch { return jsonResponse({ error: "Ungültiges JSON." }, 400, origin); }
    const validationError = validateJobAnalysisRequest(payload);
    if (validationError) return jsonResponse({ error: validationError }, 400, origin);
    const input = `Stellenanzeige (Originaltext):\n${payload.rawText}\n\nZusätzliche Stellendetails (separate Quelle, nur verwenden wenn vorhanden):\n${payload.details || "Keine zusätzlichen Details."}`;
    const provider = createOpenAiProvider(env, fetcher);
    const result = await provider.generate(input, jobAnalysisOutputSchema(), "Analysiere ausschließlich die bereitgestellten Quellen. Erfinde nichts. Trenne Muss-Anforderungen und wünschenswerte Anforderungen. Wenn etwas nicht genannt wird, verwende leere Werte oder null. Speichere salary.source als jobPosting oder details.");
    if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
    if (result.error === "rate_limit") return jsonResponse({ error: "Der KI-Anbieter meldet ein Rate-Limit." }, 429, origin);
    if (result.error === "provider") { console.log(JSON.stringify({ event: "job_analysis_provider_error", status: result.status || 0 })); return jsonResponse({ error: "Der KI-Anbieter konnte die Analyse nicht verarbeiten.", providerStatus: result.status || null }, 502, origin); }
    if (result.error) return jsonResponse({ error: "Die Stellenanzeige konnte nicht analysiert werden." }, 502, origin);
    let analysis; try { analysis = JSON.parse(result.answer); } catch { return jsonResponse({ error: "Die KI lieferte keine gültige Analyse." }, 502, origin); }
    const outputError = validateJobAnalysisResponse(analysis);
    if (outputError) return jsonResponse({ error: outputError }, 502, origin);
    analysis.analyzedAt = new Date().toISOString();
    return jsonResponse({ success: true, provider: provider.name, model: provider.model, analysis }, 200, origin);
}

async function handleAiTest(request, env, origin, fetcher = fetch) {
    if (request.method !== "POST") return jsonResponse({ error: "Nur POST wird unterstützt." }, 405, origin);
    if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return jsonResponse({ error: "Content-Type application/json ist erforderlich." }, 415, origin);
    if (isAiRateLimited(request)) return jsonResponse({ error: "Zu viele KI-Anfragen. Bitte später erneut versuchen." }, 429, origin);
    let payload;
    try { payload = await request.json(); } catch { return jsonResponse({ error: "Ungültiges JSON." }, 400, origin); }
    const validationError = validateAiTestRequest(payload);
    if (validationError) return jsonResponse({ error: validationError }, 400, origin);
    const provider = createOpenAiProvider(env, fetcher);
    const startedAt = Date.now();
    const result = await provider.generate(payload.input.trim());
    // Log only operational metadata; never log input, prompts, output or secrets.
    console.log(JSON.stringify({ event: result.error ? "ai_request_failed" : "ai_request_completed", provider: provider.name, status: result.status || 200, durationMs: Date.now() - startedAt }));
    if (result.error === "missing_key") return jsonResponse({ error: "KI-Service ist serverseitig nicht konfiguriert." }, 503, origin);
    if (result.error === "auth") return jsonResponse({ error: "KI-Service konnte sich nicht authentifizieren." }, 502, origin);
    if (result.error === "rate_limit") return jsonResponse({ error: "Der KI-Anbieter meldet ein Rate-Limit." }, 429, origin);
    if (result.error === "invalid_output") return jsonResponse({ error: "Der KI-Anbieter lieferte keine gültige strukturierte Antwort." }, 502, origin);
    if (result.error) return jsonResponse({ error: "Der KI-Service ist momentan nicht verfügbar." }, 502, origin);
    return jsonResponse({ success: true, provider: provider.name, model: provider.model, output: result.answer }, 200, origin);
}

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

    // Arbeitnow liefert den Länderwert nicht bei jedem Datensatz. Diese
    // eindeutigen ausländischen Angaben dürfen deshalb nicht durch remote
    // als deutsche Stellen durchrutschen.
    return !/\b(london|united kingdom|uk|england|scotland|wales|france|frankreich|paris|netherlands|niederlande|amsterdam|belgium|belgien|brussels|switzerland|schweiz|zurich|austria|österreich|vienna|wien|spain|spanien|madrid|italy|italien|rome|rom|usa|united states|canada|poland|polen|warsaw|warszawa)\b/i.test(locationText);
}

async function searchArbeitnow(profile) {
    const response = await fetch(ARBEITNOW_API_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Arbeitnow antwortete mit HTTP ${response.status}.`);
    const payload = await response.json();
    const jobs = Array.isArray(payload.data) ? payload.data : [];
    return {
        jobs: jobs.map(normalizeArbeitnowJob).filter(job => job.company && job.position && job.url && isGermanArbeitnowJob(job)),
        rawCount: jobs.length,
        invalidCount: 0,
        detailsFetchedCount: 0,
        detailsFailedCount: 0
    };
}

export default {
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

        if (request.method !== "POST") {
            return jsonResponse({ error: "Nur POST wird unterstützt." }, 405, origin);
        }

        if (isRateLimited(request)) {
            return jsonResponse({ error: "Zu viele Suchanfragen. Bitte in einigen Minuten erneut versuchen." }, 429, origin);
        }

        try {
            const profile = await request.json();
            const validationError = validateProfile(profile);
            if (validationError) return jsonResponse({ error: validationError }, 400, origin);

            const providers = [
                { name: "Bundesagentur für Arbeit", search: () => searchBundesagentur(profile, env) },
                { name: "Arbeitnow", search: () => searchArbeitnow(profile) }
            ];
            const results = await Promise.allSettled(providers.map(provider => provider.search()));
            const successfulResults = results
                .map((result, index) => ({ result, provider: providers[index] }))
                .filter(item => item.result.status === "fulfilled");
            const errors = results
                .map((result, index) => ({ result, provider: providers[index] }))
                .filter(item => item.result.status === "rejected")
                .map(item => ({
                    source: item.provider.name,
                    message: item.result.reason instanceof Error ? item.result.reason.message : "Unbekannter Fehler bei einer Jobquelle."
                }));
            const jobs = successfulResults.flatMap(item => item.result.value.jobs);
            return jsonResponse({
                source: "Bundesagentur für Arbeit + Arbeitnow",
                jobs,
                rawCount: successfulResults.reduce((sum, item) => sum + item.result.value.rawCount, 0),
                invalidCount: successfulResults.reduce((sum, item) => sum + item.result.value.invalidCount, 0),
                detailsFetchedCount: successfulResults.reduce((sum, item) => sum + item.result.value.detailsFetchedCount, 0),
                detailsFailedCount: successfulResults.reduce((sum, item) => sum + item.result.value.detailsFailedCount, 0),
                providers: successfulResults.map(item => ({
                    source: item.provider.name,
                    rawCount: item.result.value.rawCount,
                    normalizedCount: item.result.value.jobs.length
                })),
                errors
            }, successfulResults.length ? 200 : 502, origin);
        } catch (error) {
            return jsonResponse({
                source: "Bundesagentur für Arbeit",
                jobs: [],
                errors: [{ message: error instanceof Error ? error.message : "Unbekannter API-Fehler." }]
            }, 502, origin);
        }
    }
};
