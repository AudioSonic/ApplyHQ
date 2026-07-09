
const applicationCompany = document.getElementById("application-company");
const applicationPosition = document.getElementById("application-position");
const applicationDate = document.getElementById("application-date");
const applicationStatus = document.getElementById("application-status");
const applicationNotes = document.getElementById("application-notes");
const applicationForm = document.getElementById("new-application");



applicationForm.addEventListener("submit", submitApplication)

function submitApplication(event){
    event.preventDefault();
    addApplication();
    applicationForm.reset();
}

function init(){
    loadApplications();
}