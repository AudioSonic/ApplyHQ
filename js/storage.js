/* Speichern und laden von Daten */

function saveApplications(){
    applications = applications.map(migrateApplication);
    localStorage.setItem('applications', JSON.stringify(applications));
}

function loadApplications(){
    const loadedApplications = localStorage.getItem('applications');

    if(!loadedApplications){
        renderApplications();
        return;
    }

    try{
        const parsedApplications = JSON.parse(loadedApplications);
        applications = Array.isArray(parsedApplications) ? parsedApplications.map(migrateApplication) : [];
        applications.forEach(application => {
            application.favorite = application.favorite === true;
            if (application.url?.includes("jobboerse.arbeitsagentur.de") && application.externalId) {
                application.url = `https://www.arbeitsagentur.de/jobsuche/suche?angebotsart=1&id=${encodeURIComponent(application.externalId)}`;
            }
        });
    }
    catch(error){
        applications = [];
    }

    applicationId = getNextApplicationId();
    saveApplications();
    renderApplications();
}

function getNextApplicationId(){
    if(applications.length === 0){
        return 0;
    }

    const highestId = Math.max(...applications.map(application => Number(application.id) || 0));
    return highestId + 1;
}
