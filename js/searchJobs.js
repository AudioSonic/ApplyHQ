/* Phase 1: lokale Suchlauf-Logik mit austauschbarer Mock-Jobquelle. */

const mockJobSource = [
    { id: "mock-1", company: "Webwerk GmbH", position: "Junior Frontend Entwickler (m/w/d)", city: "Leipzig", state: "Sachsen", remote: true, employmentType: "full-time", keywords: ["html", "css", "javascript"], publishedAt: "2026-08-22", url: "https://example.com/jobs/mock-1" },
    { id: "mock-2", company: "Elbe Software AG", position: "Softwareentwickler Web (m/w/d)", city: "Dresden", state: "Sachsen", remote: false, employmentType: "full-time", keywords: ["software", "entwicklung", "web", "javascript"], publishedAt: "2026-08-23", url: "https://example.com/jobs/mock-2" },
    { id: "mock-3", company: "Nordlicht Digital", position: "Frontend Developer (m/w/d)", city: "Berlin", state: "Berlin", remote: true, employmentType: "full-time", keywords: ["html", "css", "react"], publishedAt: "2026-08-21", url: "https://example.com/jobs/mock-3" },
    { id: "mock-4", company: "Sachsen IT Services", position: "Webentwickler (m/w/d)", city: "Chemnitz", state: "Sachsen", remote: false, employmentType: "part-time", keywords: ["html", "css", "entwicklung"], publishedAt: "2026-08-23", url: "https://example.com/jobs/mock-4" },
    { id: "mock-5", company: "Rheinland Systems", position: "Backend Entwickler (m/w/d)", city: "Köln", state: "Nordrhein-Westfalen", remote: false, employmentType: "full-time", keywords: ["java", "spring", "software"], publishedAt: "2026-08-22", url: "https://example.com/jobs/mock-5" }
];

const mockCityCoordinates = {
    berlin: [52.52, 13.405],
    chemnitz: [50.8278, 12.9214],
    dresden: [51.0504, 13.7373],
    leipzig: [51.3397, 12.3731],
    koeln: [50.9375, 6.9603],
    "köln": [50.9375, 6.9603],
    deutschland: [51.1657, 10.4515]
};

const configuredJobSearchApiUrl = typeof window !== "undefined" ? window.APPLYHQ_JOB_SEARCH_API_URL || "" : "";

// Bewusst kuratierte Varianten für häufige Begriffe aus der Softwareentwicklung.
// Die Schlüssel sind kanonische Suchbegriffe; die Werte enthalten nur fachlich
// nahe Schreib- und Sprachvarianten, keine allgemeine Volltext-Synonymik.
const softwareDevelopmentSynonyms = {
    html: ["html", "html5"],
    css: ["css", "css3"],
    javascript: ["javascript", "java script", "js", "ecmascript"],
    typescript: ["typescript", "type script", "ts"],
    react: ["react", "react.js", "reactjs"],
    vue: ["vue", "vue.js", "vuejs"],
    angular: ["angular", "angular.js", "angularjs"],
    nodejs: ["nodejs", "node.js", "node js"],
    php: ["php", "php 8"],
    csharp: ["c#", "c sharp", "csharp"],
    dotnet: [".net", "dotnet", "dot net"],
    java: ["java", "java ee", "jakarta ee"],
    python: ["python", "python 3"],
    sql: ["sql", "t-sql", "tsql"],
    frontend: ["frontend", "front-end", "front end"],
    backend: ["backend", "back-end", "back end"],
    fullstack: ["fullstack", "full-stack", "full stack"],
    webentwicklung: ["webentwicklung", "web-entwicklung", "web entwicklung", "web development"],
    webentwickler: ["webentwickler", "web-entwickler", "web entwickler", "web developer"],
    softwareentwicklung: [
        "softwareentwicklung",
        "software-entwicklung",
        "software entwicklung",
        "softwareentwickler",
        "software-entwickler",
        "software entwickler",
        "software developer"
    ],
    softwareentwickler: [
        "softwareentwicklung",
        "software-entwicklung",
        "software entwicklung",
        "softwareentwickler",
        "software-entwickler",
        "software entwickler",
        "software developer"
    ],
    softwaredeveloper: [
        "softwareentwicklung",
        "software-entwicklung",
        "software entwicklung",
        "softwareentwickler",
        "software-entwickler",
        "software entwickler",
        "software developer"
    ],
    softwareengineer: ["software engineer", "software-engineer", "softwareingenieur"]
};

function normalizeSearchText(value) {
    return String(value || "").trim().toLocaleLowerCase("de-DE");
}

function isNationwideLocation(value) {
    const location = normalizeSearchText(value);
    return !location || /^(deutschland|bundesweit|ganz deutschland)$/.test(location);
}

function getSearchKeywords(profile) {
    return Array.isArray(profile.searchTerms)
        ? profile.searchTerms.map(normalizeSearchText).filter(Boolean)
        : [];
}

function getKeywordVariants(keyword) {
    const normalizedKeyword = normalizeSearchText(keyword);
    const compactKeyword = normalizedKeyword.replace(/[\s-]+/g, "");
    const variants = softwareDevelopmentSynonyms[normalizedKeyword]
        || softwareDevelopmentSynonyms[compactKeyword]
        || [normalizedKeyword];
    return [...new Set(variants.map(normalizeSearchText).filter(Boolean))];
}

function getDistanceBetweenCities(firstCity, secondCity) {
    const first = mockCityCoordinates[normalizeSearchText(firstCity)];
    const second = mockCityCoordinates[normalizeSearchText(secondCity)];

    if (!first || !second) {
        return normalizeSearchText(firstCity) === normalizeSearchText(secondCity) ? 0 : null;
    }

    const toRadians = degrees => degrees * Math.PI / 180;
    const latitudeDifference = toRadians(second[0] - first[0]);
    const longitudeDifference = toRadians(second[1] - first[1]);
    const latitude = toRadians(first[0]);
    const secondLatitude = toRadians(second[0]);
    const value = Math.sin(latitudeDifference / 2) ** 2
        + Math.cos(latitude) * Math.cos(secondLatitude) * Math.sin(longitudeDifference / 2) ** 2;

    return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function isJobNewSinceLastSearch(job, profile) {
    return !profile.lastSearch || !job.publishedAt || job.publishedAt > profile.lastSearch;
}

function getKeywordMatch(job, profile) {
    const keywords = getSearchKeywords(profile);
    if (keywords.length === 0) {
        return { matchedKeywords: [], requiredKeywords: 0, isMatch: true, score: 0 };
    }

    const searchableText = normalizeSearchText([
        job.position,
        job.company,
        job.description,
        ...(job.keywords || [])
    ].join(" "));
    const matchedKeywords = keywords.filter(keyword =>
        getKeywordVariants(keyword).some(variant => searchableText.includes(variant))
    );
    const requiredKeywords = Math.ceil(keywords.length / 2);

    return {
        matchedKeywords,
        requiredKeywords,
        isMatch: matchedKeywords.length >= requiredKeywords,
        score: matchedKeywords.length / keywords.length
    };
}

function evaluateSearchJob(job, profile) {
    const distance = getDistanceBetweenCities(profile.location, job.city);
    const isRemoteMatch = Boolean(profile.remote && job.remote);
    const isNationwideMatch = isNationwideLocation(profile.location);
    const isLocationMatch = isNationwideMatch || isRemoteMatch || distance === 0 || (distance !== null && distance <= Number(profile.radius));
    const keywordMatch = getKeywordMatch(job, profile);
    const employmentMatch = !profile.employmentType || !job.employmentType || profile.employmentType === job.employmentType;

    return {
        ...job,
        distance,
        isRemoteMatch,
        isLocationMatch,
        employmentMatch,
        ...keywordMatch,
        isMatch: isLocationMatch && keywordMatch.isMatch
    };
}

function normalizeDuplicateValue(value) {
    return normalizeSearchText(value).replace(/[^a-z0-9äöüß]+/gi, " ").trim();
}

function normalizePositionForDuplicate(value, city = "") {
    let normalized = normalizeSearchText(value);
    if (normalized.includes(":")) normalized = normalized.slice(normalized.indexOf(":") + 1);
    normalized = normalized.replace(/\([^)]*(?:m|w|d|f)[^)]*\)/gi, "");
    const normalizedCity = normalizeSearchText(city);
    if (normalizedCity) normalized = normalized.replace(new RegExp(`\\s+in\\s+${normalizedCity.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*$`, "i"), "");
    return normalizeDuplicateValue(normalized);
}

function isSameCompanyAndPosition(application, job) {
    return normalizeDuplicateValue(application.company) === normalizeDuplicateValue(job.company)
        && normalizePositionForDuplicate(application.position, application.city) === normalizePositionForDuplicate(job.position, job.city);
}

function isWithinSixMonths(dateValue, referenceDate = new Date()) {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;
    const cutoff = new Date(referenceDate);
    cutoff.setMonth(cutoff.getMonth() - 6);
    return date >= cutoff;
}

function classifySearchJob(job, referenceDate = new Date()) {
    const sameExternalId = applications.some(application => application.externalId && job.externalId && application.externalId === job.externalId);
    if (sameExternalId) return { status: "duplicate", reason: "Diese Stelle wurde bereits gefunden." };
    const sameUrl = applications.some(application => application.url && application.url === job.url);
    if (sameUrl) return { status: "duplicate", reason: "Diese Stelle wurde bereits gefunden." };

    const sameCompanyAndPosition = applications.find(application => isSameCompanyAndPosition(application, job));
    if (sameCompanyAndPosition && isWithinSixMonths(sameCompanyAndPosition.date, referenceDate)) {
        return { status: "duplicate", reason: `Diese Stelle wurde bereits am ${formatSearchDate(sameCompanyAndPosition.date)} gefunden.` };
    }

    return { status: "new", reason: "" };
}

function formatSearchDate(dateValue) {
    if (!dateValue) return "unbekannten Datum";
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? "unbekannten Datum" : date.toLocaleDateString("de-DE");
}

function cleanJobDescription(value) {
    return String(value || "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p\s*>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n+/g, "\n\n")
        .trim();
}

function getAutomaticApplicationData(job) {
    return {
        company: job.company,
        position: job.position,
        contactName: job.contactName || job.contact || "",
        description: cleanJobDescription(job.description),
        details: "",
        city: job.city,
        state: job.state,
        date: "",
        status: "open",
        tag: normalizeSearchText(job.position).includes("junior") ? "junior" : "-",
        url: job.url,
        notes: "",
        externalId: job.externalId,
        source: job.source,
        publishedAt: job.publishedAt
    };
}

function startSearchProfileSearch(profile) {
    if (!profile || profile.active === false) return;

    const modal = createModal();
    modal.title.textContent = "Jobsuche läuft";
    modal.container.classList.add("search-run-modal");
    modal.content.append(createSearchLoadingContent());

    const statusText = modal.content.querySelector("[data-search-status]");
    const startedAt = new Date();
    const updateStatus = text => { if (statusText) statusText.textContent = text; };

    updateStatus("Suchprofil wird vorbereitet …");
    setTimeout(() => {
        updateStatus("Neue Stellen werden abgerufen …");
        runSearchProfile(profile, startedAt).then(result => {
            updateStatus(`Suche abgeschlossen. Es wurden ${result.newJobs.length} Stellen gefunden.`);
            setTimeout(() => showSearchConfirmation(modal, profile, result, startedAt), 350);
        }).catch(error => {
            updateStatus(`Suche fehlgeschlagen: ${error.message}`);
            setTimeout(() => showSearchConfirmation(modal, profile, { newJobs: [], duplicates: [], checkedCount: 0, errors: [{ message: error.message }], fatalError: true }, startedAt), 350);
        });
    }, 350);
}

function createSearchLoadingContent() {
    const content = document.createElement("div");
    content.className = "search-run-content";
    const spinner = document.createElement("div");
    spinner.className = "search-run-spinner";
    spinner.setAttribute("aria-label", "Suche läuft");
    spinner.setAttribute("role", "status");
    const status = document.createElement("p");
    status.dataset.searchStatus = "true";
    status.textContent = "Suche wird vorbereitet …";
    content.append(spinner, status);
    return content;
}

function evaluateJobs(profile, jobs, referenceDate) {
    const evaluatedJobs = jobs
        .filter(job => isJobNewSinceLastSearch(job, profile))
        .map(job => evaluateSearchJob(job, profile))
        .filter(job => job.isMatch)
        .sort((first, second) => second.score - first.score);
    const newJobs = [];
    const duplicates = [];
    const matchedBySource = {};
    const newBySource = {};
    const duplicateBySource = {};

    evaluatedJobs.forEach(job => {
        const source = job.source || "Unbekannte Quelle";
        matchedBySource[source] = (matchedBySource[source] || 0) + 1;
        const classification = classifySearchJob(job, referenceDate);
        const target = classification.status === "new" ? newJobs : duplicates;
        const sourceCounts = classification.status === "new" ? newBySource : duplicateBySource;
        target.push({ ...job, ...classification });
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    return { newJobs, duplicates, checkedCount: jobs.filter(job => isJobNewSinceLastSearch(job, profile)).length, matchedBySource, newBySource, duplicateBySource, errors: [] };
}

async function fetchJobsFromBackend(profile) {
    const response = await fetch(configuredJobSearchApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
    });
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload.errors?.[0]?.message || payload.error || `Backend antwortete mit HTTP ${response.status}.`);
    }
    if (!Array.isArray(payload.jobs)) throw new Error("Backend lieferte kein gültiges Stellenformat.");
    return payload;
}

async function runSearchProfile(profile, referenceDate) {
    if (!configuredJobSearchApiUrl) return evaluateJobs(profile, mockJobSource, referenceDate);
    const payload = await fetchJobsFromBackend(profile);
    const result = evaluateJobs(profile, payload.jobs, referenceDate);
    result.source = payload.source || "Backend";
    result.rawCount = payload.rawCount ?? payload.jobs.length;
    result.invalidCount = payload.invalidCount || 0;
    result.detailsFetchedCount = payload.detailsFetchedCount || 0;
    result.detailsFailedCount = payload.detailsFailedCount || 0;
    result.oldCount = payload.oldCount || 0;
    result.errors = Array.isArray(payload.errors) ? payload.errors : [];
    result.providers = Array.isArray(payload.providers) ? payload.providers : [];
    return result;
}

function runLocalSearch(profile, referenceDate) {
    return evaluateJobs(profile, mockJobSource, referenceDate);
}

function showSearchConfirmation(modal, profile, result, searchedAt) {
    modal.title.textContent = "Suchlauf abgeschlossen";
    modal.content.replaceChildren();
    const summary = document.createElement("div");
    summary.className = "search-confirmation-content";
    const text = document.createElement("p");
    text.textContent = `Suche abgeschlossen. Es wurden ${result.newJobs.length} Stellen gefunden.`;
    const details = document.createElement("p");
    details.className = "search-confirmation-details";
    const providerStats = result.providers?.length
        ? ` · ${result.providers.map(provider => `${provider.source}: ${provider.normalizedCount}`).join(" · ")}`
        : "";
    const partialErrors = result.errors?.length ? ` · Hinweis: ${result.errors.map(error => `${error.source}: ${error.message}`).join("; ")}` : "";
    const matchedStats = Object.entries(result.matchedBySource || {}).map(([source, count]) => `${source}: ${count} passend`).join(" · ");
    details.textContent = `${result.checkedCount} geprüft · ${result.duplicates.length} bereits bekannt · ${result.oldCount || 0} alte Stelle(n) übersprungen · ${result.invalidCount || 0} unvollständig übersprungen${result.detailsFetchedCount ? ` · ${result.detailsFetchedCount} Detailbeschreibungen ausgewertet` : ""}${providerStats}${matchedStats ? ` · ${matchedStats}` : ""}${partialErrors}.`;
    summary.append(text, details);
    if ([...(result.newJobs || []), ...(result.duplicates || [])].some(job => job.source === "Arbeitnow")) {
        const attribution = document.createElement("p");
        attribution.className = "search-confirmation-attribution";
        const link = document.createElement("a");
        link.href = "https://www.arbeitnow.com";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Stellendaten teilweise von Arbeitnow";
        attribution.append(link);
        summary.append(attribution);
    }
    modal.content.append(summary);

    const confirmButton = document.createElement("button");
    confirmButton.className = "button button-primary";
    confirmButton.type = "button";
    confirmButton.textContent = result.newJobs.length ? "Stellen übernehmen" : "Schließen";
    confirmButton.onclick = () => {
        if (result.newJobs.length) importSearchJobs(result.newJobs);
        if (!result.fatalError) finishSearchProfileSearch(profile, result.newJobs.length, searchedAt);
        closeModal(modal.container);
    };
    modal.footer.append(confirmButton);
}

function importSearchJobs(jobs) {
    jobs.forEach(job => addApplication(getAutomaticApplicationData(job)));
}

function finishSearchProfileSearch(profile, newJobCount, searchedAt) {
    profile.lastSearch = searchedAt.toISOString().slice(0, 10);
    profile.newJobs = newJobCount;
    saveSearchProfiles();
    renderSearchProfiles();
}
