/* Verarbeitung der Daten */
let applications = [];
let applicationId = 0;

function addApplication(applicationData){
    const application = migrateApplication({
        id: applicationId,
        company: applicationData.company,
        position: applicationData.position,
        city: applicationData.city,
        state: applicationData.state,
        date: applicationData.date,
        status: applicationData.status,
        tag: applicationData.tag,
        url: applicationData.url,
        salutation: applicationData.salutation,
        contactName: applicationData.contactName,
        description: applicationData.description,
        details: applicationData.details,
        notes: applicationData.notes,
        externalId: applicationData.externalId || "",
        source: applicationData.source || "",
        publishedAt: applicationData.publishedAt || "",
        favorite: Boolean(applicationData.favorite),
        logo: null,
        companyAddress: applicationData.companyAddress,
        contact: applicationData.contact,
        jobPosting: applicationData.jobPosting
    });

    applications.push(application);

    applicationId++;
    saveApplications();
    renderApplications();

    return application;
}

function deleteApplication(id){
    applications = applications.filter(application => application.id !== id);
    saveApplications();
    renderApplications();
}

function sortApplications(applicationList, order){
    if (order === "alphabetical") {
        return [...applicationList].sort((firstApplication, secondApplication) => {
            const companyOrder = String(firstApplication.company || "").localeCompare(
                String(secondApplication.company || ""),
                "de-DE",
                { sensitivity: "base" }
            );
            if (companyOrder !== 0) return companyOrder;
            return String(firstApplication.position || "").localeCompare(
                String(secondApplication.position || ""),
                "de-DE",
                { sensitivity: "base" }
            );
        });
    }

    return [...applicationList].sort((firstApplication, secondApplication) => {
        const firstDate = new Date(firstApplication.date).getTime();
        const secondDate = new Date(secondApplication.date).getTime();
        return order === "oldest" ? firstDate - secondDate : secondDate - firstDate;
    });
}

function getApplicationById(id){
    return applications.find(application => application.id === id);
}

function updateApplication(application, data) {
    Object.assign(application, migrateApplication({ ...application, ...data }));
    saveApplications();
    renderApplications();
    return application;
}

