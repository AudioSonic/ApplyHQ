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

function normalizeSearchText(value) {
    return String(value || "").trim().toLocaleLowerCase("de-DE");
}

function getSearchKeywords(profile) {
    return Array.isArray(profile.searchTerms)
        ? profile.searchTerms.map(normalizeSearchText).filter(Boolean)
        : [];
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
    return !profile.lastSearch || job.publishedAt > profile.lastSearch;
}

function getKeywordMatch(job, profile) {
    const keywords = getSearchKeywords(profile);
    if (keywords.length === 0) {
        return { matchedKeywords: [], requiredKeywords: 0, isMatch: true, score: 0 };
    }

    const searchableText = normalizeSearchText([
        job.position,
        job.company,
        ...(job.keywords || [])
    ].join(" "));
    const matchedKeywords = keywords.filter(keyword => searchableText.includes(keyword));
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
    const isLocationMatch = isRemoteMatch || distance === 0 || (distance !== null && distance <= Number(profile.radius));
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

function isSameCompanyAndPosition(application, job) {
    return normalizeDuplicateValue(application.company) === normalizeDuplicateValue(job.company)
        && normalizeDuplicateValue(application.position) === normalizeDuplicateValue(job.position);
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

function getAutomaticApplicationData(job) {
    return {
        company: job.company,
        position: job.position,
        city: job.city,
        state: job.state,
        date: "",
        status: "open",
        tag: normalizeSearchText(job.position).includes("junior") ? "junior" : "-",
        url: job.url,
        notes: ""
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
            setTimeout(() => showSearchConfirmation(modal, profile, { newJobs: [], duplicates: [], checkedCount: 0, errors: [{ message: error.message }] }, startedAt), 350);
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

    evaluatedJobs.forEach(job => {
        const classification = classifySearchJob(job, referenceDate);
        (classification.status === "new" ? newJobs : duplicates).push({ ...job, ...classification });
    });

    return { newJobs, duplicates, checkedCount: jobs.filter(job => isJobNewSinceLastSearch(job, profile)).length, errors: [] };
}

async function fetchJobsFromBackend(profile) {
    const response = await fetch(configuredJobSearchApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
    });
    const payload = await response.json();
    if (!response.ok || (Array.isArray(payload.errors) && payload.errors.length)) {
        throw new Error(payload.errors?.[0]?.message || `Backend antwortete mit HTTP ${response.status}.`);
    }
    return Array.isArray(payload.jobs) ? payload.jobs : [];
}

async function runSearchProfile(profile, referenceDate) {
    const jobs = configuredJobSearchApiUrl
        ? await fetchJobsFromBackend(profile)
        : mockJobSource;
    return evaluateJobs(profile, jobs, referenceDate);
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
    details.textContent = result.errors?.length
        ? `Die Suche konnte nicht vollständig ausgeführt werden: ${result.errors[0].message}`
        : `${result.duplicates.length} bereits bekannte Stelle(n) wurden übersprungen.`;
    summary.append(text, details);
    modal.content.append(summary);

    const confirmButton = document.createElement("button");
    confirmButton.className = "button button-primary";
    confirmButton.type = "button";
    confirmButton.textContent = result.newJobs.length ? "Stellen übernehmen" : "Schließen";
    confirmButton.onclick = () => {
        if (result.newJobs.length) importSearchJobs(result.newJobs);
        if (!result.errors?.length) finishSearchProfileSearch(profile, result.newJobs.length, searchedAt);
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
