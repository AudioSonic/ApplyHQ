
const applicationCompany = document.getElementById("application-company");
const applicationPosition = document.getElementById("application-position");
const applicationDate = document.getElementById("application-date");
const applicationStatus = document.getElementById("application-status");
const applicationNotes = document.getElementById("application-notes");
const applicationForm = document.getElementById("new-application");

const applications = [];

applicationForm.addEventListener("submit", submitApplication)

function submitApplication(event){
    event.preventDefault();

    applications.push({
        id: null,
        company: applicationCompany.value.trim(),
        position: applicationPosition.value.trim(),
        date: applicationDate.value,
        status: applicationStatus.value,
        notes: applicationNotes.value,
        logo: null
    });

    console.log(applications);
}