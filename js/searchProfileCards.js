function createSearchProfileCard(){
    const searchProfileList = document.getElementById("searchProfile-list");
    const searchProfileCard = document.createElement("article");
    const title = document.createElement("h2");
    const searchLocation = document.createElement("span");
    const searchDistance = document.createElement("span");
    const newPositionsLabel = document.createElement("span");
    const newPositionCount = document.createElement("span");
    const hr = document.createElement("hr");

    const btBeginSearch = document.createElement("button");
    const beginSearchIcon = document.createElement("img");
    const beginSearchText = document.createElement("span");

    const btEditSearch = document.createElement("button");
    const editSearchIcon = document.createElement("img");
    const editSearchText = document.createElement("span");

    const btOptions = document.createElement("button");
    const searchStatus = document.createElement("span");

    const searchDetails = document.createElement("div");
    const searchButtons = document.createElement("div");
    const searchResults = document.createElement("div");
    const titleAndStatus = document.createElement("div");

    searchProfileCard.classList.add("application-card");
    searchProfileCard.classList.add("search-profile-card");
    searchDetails.classList.add("search-profile-details");
    searchButtons.classList.add("search-profile-buttons");
    searchResults.classList.add("search-profile-results");
    titleAndStatus.classList.add("search-profile-title-and-status");

    btBeginSearch.classList.add("button");
    btBeginSearch.classList.add("button-primary");
    btBeginSearch.classList.add("search-profile-button");
    btEditSearch.classList.add("button");
    btEditSearch.classList.add("search-profile-button");
    btOptions.classList.add("search-profile-button");

    title.textContent = "Frontend Entwickler";
    searchLocation.textContent = "Leipzig";
    searchDistance.textContent = "25 km";
    newPositionsLabel.textContent = "Neue Stellen";
    newPositionCount.textContent = "8";
    beginSearchText.textContent = "Suche Starten";
    editSearchText.textContent = "Bearbeiten";
    btOptions.textContent = "⋮";
    btOptions.setAttribute("aria-label", "Suchprofil-Optionen");
    searchStatus.textContent = "Inaktiv";

    beginSearchIcon.src = "assets/icons/icon_arrow_right.png";
    editSearchIcon.src = "assets/icons/icon_edit.svg";

    btBeginSearch.append(beginSearchIcon, beginSearchText);
    btEditSearch.append(editSearchIcon, editSearchText);

    titleAndStatus.append(title, searchStatus);
    searchDetails.append(titleAndStatus, searchLocation, searchDistance);
    searchResults.append(newPositionsLabel, newPositionCount);
    searchButtons.append(btBeginSearch, btEditSearch, btOptions);
    searchProfileCard.append(searchDetails, searchResults, hr, searchButtons);

    searchProfileList.append(searchProfileCard);

    return searchProfileCard;
}
