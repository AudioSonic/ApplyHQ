const ALLOWED_ORIGIN = "*";
const BA_API_BASE_URL = "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service";
const BA_API_KEY = "jobboerse-jobsuche";

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
    return configuredOrigin === "*" || configuredOrigin === requestOrigin ? configuredOrigin : "null";
}

function normalizeText(value) {
    return String(value || "").trim();
}

function getSearchTerm(profile) {
    const terms = Array.isArray(profile.searchTerms)
        ? profile.searchTerms.map(normalizeText).filter(Boolean)
        : [];
    return terms.join(" ") || normalizeText(profile.position);
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
    return getFirstValue(
        job.veroeffentlichungsdatum,
        job.aktuelleVeroeffentlichungsdatum,
        job.datumErsteVeroeffentlichung,
        job.onlineSeit,
        job.online_seit,
        job.publishedAt
    );
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
        city,
        state,
        remote: Boolean(job.homeofficemoeglich) || /remote|homeoffice|home-office|mobiles arbeiten/i.test(JSON.stringify(job)),
        employmentType: getFirstValue(job.arbeitszeit, job.beschaeftigungsart, job.employmentType),
        publishedAt: getPublishedAt(job),
        url: url || (reference ? `https://jobboerse.arbeitsagentur.de/vamJB/stellenangebot/${encodeURIComponent(reference)}` : ""),
        source: "Bundesagentur für Arbeit"
    };
}

function buildSearchUrl(profile) {
    const url = new URL(`${BA_API_BASE_URL}/pc/v6/jobs`);
    url.searchParams.set("was", getSearchTerm(profile));
    url.searchParams.set("wo", normalizeText(profile.location));
    url.searchParams.set("umkreis", String(Number(profile.radius) || 0));
    url.searchParams.set("page", "1");
    url.searchParams.set("size", "100");
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
    return Array.isArray(jobs) ? jobs.map(normalizeJob).filter(job => job.company && job.position) : [];
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

        try {
            const profile = await request.json();
            if (!profile || !normalizeText(profile.location)) {
                return jsonResponse({ error: "Ein Suchprofil mit Standort ist erforderlich." }, 400, origin);
            }

            const jobs = await searchBundesagentur(profile, env);
            return jsonResponse({ source: "Bundesagentur für Arbeit", jobs, errors: [] }, 200, origin);
        } catch (error) {
            return jsonResponse({
                source: "Bundesagentur für Arbeit",
                jobs: [],
                errors: [{ message: error instanceof Error ? error.message : "Unbekannter API-Fehler." }]
            }, 502, origin);
        }
    }
};
