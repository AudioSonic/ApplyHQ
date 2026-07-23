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

function bindApplicationCardElements() {
    applicationList = document.getElementById("application-list");
    emptyState = document.querySelector(".empty-state");
    applicationCount = document.getElementById("application-count");
    overviewOpen = document.getElementById("overview-open");
    overviewApplied = document.getElementById("overview-applied");
    overviewInterview = document.getElementById("overview-interviews");
    overviewRejections = document.getElementById("overview-rejections");
    overviewAccepted = document.getElementById("overview-accepted");
}

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
}

function getVisibleApplications() {
    const searchValue = uiState.search.trim().toLowerCase();

    const filteredApplications = applications.filter(application => {
        const company = (application.company || "").toLowerCase();
        const position = (application.position || "").toLowerCase();
        const matchesSearch = !searchValue || company.includes(searchValue) || position.includes(searchValue);
        const matchesFilter = uiState.filter === "all" || application.status === uiState.filter;

        return matchesSearch && matchesFilter;
    });

    return sortApplications(filteredApplications, uiState.sort);
}

function createApplicationCard(application) {
    const applicationCard = document.createElement("article");
    const logoFrame = document.createElement("div");
    const companyName = document.createElement("h3");
    const position = document.createElement("p");
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
    const detailsAndOptions = document.createElement("div");
    const details = document.createElement("div");
    const options = document.createElement("div");

    companyName.textContent = application.company;
    position.textContent = application.position;
    location.textContent = formatApplicationLocation(application);
    status.textContent = statusLabels[application.status] || application.status;
    applicationDate.textContent = formatApplicationDate(application.date);
    notes.textContent = application.notes;
    logoFallback.textContent = getCompanyInitials(application.company);
    calendarIcon.src = "assets/icons/icon_calendar.svg";
    calendarIcon.alt = "";

    applicationCard.classList.add("application-card");
    logoFrame.classList.add("application-logo");
    information.classList.add("application-info");
    position.classList.add("application-position");
    location.classList.add("application-location");
    dateRow.classList.add("application-date");
    notes.classList.add("application-notes");
    detailsAndOptions.classList.add("application-actions");
    details.classList.add("application-tags");
    options.classList.add("application-buttons");
    tag.classList.add("status-badge", "tag");
    status.classList.add("status-badge", `status-${application.status}`);

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

    if(application.logo){
        logo.src = application.logo;
        logo.alt = `${application.company} Logo`;
        logoFrame.append(logo);
    }
    else{
        logoFrame.append(logoFallback);
    }

    if(application.tag && application.tag !== "-"){
        tag.textContent = application.tag;
        details.classList.add("has-tag");
        details.append(tag);
    }
    else{
        details.classList.add("no-tag");
    }

    deleteButton.addEventListener("click", () => deleteApplication(application.id));
    editButton.addEventListener("click", () => openApplicationModal(application));

    deleteButton.append(deleteButtonIcon);
    editButton.append(editButtonIcon);
    dateRow.append(calendarIcon, applicationDate);
    information.append(companyName, position);

    if(location.textContent){
        information.append(location);
    }

    information.append(dateRow, notes);
    details.append(status);
    options.append(deleteButton, editButton);
    detailsAndOptions.append(details, options);
    applicationCard.append(logoFrame, information, detailsAndOptions);
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
    return [application.city, application.state]
        .filter(Boolean)
        .join(" - ");
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
