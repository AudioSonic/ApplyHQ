function loadSettings(){
    const main = document.querySelector("main");
    const settings = renderSettings();
    
    main.replaceChildren();

    main.append(settings);

    return main;
}

function renderSettings(){
    const settingSection = document.createElement("section");
    const headerText = document.createElement("h1");
    const hr = document.createElement("hr");
    const description = document.createElement("p");
    const subTitle = document.createElement("h2");
    const buttonSection = document.createElement("div");
    const importButton = document.createElement("button");
    const exportBututton = document.createElement("button");
    const importIcon = document.createElement("img");
    const exportIcon = document.createElement("img");
    const importText = document.createElement("span");
    const exportText = document.createElement("span");

    headerText.textContent="Einstellungen";
    importText.textContent = "Daten importieren";
    exportText.textContent = "Daten exportieren";
    subTitle.textContent = "Dokumentenverwaltung";
    description.textContent = "Importiere oder exportiere deine Bewerbungsdaten.";
    importIcon.src = "../assets/icons/icon_download.svg";
    exportIcon.src = "../assets/icons/icon_upload.svg";

    buttonSection.classList.add("vertical-orientation");
    buttonSection.classList.add("button-section");
    importButton.classList.add("button");
    importButton.classList.add("settings-button");
    exportBututton.classList.add("button");
    exportBututton.classList.add("settings-button");
    hr.style.margin = "5px";

    importButton.addEventListener("click", importJSON);
    exportBututton.addEventListener("click", exportJSON);

    importButton.append(importText, importIcon);
    exportBututton.append(exportText, exportIcon);

    buttonSection.append(importButton, exportBututton);
    settingSection.append(headerText, hr, subTitle, description, buttonSection);

    return settingSection;
}