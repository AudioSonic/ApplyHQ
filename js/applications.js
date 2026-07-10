/* Verarbeitung der Daten */
let applications = [];
let applicationId = 0;

function addApplication(applicationData){
    applications.push({
        id: applicationId,
        company: applicationData.company,
        position: applicationData.position,
        city: applicationData.city,
        state: applicationData.state,
        date: applicationData.date,
        status: applicationData.status,
        notes: applicationData.notes,
        logo: null
    });

    applicationId++;
    saveApplications();
    renderApplications();
}

function deleteApplication(id){
    applications = applications.filter(application => application.id !== id);
    saveApplications();
    renderApplications();
}

function sortApplications(order){
    applications.sort((firstApplication, secondApplication) => {
        const firstDate = new Date(firstApplication.date).getTime();
        const secondDate = new Date(secondApplication.date).getTime();
        return order === "oldest" ? firstDate - secondDate : secondDate - firstDate;
    });
}

function getApplicationById(id){
    return applications.find(application => application.id === id);
}


