const dashboardStats = [
    {
        counterId: "overview-open",
        iconPath: "M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z",
        label: "Offen"
    },
    {
        counterId: "overview-applied",
        iconPath: "m720-160-56-56 63-64H560v-80h167l-63-64 56-56 160 160-160 160ZM160-280q-33 0-56.5-23.5T80-360v-400q0-33 23.5-56.5T160-840h520q33 0 56.5 23.5T760-760v204q-10-2-20-3t-20-1q-10 0-20 .5t-20 2.5v-147L416-520 160-703v343h323q-2 10-2.5 20t-.5 20q0 10 1 20t3 20H160Zm58-480 198 142 204-142H218Zm-58 400v-400 400Z",
        label: "Beworben"
    },
    {
        counterId: "overview-interviews",
        iconPath: "M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM247-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47Zm466 0q-47 47-113 47-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113q0 66-47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm296.5-343.5Q440-607 440-640t-23.5-56.5Q393-720 360-720t-56.5 23.5Q280-673 280-640t23.5 56.5Q327-560 360-560t56.5-23.5ZM360-240Zm0-400Z",
        label: "Interviews"
    },
    {
        counterId: "overview-rejections",
        iconPath: "m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z",
        label: "Absagen"
    },
    {
        counterId: "overview-accepted",
        iconPath: "m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z",
        label: "Zusagen"
    }
];

function loadDashboard() {
    const main = document.querySelector("main");

    if(!main){
        return;
    }

    main.replaceChildren(createOverviewSection(), createApplicationPanel());

    initializeDashboard();
}

function initializeDashboard() {
    bindApplicationControls();
    bindApplicationCardElements();
    bindSearchControls();
    loadApplications();
}

function createOverviewSection() {
    const section = createDashboardElement("section");
    const heading = createDashboardElement("div", "section-heading");
    const title = createDashboardElement("h2");
    const overview = createDashboardElement("section");

    section.setAttribute("aria-labelledby", "overview-title");
    title.id = "overview-title";
    title.textContent = "Übersicht";
    overview.id = "overview";
    overview.setAttribute("aria-label", "Bewerbungsübersicht");

    dashboardStats.forEach((stat) => {
        overview.append(createOverviewCard(stat));
    });

    heading.append(title);
    section.append(heading, overview);

    return section;
}

function createOverviewCard({ counterId, iconPath, label }) {
    const card = createDashboardElement("article", "overview-card");
    const iconContainer = createDashboardElement("div", "overview-card-icon");
    const content = createDashboardElement("div");
    const count = createDashboardElement("p");
    const labelElement = createDashboardElement("p");

    count.id = counterId;
    count.textContent = "0";
    labelElement.textContent = label;

    iconContainer.append(createDashboardIcon(iconPath));
    content.append(count, labelElement);
    card.append(iconContainer, content);

    return card;
}

function createApplicationPanel() {
    const section = createDashboardElement("section");
    const panel = createDashboardElement("section", "panel");
    const panelHeader = createDashboardElement("div", "panel-header");

    section.id = "applications";
    panel.id = "application-overview";

    panelHeader.append(createSearchControls());
    panel.append(
        panelHeader,
        createApplicationListContainer(),
        createApplicationFooter()
    );
    section.append(panel);

    return section;
}

function createSearchControls() {
    const container = createDashboardElement("div");
    const heading = createDashboardElement("h2");
    const count = createDashboardElement("span");
    const searchBar = createDashboardElement("input");
    const sortAndFilter = createDashboardElement("div");

    container.id = "application-overview-settings";
    count.id = "application-count";
    count.textContent = "0";
    heading.append("Deine Bewerbungen (", count, ")");

    searchBar.type = "search";
    searchBar.id = "application-searchbar";
    searchBar.placeholder = "Suche nach Unternehmen oder Stelle...";

    sortAndFilter.id = "sort-and-filter";
    sortAndFilter.append(
        createSelectControl("application-sort", "Sortierung:", [
            ["newest", "Neueste zuerst"],
            ["oldest", "Älteste zuerst"]
        ]),
        createSelectControl("application-filter", "Filter:", [
            ["all", "Alle Bewerbungen"],
            ["open", "Offen"],
            ["applied", "Beworben"],
            ["interview", "Interview"],
            ["rejected", "Absage"],
            ["accepted", "Zusage"]
        ])
    );

    container.append(heading, searchBar, sortAndFilter);

    return container;
}

function createSelectControl(id, labelText, options) {
    const label = createDashboardElement("label", "sort-control");
    const text = createDashboardElement("span");
    const select = createDashboardElement("select");

    label.htmlFor = id;
    text.textContent = labelText;
    select.id = id;
    select.name = id;

    options.forEach(([value, optionText]) => {
        select.append(createDashboardOption(value, optionText));
    });

    label.append(text, select);

    return label;
}

function createApplicationListContainer() {
    const container = createDashboardElement("div");
    const emptyState = createDashboardElement("div", "empty-state");
    const emptyText = createDashboardElement("p");
    const applicationList = createDashboardElement("div");

    container.id = "application-list-container";
    emptyText.textContent = "Noch keine passenden Bewerbungen vorhanden.";
    applicationList.id = "application-list";

    emptyState.append(emptyText);
    container.append(emptyState, applicationList);

    return container;
}

function createApplicationFooter() {
    const footer = createDashboardElement("footer", "panel-footer");
    const addButton = createDashboardElement("button", "add-application-button");

    addButton.id = "open-application-modal-button";
    addButton.type = "button";
    addButton.textContent = "Bewerbung manuell hinzufügen";
    footer.append(addButton);

    return footer;
}

function createDashboardElement(tagName, className = "") {
    const element = document.createElement(tagName);

    if(className){
        element.className = className;
    }

    return element;
}

function createDashboardOption(value, text) {
    const option = document.createElement("option");

    option.value = value;
    option.textContent = text;

    return option;
}

function createDashboardIcon(pathData) {
    const namespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(namespace, "svg");
    const path = document.createElementNS(namespace, "path");

    svg.setAttribute("viewBox", "0 -960 960 960");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "currentColor");

    svg.append(path);

    return svg;
}
