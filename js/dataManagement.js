function importJSON(){
    console.log("Daten werden importiert");
};

function exportJSON() {
    const json = JSON.stringify(applications, null, 4);
    const blob = new Blob([json], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const date = new Date().toISOString().split("T")[0];
    const jsonName = `applications_${date}.json`;

    link.href = url;
    link.download = jsonName;
    link.click();

    URL.revokeObjectURL(url);
}