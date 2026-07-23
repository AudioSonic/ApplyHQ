let searchBar = null;

function bindSearchControls() {
    searchBar = document.getElementById("application-searchbar");

    if(!searchBar){
        return;
    }

    searchBar.value = uiState.search;
    searchBar.addEventListener("input", processSearchInput);
}

function processSearchInput(event) {
    uiState.search = event.currentTarget.value.trim().toLowerCase();
    renderApplications();
}
