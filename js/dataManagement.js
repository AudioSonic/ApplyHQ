function importJSON() {
    const input = document.createElement("input");
    const reader = new FileReader();
    input.type = "file";
    input.accept = ".json";

    input.addEventListener("change", () => {
        const file = input.files[0];

        if (!file) {
            return;
        }

        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);

                applications = validateJSON(data);
                saveApplications();
                navigateToDashboard();

            } catch (error) {
                alert(error.message);
                console.error(error);
            }
        };

        reader.readAsText(file);
    });

    input.click();
}

function exportJSON() {
    const json = JSON.stringify({ type: "applyhq-applications", version: APPLICATION_SCHEMA_VERSION, applications }, null, 4);
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
};

function validateJSON(data) {

    if (Array.isArray(data)) data = { applications: data, version: 1 };
    if (!data || !Array.isArray(data.applications)) {
        throw new Error("Die JSON-Datei enthält keine Liste von Bewerbungen.");
    }

    if (Number(data.version) > APPLICATION_SCHEMA_VERSION) throw new Error("Die Bewerbungsversion wird nicht unterstützt.");
    const migrated = data.applications.map(migrateApplication);
    const isValid = migrated.every(application => {
        return (
            typeof application.id === "number" &&
            typeof application.company === "string" &&
            typeof application.position === "string" &&
            typeof application.status === "string"
        );
    });

    if (!isValid) {
        throw new Error("Die Datei besitzt ein ungültiges Format.");
    }

    migrated.forEach(application => {
        const errors = validateApplication(application);
        if (errors.length) throw new Error(`Ungültige Bewerbung: ${errors.join(" ")}`);
    });
    return migrated;

}
