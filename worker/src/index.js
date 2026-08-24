const ALLOWED_ORIGIN = "*";
const BA_API_BASE_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const BA_API_KEY = "jobboerse-jobsuche";
const ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api";
const rateLimitBuckets = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const MAX_DETAIL_REQUESTS = 25;

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
