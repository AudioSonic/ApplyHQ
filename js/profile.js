const profileSkillCategories = {
    programmingLanguages: "Programmiersprachen", frontend: "Frontend", backend: "Backend",
    frameworks: "Frameworks & Technologien", databases: "Datenbanken", tools: "Tools", methods: "Methoden"
};

function loadProfile() {
    setActiveNavigationButton(document.querySelector('[data-action="loadProfile"]'));
    const main = document.querySelector("main");
    if (!main) return;
    main.replaceChildren(createProfileView(getProfile()));
}

function createProfileView(profile) {
    const section = document.createElement("section");
    section.className = "profile-view";
    const heading = document.createElement("div");
    heading.className = "section-heading profile-heading";
    const title = document.createElement("h1"); title.textContent = "Profil";
    const edit = document.createElement("button"); edit.className = "button button-primary"; edit.type = "button"; edit.textContent = "Profil bearbeiten";
    edit.onclick = () => openProfileEditor(); heading.append(title, edit);
    section.append(heading, createProfileSection("Persönliche Informationen", [formatPersonal(profile.personal)]), createProfileSection("Berufliches Profil", [profile.summary || "Noch keine Zusammenfassung hinterlegt."]));
    section.append(createProfileSection("Berufserfahrung", profile.experience.map(item => `${item.position || "Position"} – ${item.company || "Arbeitgeber"}\n${item.description || ""}`), true));
    section.append(createProfileSection("Ausbildung", profile.education.map(item => `${item.degree || "Ausbildung"} – ${item.institution || "Institution"}\n${item.description || ""}`), true));
    Object.entries(profileSkillCategories).forEach(([key, label]) => section.append(createProfileSection(label, profile.skills[key].map(skill => `${skill.name}${skill.level ? ` – ${skill.level}` : ""}`), true)));
    section.append(createProfileSection("Projekte", profile.projects.map(project => `${project.name || "Projekt"}\n${project.shortDescription || project.description || ""}`), true));
    const actions = document.createElement("div"); actions.className = "profile-data-actions";
    const exportButton = document.createElement("button"); exportButton.className = "button"; exportButton.textContent = "Profil exportieren"; exportButton.onclick = exportProfile;
    const importButton = document.createElement("button"); importButton.className = "button"; importButton.textContent = "Profil importieren"; importButton.onclick = importProfile;
    actions.append(exportButton, importButton); section.append(actions);
    return section;
}

function formatPersonal(personal) { return [personal.firstName, personal.lastName].filter(Boolean).join(" ") || "Noch keine persönlichen Daten hinterlegt."; }
function createProfileSection(title, values, multiline = false) {
    const article = document.createElement("article"); article.className = "profile-section";
    const heading = document.createElement("h2"); heading.textContent = title; article.append(heading);
    if (!values.length) values = ["Noch keine Einträge hinterlegt."];
    values.forEach(value => { const item = document.createElement(multiline ? "p" : "span"); item.className = "profile-value"; item.textContent = value; article.append(item); });
    return article;
}

function openProfileEditor() {
    const modal = createModal(); modal.title.textContent = "Profil bearbeiten";
    const profile = getProfile(); const form = document.createElement("form"); form.className = "profile-editor-form";
    const personalFields = ["firstName", "lastName", "email", "phone", "location", "website", "github", "linkedin"];
    const personalLabels = { firstName: "Vorname", lastName: "Nachname", email: "E-Mail", phone: "Telefon", location: "Standort", website: "Website", github: "GitHub", linkedin: "LinkedIn" };
    personalFields.forEach(key => { const label = createLabel(`profile-${key}`, personalLabels[key]); const input = createInput(`profile-${key}`, "text", ""); input.name = key; input.value = profile.personal[key] || ""; form.append(label, input); });
    const summary = document.createElement("textarea"); summary.name = "summary"; summary.rows = 4; summary.placeholder = "Kurze berufliche Zusammenfassung"; summary.value = profile.summary || ""; form.append(createLabel("profile-summary", "Zusammenfassung"), summary);
    const dataFields = { experience: "Berufserfahrung", education: "Ausbildung", projects: "Projekte", skills: "Skills" };
    Object.entries(dataFields).forEach(([key, label]) => { const textarea = document.createElement("textarea"); textarea.name = key; textarea.rows = 5; textarea.value = JSON.stringify(profile[key], null, 2); textarea.dataset.profileJson = key; form.append(createLabel(`profile-${key}`, `${label} (JSON)`), textarea); });
    const hint = document.createElement("p"); hint.className = "profile-editor-hint"; hint.textContent = "Einträge müssen eine stabile ID besitzen. Änderungen werden erst beim Speichern übernommen."; form.append(hint);
    const save = document.createElement("button"); save.className = "button button-primary"; save.type = "submit"; save.textContent = "Profil speichern"; form.append(save);
    form.onsubmit = event => { event.preventDefault(); try { const next = getProfile(); personalFields.forEach(key => next.personal[key] = form.elements[key].value.trim()); next.summary = form.elements.summary.value.trim(); Object.keys(dataFields).forEach(key => next[key] = JSON.parse(form.elements[key].value || (key === "skills" ? "{}" : "[]"))); saveProfile(next); closeModal(form.closest(".modal-container")); loadProfile(); } catch (error) { alert(`Profil konnte nicht gespeichert werden: ${error.message}`); } };
    modal.content.append(form);
}

function downloadJson(data, name) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function exportProfile() { downloadJson(exportProfileData(), `applyhq-profile-${new Date().toISOString().slice(0, 10)}.json`); }
function importProfile() { const input = document.createElement("input"); input.type = "file"; input.accept = ".json,application/json"; input.onchange = () => { const file = input.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { importProfileData(JSON.parse(reader.result)); loadProfile(); } catch (error) { alert(`Profilimport fehlgeschlagen: ${error.message}`); } }; reader.readAsText(file); }; input.click(); }
