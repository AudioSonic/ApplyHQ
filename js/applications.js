/* Verarbeitung der Daten */
const applications = [];
let applicationId = 0;

function addApplication(){
        applications.push({
        id: applicationId,
        company: applicationCompany.value.trim(),
        position: applicationPosition.value.trim(),
        date: applicationDate.value,
        status: applicationStatus.value,
        notes: applicationNotes.value,
        logo: null
    });

    saveApplications();
    renderApplications();

    applicationId++;
    console.log(applications);
}

function deleteApplication(){

}

function changeStatus(){

}

function getApplicationById(){

}


