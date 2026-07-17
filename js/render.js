/* Darstellung der Inhalte */
const applicationList = document.getElementById("application-list");
const emptyState = document.querySelector(".empty-state");
const applicationCount = document.getElementById("application-count");
const overviewOpen = document.getElementById("overview-open");
const overviewApplied= document.getElementById("overview-applied");
const overviewInterview = document.getElementById("overview-interviews");
const overviewRejections = document.getElementById("overview-rejections");
const overviewAccepted = document.getElementById("overview-accepted");

const statusLabels = {
    open: "Offen",
    applied: "Beworben",
    interview: "Interview",
    rejected: "Absage",
    accepted: "Zusage"
};

function renderApplications(){
    checkForEmptyState();
    applicationList.replaceChildren();
    applicationCount.textContent = applications.length;
    sortApplications(applicationSort.value);

    applications.forEach((application) => {
        createApplicationCard(application);
    });
    updateDashboard();
}

function createApplicationCard(application){
    const applicationCard = document.createElement("article");
    const logoFrame = document.createElement("div");
    const companyName = document.createElement("h3");
    const position = document.createElement("p");
    const location = document.createElement("p");
    const status = document.createElement("span");
    const dateRow = document.createElement("div");
    const applicationDate = document.createElement("p");
    const notes = document.createElement("p");
    const logo = document.createElement("img");
    const logoFallback = document.createElement("span");
    const calendarIcon = document.createElement("img");
    const information = document.createElement("div");
    const deleteButton = document.createElement("button");
    const statusAndDelete = document.createElement("div");
    const deleteButtonIcon = document.createElement("img");
    
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
    status.classList.add("status-badge", `status-${application.status}`);
    statusAndDelete.classList.add("status-and-delete");
    deleteButton.type = "button";
    deleteButton.setAttribute("aria-label", `Bewerbung von ${application.company} löschen`);
    deleteButtonIcon.src = "assets/icons/icon_delete.svg";
    deleteButtonIcon.alt = "";
    deleteButton.classList.add("icon-button");

    if(application.logo){
        logo.src = application.logo;
        logo.alt = `${application.company} Logo`;
        logoFrame.appendChild(logo);
    }
    else{
        logoFrame.appendChild(logoFallback);
    }

    deleteButton.addEventListener("click", () => {deleteApplication(application.id)});

    deleteButton.appendChild(deleteButtonIcon);
    dateRow.appendChild(calendarIcon);
    dateRow.appendChild(applicationDate);

    information.appendChild(companyName);
    information.appendChild(position);

    if(location.textContent){
        information.appendChild(location);
    }

    information.appendChild(dateRow);
    information.appendChild(notes);

    statusAndDelete.appendChild(status);
    statusAndDelete.appendChild(deleteButton);

    applicationCard.appendChild(logoFrame);
    applicationCard.appendChild(information);
    applicationCard.appendChild(statusAndDelete);

    applicationList.appendChild(applicationCard);
}

function formatApplicationDate(date){
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

function formatApplicationLocation(application){
    return [application.city, application.state]
        .filter(Boolean)
        .join(" - ");
}

function getCompanyInitials(company){
    const initials = company
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase();

    return initials || "?";
}

function checkForEmptyState(){
    if(applications.length === 0){
        emptyState.style.display = "flex";
    }
    else{
        emptyState.style.display = "none";
    }
}

function updateDashboard(){
    overviewOpen.textContent = countApplicationsByStatus("open");
    overviewApplied.textContent = countApplicationsByStatus("applied");
    overviewInterview.textContent = countApplicationsByStatus("interview");
    overviewRejections.textContent = countApplicationsByStatus("rejected");
    overviewAccepted.textContent = countApplicationsByStatus("accepted");
}

function countApplicationsByStatus(status){
    return applications.filter(application => application.status === status).length;
}

