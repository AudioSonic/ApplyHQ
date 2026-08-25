/* Darstellung der Inhalte */
let applicationList = null;
let emptyState = null;
let applicationCount = null;
let overviewOpen = null;
let overviewApplied = null;
let overviewInterview = null;
let overviewRejections = null;
let overviewAccepted = null;

const statusLabels = {
    open: "Offen",
    applied: "Beworben",
    interview: "Interview",
    rejected: "Absage",
    accepted: "Zusage"
};

const tagLabels = {
    junior: "Junior",
    initiative: "Initiativ"
};

function bindApplicationCardElements() {
    applicationList = document.getElementById("application-list");
    emptyState = document.querySelector(".empty-state");
    applicationCount = document.getElementById("application-count");
    overviewOpen = document.getElementById("overview-open");
    overviewApplied = document.getElementById("overview-applied");
    overviewInterview = document.getElementById("overview-interviews");
    overviewRejections = document.getElementById("overview-rejections");
    overviewAccepted = document.getElementById("overview-accepted");
};

function renderApplications() {
    if(!applicationList){
        bindApplicationCardElements();
    }

    if(!applicationList){
        return;
    }

    const visibleApplications = getVisibleApplications();

    checkForEmptyState(visibleApplications);
    applicationList.replaceChildren();

    if(applicationCount){
        applicationCount.textContent = visibleApplications.length;
    }

    visibleApplications.forEach((application) => {
        createApplicationCard(application);
    });

    updateDashboard();
};

function getVisibleApplications() {
    const searchValue = uiState.search.trim().toLowerCase();

    const filteredApplications = applications.filter(application => {
        const company = (application.company || "").toLowerCase();
        const position = (application.position || "").toLowerCase();
        const matchesSearch = !searchValue || company.includes(searchValue) || position.includes(searchValue);
        const matchesFilter = uiState.filter === "all"
            || (uiState.filter === "favorites" && application.favorite === true)
            || (uiState.filter === "new" && !application.date)
            || (!["all", "favorites", "new"].includes(uiState.filter) && application.status === uiState.filter);

        return matchesSearch && matchesFilter;
    });

    return sortApplications(filteredApplications, uiState.sort);
};

function createApplicationCard(application) {
    const applicationCard = document.createElement("article");
    const logoFrame = document.createElement("div");
    const logoVisual = document.createElement("div");
    const favoriteButton = document.createElement("button");
    const companyName = document.createElement("h3");
    const position = document.createElement("p");
    const locationSection = document.createElement("div");
    const location = document.createElement("p");
    const status = document.createElement("span");
    const tag = document.createElement("span");
    const dateRow = document.createElement("div");
    const applicationDate = document.createElement("p");
    const notes = document.createElement("p");
    const logo = document.createElement("img");
    const logoFallback = document.createElement("span");
    const calendarIcon = document.createElement("img");
    const information = document.createElement("div");
    const deleteButton = document.createElement("button");
    const deleteButtonIcon = document.createElement("img");
    const editButton = document.createElement("button");
    const editButtonIcon = document.createElement("img");
    const prepareButton = document.createElement("button");
    const matchingIndicator = document.createElement("span");
    const details = document.createElement("div");
    const options = document.createElement("div");
    const infoSection = document.createElement("div");
    const hr = document.createElement("hr");
    const locationIcon = document.createElement("img");

    companyName.textContent = application.company;
    position.textContent = application.position;
    location.textContent = formatApplicationLocation(application);
    status.textContent = statusLabels[application.status] || application.status;
    tag.textContent = tagLabels[application.tag] || application.tag;
    applicationDate.textContent = formatApplicationDate(application.date);
    notes.textContent = (application.notes || "").trim();
    logoFallback.textContent = getCompanyInitials(application.company);
    calendarIcon.src = "assets/icons/icon_calendar.svg";
    calendarIcon.alt = "";
    locationIcon.src = "assets/icons/icon_location.svg";
    locationIcon.alt = "";

    applicationCard.classList.add("application-card");
    logoFrame.classList.add("application-logo");
    logoVisual.classList.add("application-logo-visual");
    information.classList.add("application-info");
    information.setAttribute("role", "button");
    information.setAttribute("tabindex", "0");
    information.setAttribute("aria-label", `Details zu ${application.position} bei ${application.company} öffnen`);
    position.classList.add("application-position");
    companyName.classList.add("application-company-name");
    location.classList.add("application-location");
    dateRow.classList.add("application-date");
    notes.classList.add("application-notes");
    details.classList.add("application-tags");
    options.classList.add("application-options");
    tag.classList.add("status-badge", "tag");
    infoSection.classList.add("application-info-section");
    locationSection.classList.add("company-location-section");
    hr.classList.add("application-card-hr");
    status.classList.add("status-badge", `status-${application.status}`);

    favoriteButton.type = "button";
    favoriteButton.classList.add("favorite-button");
    favoriteButton.textContent = application.favorite ? "★" : "☆";
    favoriteButton.setAttribute("aria-label", application.favorite ? `Favorit für ${application.position} entfernen` : `${application.position} als Favorit speichern`);
    favoriteButton.setAttribute("aria-pressed", String(application.favorite === true));
    favoriteButton.addEventListener("click", event => {
        event.stopPropagation();
        application.favorite = !application.favorite;
        favoriteButton.textContent = application.favorite ? "★" : "☆";
        favoriteButton.setAttribute("aria-pressed", String(application.favorite));
        favoriteButton.setAttribute("aria-label", application.favorite ? `Favorit für ${application.position} entfernen` : `${application.position} als Favorit speichern`);
        saveApplications();
    });

    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Bewerbung von ${application.company} löschen`);
    deleteButton.classList.add("icon-button");
    deleteButtonIcon.src = "assets/icons/icon_delete.svg";
    deleteButtonIcon.alt = "";

    editButton.type = "button";
    editButton.setAttribute("aria-label", `Bewerbung von ${application.company} bearbeiten`);
    editButton.classList.add("icon-button");
    editButtonIcon.src = "assets/icons/icon_edit.svg";
    editButtonIcon.alt = "";
    prepareButton.type = "button";
    prepareButton.classList.add("button", "button-primary", "application-prepare-button");
    prepareButton.textContent = "Bewerbung erstellen";
    prepareButton.addEventListener("click", event => { event.stopPropagation(); openApplicationPreparation(application); });
    if (application.jobMatching && Number.isInteger(application.jobMatching.score)) { matchingIndicator.className = `matching-indicator matching-${application.jobMatching.score >= 80 ? "high" : application.jobMatching.score >= 60 ? "good" : application.jobMatching.score >= 40 ? "partial" : "low"}`; matchingIndicator.textContent = `${application.jobMatching.score} %`; matchingIndicator.title = `${application.jobMatching.rating}\nMuss-Anforderungen: ${application.jobMatching.requirements.mustHave.matched}/${application.jobMatching.requirements.mustHave.total}`; matchingIndicator.setAttribute("aria-label", `Passung ${application.jobMatching.score} Prozent`); }

    if(application.logo){
        logo.src = application.logo;
        logo.alt = `${application.company} Logo`;
        logoVisual.append(logo);
    }
    else{
        logoVisual.append(logoFallback);
    }

    if(application.tag && application.tag !== "-"){
        details.classList.add("has-tag");
        details.append(tag);
    }
    deleteButton.addEventListener("click", () => deleteApplication(application.id));
    editButton.addEventListener("click", () => openApplicationModal(application));
    information.addEventListener("click", () => openApplicationDetailsModal(application));
    information.addEventListener("keydown", event => {
        if(event.key === "Enter" || event.key === " "){
            event.preventDefault();
            openApplicationDetailsModal(application);
        }
    });
    [deleteButton, editButton].forEach(button => {
        button.addEventListener("click", event => event.stopPropagation());
    });

    deleteButton.append(deleteButtonIcon);
    editButton.append(editButtonIcon);
    dateRow.append(calendarIcon, applicationDate);

    if(location.textContent){
        locationSection.append(locationIcon, location);
    }

    information.append(companyName, position);

    if(location.textContent){
        information.append(locationSection);
    }

    information.append(dateRow);

    if(notes.textContent){
        information.append(notes);
    }
    options.append(deleteButton, editButton);
    details.append(status);
    if (matchingIndicator.textContent) details.append(matchingIndicator);
    details.append(prepareButton);
    logoFrame.append(logoVisual, favoriteButton);
    infoSection.append(logoFrame, information, options);

    applicationCard.append(infoSection, hr, details);
    applicationList.append(applicationCard);
}

function formatApplicationDate(date) {
    if(!date){
        return "Kein Datum";
    }

    const parsedDate = new Date(date);

    if(Number.isNaN(parsedDate.getTime())){
        return "Kein Datum";
    }

    return parsedDate.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function formatApplicationLocation(application) {
    return [application.city, formatApplicationState(application.state)]
        .filter(Boolean)
        .join(" - ");
}

function formatApplicationState(state) {
    const normalized = String(state || "").trim();
    if (!normalized) return "";

    const knownStates = {
        BADEN_WUERTTEMBERG: "Baden-Württemberg",
        BAYERN: "Bayern",
        BERLIN: "Berlin",
        BRANDENBURG: "Brandenburg",
        BREMEN: "Bremen",
        HAMBURG: "Hamburg",
        HESSEN: "Hessen",
        MECKLENBURG_VORPOMMERN: "Mecklenburg-Vorpommern",
        NIEDERSACHSEN: "Niedersachsen",
        NORDRHEIN_WESTFALEN: "Nordrhein-Westfalen",
        RHEINLAND_PFALZ: "Rheinland-Pfalz",
        SAARLAND: "Saarland",
        SACHSEN: "Sachsen",
        SACHSEN_ANHALT: "Sachsen-Anhalt",
        SCHLESWIG_HOLSTEIN: "Schleswig-Holstein",
        THUERINGEN: "Thüringen"
    };

    const key = normalized.toUpperCase().replace(/-/g, "_").replace(/\s+/g, "_");
    if (knownStates[key]) return knownStates[key];

    return normalized
        .replace(/_/g, "-")
        .toLocaleLowerCase("de-DE")
        .replace(/(^|[-\s])\p{L}/gu, character => character.toLocaleUpperCase("de-DE"));
}

function getCompanyInitials(company) {
    const initials = company
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase();

    return initials || "?";
}

function checkForEmptyState(visibleApplications) {
    if(!emptyState){
        return;
    }

    emptyState.style.display = visibleApplications.length === 0 ? "flex" : "none";
}

function updateDashboard() {
    setOverviewCount(overviewOpen, "open");
    setOverviewCount(overviewApplied, "applied");
    setOverviewCount(overviewInterview, "interview");
    setOverviewCount(overviewRejections, "rejected");
    setOverviewCount(overviewAccepted, "accepted");
}

function setOverviewCount(element, status) {
    if(element){
        element.textContent = countApplicationsByStatus(status);
    }
}

function countApplicationsByStatus(status) {
    return applications.filter(application => application.status === status).length;
}
