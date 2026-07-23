let applicationSort = null;
let applicationFilter = null;
let applicationButton = null;

const uiState = {
    search: "",
    filter: "all",
    sort: "newest"
};

document.addEventListener("DOMContentLoaded", () => {
    bindNavigation();
    loadDashboard();
});

function bindNavigation() {
    document.querySelectorAll("[data-action]").forEach((navigationButton) => {
        navigationButton.addEventListener("click", handleNavigationClick);
    });
}

function handleNavigationClick(event) {
    const navigationButton = event.currentTarget;
    const action = navigationButton.dataset.action;

    event.preventDefault();
    setActiveNavigationButton(navigationButton);
    closeMobileSidebar();

    switch(action){
        case "loadDashboard":
        loadDashboard();
        break;
        case "loadSettings":
        loadSettings();
        break;
    }
}

function setActiveNavigationButton(activeButton) {
    document.querySelectorAll(".navbar-button").forEach((button) => {
        button.classList.toggle("is-active", button === activeButton);
    });
}

function closeMobileSidebar() {
    const sidebarToggle = document.getElementById("sidebar-toggle");

    if(sidebarToggle){
        sidebarToggle.checked = false;
    }
}

function bindApplicationControls() {
    applicationSort = document.getElementById("application-sort");
    applicationFilter = document.getElementById("application-filter");
    applicationButton = document.getElementById("open-application-modal-button");

    if(applicationButton){
        applicationButton.addEventListener("click", () => openApplicationModal());
    }

    if(applicationSort){
        applicationSort.value = uiState.sort;
        applicationSort.addEventListener("change", handleSortChange);
    }

    if(applicationFilter){
        applicationFilter.value = uiState.filter;
        applicationFilter.addEventListener("change", handleFilterChange);
    }
}

function submitApplication(event) {
    event.preventDefault();

    const applicationForm = event.currentTarget;

    if(!validateApplicationForm(applicationForm)){
        return;
    }

    const applicationData = getApplicationFormData(applicationForm);
    addApplication(applicationData);
    closeModal(applicationForm.closest(".modal-container"));
}

function getApplicationFormData(applicationForm) {
    return {
        company: getFormValue(applicationForm, "#application-company"),
        position: getFormValue(applicationForm, "#application-position"),
        city: getFormValue(applicationForm, "#application-city"),
        state: getFormValue(applicationForm, "#application-state"),
        date: getFormValue(applicationForm, "#application-date"),
        status: getFormValue(applicationForm, "#application-status"),
        tag: getFormValue(applicationForm, "#application-tag"),
        url: getFormValue(applicationForm, "#application-url"),
        notes: getFormValue(applicationForm, "#application-notes")
    };
}

function getFormValue(applicationForm, selector) {
    const field = applicationForm.querySelector(selector);
    return field ? field.value.trim() : "";
}

function validateApplicationForm(applicationForm) {
    const applicationCompany = applicationForm.querySelector("#application-company");
    const applicationPosition = applicationForm.querySelector("#application-position");

    clearApplicationValidation(applicationForm);

    if(applicationCompany.value.trim().length < 2){
        applicationCompany.setCustomValidity("Bitte gib ein Unternehmen mit mindestens 2 Zeichen ein.");
    }

    if(applicationPosition.value.trim().length < 2){
        applicationPosition.setCustomValidity("Bitte gib eine Stellenbezeichnung mit mindestens 2 Zeichen ein.");
    }

    return applicationForm.reportValidity();
}

function clearApplicationValidation(eventOrForm) {
    const applicationForm = eventOrForm.currentTarget ? eventOrForm.currentTarget.form : eventOrForm;

    applicationForm.querySelector("#application-company").setCustomValidity("");
    applicationForm.querySelector("#application-position").setCustomValidity("");
}

function setDefaultApplicationDate(applicationDate) {
    const today = new Date().toISOString().split("T")[0];
    applicationDate.max = today;
    applicationDate.value = today;
}

function handleSortChange() {
    uiState.sort = applicationSort.value;
    renderApplications();
}

function handleFilterChange() {
    uiState.filter = applicationFilter.value;
    renderApplications();
}

function openApplicationModal(application = null) {
    const modal = createModal();
    const content = createApplicationModal(application);
    modal.title.textContent = application ? "Bewerbung bearbeiten" : "Neue Bewerbung anlegen";
    modal.content.append(content);
}
