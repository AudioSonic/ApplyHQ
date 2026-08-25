function createApplicationModal(application = null){
    const form = document.createElement("form");

    const companyLabel = createLabel("application-company", "Unternehmen *");
    const companyInput = createInput("application-company", "text", "z. B. Tech Solutions GmbH");

    const positionLabel = createLabel("application-position", "Stellenbezeichnung *");
    const positionInput = createInput("application-position", "text", "z. B. Frontend Entwickler (m/w/d)");

    const locationRow = document.createElement("div");
    const cityColumn = document.createElement("div");
    const cityLabel = createLabel("application-city", "Stadt");
    const cityInput = createInput("application-city", "text", "z. B. Berlin");

    const stateColumn = document.createElement("div");
    const stateLabel = createLabel("application-state", "Bundesland");
    const stateInput = createInput("application-state", "text", "z. B. Berlin");

    const infoRow = document.createElement("div");
    const dateColumn = document.createElement("div");
    const dateLabel = createLabel("application-date", "Bewerbungsdatum");
    const dateInput = createInput("application-date", "date", "");

    const statusColumn = document.createElement("div");
    const statusLabel = createLabel("application-status", "Status");
    const statusSelect = document.createElement("select");

    const detailsRow = document.createElement("div");
    const urlColumn = document.createElement("div");
    const urlLabel = createLabel("application-url", "Url");
    const urlInput = createInput("application-url", "text", "https://www.indeed.com/");

    const tagColumn = document.createElement("div");
    const tagLabel = createLabel("application-tag","Stichwort");
    const tagSelect = document.createElement("select");

    const contactRow = document.createElement("div");
    const salutationColumn = document.createElement("div");
    const salutationLabel = createLabel("application-salutation", "Anrede");
    const salutationSelect = document.createElement("select");
    const contactNameColumn = document.createElement("div");
    const contactNameLabel = createLabel("application-contact-name", "Name");
    const contactNameInput = createInput("application-contact-name", "text", "z. B. Max Mustermann");
    const contactPositionLabel = createLabel("application-contact-position", "Position der Ansprechperson");
    const contactPositionInput = createInput("application-contact-position", "text", "z. B. Recruiting");
    const addressLabel = createLabel("application-company-address", "Unternehmensanschrift (Straße; Hausnummer; PLZ; Ort; Land)");
    const addressInput = createInput("application-company-address", "text", "z. B. Musterstraße; 1; 01067; Dresden; Deutschland");
    const descriptionLabel = createLabel("application-description", "Stellenbeschreibung");
    const descriptionTextarea = document.createElement("textarea");
    const applicationDetailsLabel = createLabel("application-details", "Details");
    const applicationDetailsTextarea = document.createElement("textarea");

    const notesLabel = createLabel("application-notes", "Notizen");
    const notesTextarea = document.createElement("textarea");

    const submitButton = document.createElement("button");
    const submitIcon = document.createElement("img");
    const submitText = document.createElement("p");

    form.id = "new-application";
    form.classList.add("application-modal-form");

    companyInput.minLength = 2;
    companyInput.maxLength = 80;
    companyInput.required = true;

    positionInput.minLength = 2;
    positionInput.maxLength = 100;
    positionInput.required = true;

    locationRow.classList.add("horizontal-orientation");
    cityColumn.classList.add("vertical-orientation");
    stateColumn.classList.add("vertical-orientation");
    urlColumn.classList.add("vertical-orientation");
    tagColumn.classList.add("vertical-orientation");
    salutationColumn.classList.add("vertical-orientation");
    contactNameColumn.classList.add("vertical-orientation");
    cityInput.maxLength = 80;
    stateInput.maxLength = 80;

    infoRow.classList.add("horizontal-orientation");
    detailsRow.classList.add("horizontal-orientation");
    dateColumn.classList.add("vertical-orientation");
    statusColumn.classList.add("vertical-orientation");
    dateInput.max = new Date().toISOString().split("T")[0];

    statusSelect.id = "application-status";
    statusSelect.name = "status";
    statusSelect.append(
        createOption("open", "Offen"),
        createOption("applied", "Beworben"),
        createOption("interview", "Interview"),
        createOption("rejected", "Absage"),
        createOption("accepted", "Zusage")
    );

    tagSelect.append(
        createOption("-", "-"),
        createOption("junior", "Junior"),
        createOption("initiative", "Initiativ")
    );
    tagSelect.id = "application-tag";
    tagSelect.name = "tag";

    contactRow.classList.add("horizontal-orientation");
    salutationSelect.id = "application-salutation";
    salutationSelect.name = "salutation";
    salutationSelect.append(createOption("-", "-"), createOption("Herr", "Herr"), createOption("Frau", "Frau"));
    contactNameInput.maxLength = 120;
    
    urlInput.id = "application-url";
    urlInput.name = "Url";

    notesTextarea.id = "application-notes";
    notesTextarea.rows = 3;
    notesTextarea.maxLength = 240;
    notesTextarea.placeholder = "Notizen zur Bewerbung (optional)";

    descriptionTextarea.id = "application-description";
    descriptionTextarea.rows = 3;
    descriptionTextarea.maxLength = 10000;
    descriptionTextarea.placeholder = "Stellenbeschreibung (optional)";
    applicationDetailsTextarea.id = "application-details";
    applicationDetailsTextarea.rows = 3;
    applicationDetailsTextarea.maxLength = 5000;
    applicationDetailsTextarea.placeholder = "Weitere Details, z. B. Gehalt (optional)";

    submitButton.classList.add("button", "button-primary");
    submitButton.type = "submit";
    submitIcon.src = "assets/icons/icon_plus.svg";
    submitIcon.alt = "";
    submitText.textContent = application
    ? "Änderungen speichern"
    : "Bewerbung hinzufügen";

    form.addEventListener("submit", event => {
        if (application) {
            saveApplicationEdit(event, application);
        } else {
            submitApplication(event);
        }
    });
    companyInput.addEventListener("input", clearApplicationValidation);
    positionInput.addEventListener("input", clearApplicationValidation);

    cityColumn.append(cityLabel, cityInput);
    stateColumn.append(stateLabel, stateInput);
    locationRow.append(cityColumn, stateColumn);

    dateColumn.append(dateLabel, dateInput);
    statusColumn.append(statusLabel, statusSelect);
    infoRow.append(dateColumn, statusColumn);
    detailsRow.append(urlColumn, tagColumn);
    urlColumn.append(urlLabel, urlInput);
    tagColumn.append(tagLabel, tagSelect);
    salutationColumn.append(salutationLabel, salutationSelect);
    contactNameColumn.append(contactNameLabel, contactNameInput);
    contactRow.append(salutationColumn, contactNameColumn);

    submitButton.append(submitIcon, submitText);
    form.append(
        companyLabel,
        companyInput,
        positionLabel,
        positionInput,
        locationRow,
        infoRow,
        detailsRow,
        contactRow,
        contactPositionLabel,
        contactPositionInput,
        addressLabel,
        addressInput,
        descriptionLabel,
        descriptionTextarea,
        applicationDetailsLabel,
        applicationDetailsTextarea,
        notesLabel,
        notesTextarea,
        submitButton
    );

    if (application) {
        companyInput.value = application.company || "";
        positionInput.value = application.position || "";
        cityInput.value = application.city || "";
        stateInput.value = application.state || "";
        dateInput.value = application.date || dateInput.value;
        statusSelect.value = application.status || "open";
        urlInput.value = application.url || "";
        tagSelect.value = application.tag || "junior";
        salutationSelect.value = application.salutation || "-";
        contactNameInput.value = typeof application.contactName === "string" ? application.contactName : [application.contact?.firstName, application.contact?.lastName].filter(Boolean).join(" ");
        contactPositionInput.value = application.contact?.position || "";
        const address = application.companyAddress || {};
        addressInput.value = [address.street, address.houseNumber, address.postalCode, address.city, address.country].join("; ").replace(/^(; )+|(; )+$/g, "");
        descriptionTextarea.value = application.jobPosting?.rawText || application.description || "";
        applicationDetailsTextarea.value = application.details || "";
        notesTextarea.value = application.notes || "";
    }

    return form;
}

function openApplicationDetailsModal(application){
    const modal = createModal("h1");
    const content = document.createElement("div");
    const company = document.createElement("h2");
    const date = document.createElement("p");
    const contactLabel = document.createElement("h3");
    const contact = document.createElement("p");
    const descriptionLabel = document.createElement("h3");
    const description = document.createElement("div");
    const metadata = document.createElement("div");
    const detailsLabel = document.createElement("h3");
    const details = document.createElement("div");

    modal.container.classList.add("application-details-modal-container");
    content.classList.add("application-details-modal");
    company.textContent = application.company || "Keine Firma angegeben";
    modal.title.textContent = application.position || "Stellenanzeige";
    date.textContent = `Bewerbungsdatum: ${formatApplicationDate(application.date)}`;
    contactLabel.textContent = "Ansprechperson";
    const contactParts = [application.salutation, typeof application.contactName === "string" ? application.contactName : [application.contact?.firstName, application.contact?.lastName].filter(Boolean).join(" ")]
        .filter(value => value && value !== "-");
    contact.textContent = contactParts.join(" ") || "Keine Ansprechperson angegeben";
    descriptionLabel.textContent = "Stellenbeschreibung";
    description.classList.add("application-detail-text");
    description.textContent = application.description || "Keine Stellenbeschreibung hinterlegt.";
    metadata.classList.add("application-detail-metadata");
    metadata.append(
        createApplicationDetail("Stadt", application.city),
        createApplicationDetail("Bundesland", formatApplicationState(application.state)),
        createApplicationDetail("Status", statusLabels[application.status] || application.status),
        createApplicationDetail("Stichwort", tagLabels[application.tag] || application.tag),
        createApplicationLinkDetail("URL", application.url)
    );
    detailsLabel.textContent = "Details";
    details.classList.add("application-detail-text");
    details.textContent = application.details || "Keine weiteren Details hinterlegt.";

    content.append(company, date, contactLabel, contact, metadata, descriptionLabel, description, detailsLabel, details);
    modal.content.append(content);
}

function createApplicationDetail(label, value){
    const item = document.createElement("div");
    const itemLabel = document.createElement("strong");
    const itemValue = document.createElement("span");
    item.classList.add("application-detail-item");
    itemLabel.textContent = label;
    itemValue.textContent = value && value !== "-" ? value : "Nicht angegeben";
    item.append(itemLabel, itemValue);
    return item;
}

function createApplicationLinkDetail(label, value){
    const item = createApplicationDetail(label, "");
    const link = document.createElement("a");
    link.href = value || "#";
    link.textContent = value || "Nicht angegeben";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    item.lastChild.replaceWith(link);
    return item;
}

function createLabel(inputId, text){
    const label = document.createElement("label");
    label.setAttribute("for", inputId);
    label.textContent = text;
    return label;
}

function createInput(id, type, placeholder){
    const input = document.createElement("input");
    input.id = id;
    input.type = type;
    input.placeholder = placeholder;
    return input;
}

function createOption(value, text){
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    return option;
}

function saveApplicationEdit(event, application){
    event.preventDefault();

    const applicationForm = event.currentTarget;

    if(!validateApplicationForm(applicationForm)){
        return;
    }

    const applicationData = getApplicationFormData(applicationForm);

    application.company = applicationData.company;
    application.position = applicationData.position;
    application.city = applicationData.city;
    application.state = applicationData.state;
    application.date = applicationData.date;
    application.status = applicationData.status;
    application.tag = applicationData.tag;
    application.url = applicationData.url;
    application.salutation = applicationData.salutation;
    application.contactName = applicationData.contactName;
    application.contact = applicationData.contact;
    application.companyAddress = applicationData.companyAddress;
    const rawText = applicationData.description || application.jobPosting?.rawText || "";
    application.description = rawText;
    application.jobPosting = createJobPosting({ ...(application.jobPosting || {}), rawText, sourceUrl: applicationData.url, updatedAt: new Date().toISOString() }, application);
    application.details = applicationData.details;
    application.notes = applicationData.notes;

    saveApplications();
    renderApplications();
    closeModal(applicationForm.closest(".modal-container"));
}
