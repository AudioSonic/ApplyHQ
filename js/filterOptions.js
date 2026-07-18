const searchBar = document.getElementById("application-searchbar");

searchBar.addEventListener("input", () => processSearchInput());

function processSearchInput(){
    uiState.search = searchBar.value.toLowerCase();
    renderApplications();
}