function createApplicationModal(){
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
    cityInput.maxLength = 80;
    stateInput.maxLength = 80;

    infoRow.classList.add("horizontal-orientation");
    detailsRow.classList.add("horizontal-orientation");
    dateColumn.classList.add("vertical-orientation");
    statusColumn.classList.add("vertical-orientation");
    dateInput.required = true;
    setDefaultApplicationDate(dateInput);

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
        createOption("junior", "Junior"),
        createOption("initiative", "Initiativ")
    );
    tagSelect.id = "application-tag";
    tagSelect.name = "tag";
    
    urlInput.id = "application-url";
    urlInput.name = "Url";

    notesTextarea.id = "application-notes";
    notesTextarea.rows = 3;
    notesTextarea.maxLength = 240;
    notesTextarea.placeholder = "Notizen zur Bewerbung (optional)";

    submitButton.classList.add("add-application-button");
    submitButton.type = "submit";
    submitIcon.src = "assets/icons/icon_plus.svg";
    submitIcon.alt = "";
    submitText.textContent = "Bewerbung hinzufügen";

    form.addEventListener("submit", submitApplication);
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

    submitButton.append(submitIcon, submitText);
    form.append(
        companyLabel,
        companyInput,
        positionLabel,
        positionInput,
        locationRow,
        infoRow,
        detailsRow,
        notesLabel,
        notesTextarea,
        submitButton
    );

    return form;
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
