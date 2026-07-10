/* Speichern und laden von Daten */

function saveApplications(){
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
        applications = Array.isArray(parsedApplications) ? parsedApplications : [];
    }
    catch(error){
        applications = [];
    }

    applicationId = getNextApplicationId();
    renderApplications();
}

function getNextApplicationId(){
    if(applications.length === 0){
        return 0;
    }

    const highestId = Math.max(...applications.map(application => Number(application.id) || 0));
    return highestId + 1;
}
