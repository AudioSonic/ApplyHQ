let searchBar = null;
let searchProfileSearchBar = null;
let searchProfileFilter = null;
let searchProfileSort = null;

function bindSearchControls() {
    searchBar = document.getElementById("application-searchbar");

    if(!searchBar){
        return;
    }

    searchBar.value = uiState.search;
    searchBar.addEventListener("input", processSearchInput);

    searchProfileSearchBar = document.getElementById("searchProfile-searchbar");
    searchProfileFilter = document.getElementById("searchProfile-filter");
    searchProfileSort = document.getElementById("searchProfile-sort");
    if(searchProfileSearchBar){
        searchProfileSearchBar.addEventListener("input", processSearchProfileInput);
    }
    if(searchProfileFilter){
        searchProfileFilter.addEventListener("change", () => renderSearchProfiles());
    }
    if(searchProfileSort){
        searchProfileSort.addEventListener("change", () => renderSearchProfiles());
    }
}

function processSearchInput(event) {
    uiState.search = event.currentTarget.value.trim().toLowerCase();
    renderApplications();
}

function processSearchProfileInput(event) {
    renderSearchProfiles(event.currentTarget.value.trim().toLowerCase());
}
