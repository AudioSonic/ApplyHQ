
const applicationCompany = document.getElementById("application-company");
const applicationPosition = document.getElementById("application-position");
const applicationCity = document.getElementById("application-city");
const applicationState = document.getElementById("application-state");
const applicationDate = document.getElementById("application-date");
const applicationStatus = document.getElementById("application-status");
const applicationNotes = document.getElementById("application-notes");
const applicationForm = document.getElementById("new-application");
const applicationSort = document.getElementById("application-sort");
const applicationButton = document.getElementById("open-application-modal-button");

applicationForm.addEventListener("submit", submitApplication);
applicationSort.addEventListener("change", handleSortChange);
applicationCompany.addEventListener("input", clearApplicationValidation);
applicationPosition.addEventListener("input", clearApplicationValidation);
applicationButton.addEventListener("click", openApplicationModal);

init();

function submitApplication(event){
    event.preventDefault();

    if(!validateApplicationForm()){
        return;
    }

    const applicationData = getApplicationFormData();
    addApplication(applicationData);
    resetApplicationForm();
}

function init(){
    setDefaultApplicationDate();
    loadApplications();
}

function getApplicationFormData(){
    return {
        company: applicationCompany.value.trim(),
        position: applicationPosition.value.trim(),
        city: applicationCity.value.trim(),
        state: applicationState.value.trim(),
        date: applicationDate.value,
        status: applicationStatus.value,
        notes: applicationNotes.value.trim()
    };
}

function validateApplicationForm(){
    clearApplicationValidation();

    if(applicationCompany.value.trim().length < 2){
        applicationCompany.setCustomValidity("Bitte gib ein Unternehmen mit mindestens 2 Zeichen ein.");
    }

    if(applicationPosition.value.trim().length < 2){
        applicationPosition.setCustomValidity("Bitte gib eine Stellenbezeichnung mit mindestens 2 Zeichen ein.");
    }

    return applicationForm.reportValidity();
}

function clearApplicationValidation(){
    applicationCompany.setCustomValidity("");
    applicationPosition.setCustomValidity("");
}

function resetApplicationForm(){
    applicationForm.reset();
    clearApplicationValidation();
    setDefaultApplicationDate();
    applicationCompany.focus();
}

function setDefaultApplicationDate(){
    const today = new Date().toISOString().split("T")[0];
    applicationDate.max = today;
    applicationDate.value = today;
}

function handleSortChange(){
    sortApplications(applicationSort.value);
    renderApplications();
}

function openApplicationModal(){
    createModal();
}