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
    const modal = createModal(); modal.container.classList.add("profile-editor-modal-container"); modal.title.textContent = "Profil bearbeiten";
    const profile = getProfile(); const form = document.createElement("form"); form.className = "profile-editor-form";
    const tabs = document.createElement("nav"); tabs.className = "profile-editor-tabs";
    const panels = {}; const tabDefinitions = [["general", "Allgemein"], ["education", "Bildung"], ["experience", "Berufserfahrung"], ["skills", "Technologien"], ["projects", "Projekte"]];
    tabDefinitions.forEach(([id, label], index) => { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.dataset.tab = id; const panel = document.createElement("section"); panel.className = "profile-editor-tab-panel"; panel.dataset.panel = id; panel.hidden = index !== 0; button.onclick = () => { Object.values(panels).forEach(item => item.hidden = true); panels[id].hidden = false; tabs.querySelectorAll("button").forEach(item => item.classList.toggle("is-active", item === button)); }; tabs.append(button); panels[id] = panel; });
    tabs.querySelector("button").classList.add("is-active"); form.append(tabs, ...Object.values(panels));
    const appendTo = (tab, ...nodes) => panels[tab].append(...nodes);
    const personalFields = ["firstName", "lastName", "email", "phone", "location", "website", "github", "linkedin"];
    const personalLabels = { firstName: "Vorname", lastName: "Nachname", email: "E-Mail", phone: "Telefon", location: "Standort", website: "Website", github: "GitHub", linkedin: "LinkedIn" };
    personalFields.forEach(key => { const label = createLabel(`profile-${key}`, personalLabels[key]); const input = createInput(`profile-${key}`, "text", ""); input.name = key; input.value = profile.personal[key] || ""; appendTo("general", label, input); });
    const summary = document.createElement("textarea"); summary.name = "summary"; summary.rows = 4; summary.placeholder = "Kurze berufliche Zusammenfassung"; summary.value = profile.summary || ""; appendTo("general", createLabel("profile-summary", "Zusammenfassung"), summary);
    const entryEditors = {};
    const entryDefinitions = {
        experience: { label: "Berufserfahrung", fields: [["position", "Position / Rolle"], ["company", "Arbeitgeber"], ["description", "Beschreibung / Aufgaben"]] },
        education: { label: "Ausbildung", fields: [["degree", "Abschluss / Ausbildung"], ["institution", "Institution"], ["description", "Beschreibung"]] },
        projects: { label: "Projekte", fields: [["name", "Projektname"], ["shortDescription", "Kurzbeschreibung"], ["description", "Ausführliche Beschreibung"], ["technologies", "Technologien (durch Komma getrennt)"], ["role", "Deine Rolle"], ["activities", "Tätigkeiten (eine pro Zeile)"]] }
    };
    Object.entries(entryDefinitions).forEach(([key, definition]) => {
        const wrapper = document.createElement("fieldset"); wrapper.className = "profile-entry-editor";
        const legend = document.createElement("legend"); legend.textContent = definition.label; wrapper.append(legend);
        const list = document.createElement("div"); list.className = "profile-entry-list"; wrapper.append(list);
        entryEditors[key] = list;
        const addEntry = (value = {}) => {
            const entry = document.createElement("div"); entry.className = "profile-entry";
            if (value.id) entry.dataset.id = value.id;
            definition.fields.forEach(([field, labelText]) => {
                const id = `profile-${key}-${field}-${Math.random().toString(36).slice(2, 8)}`;
                const label = createLabel(id, labelText); const input = field === "description" || field === "activities" ? document.createElement("textarea") : createInput(id, "text", "");
                input.id = id; input.name = field; input.value = Array.isArray(value[field]) ? value[field].join("\n") : (value[field] || "");
                if (input.tagName === "TEXTAREA") input.rows = field === "activities" ? 3 : 4;
                entry.append(label, input);
            });
            const remove = document.createElement("button"); remove.type = "button"; remove.className = "button"; remove.textContent = "Eintrag entfernen"; remove.onclick = () => entry.remove(); entry.append(remove);
            list.append(entry);
        };
        (profile[key] || []).forEach(addEntry);
        const add = document.createElement("button"); add.type = "button"; add.className = "button"; add.textContent = `${definition.label} hinzufügen`; add.onclick = () => addEntry();
        wrapper.append(add); appendTo(key, wrapper);
    });
    const skillsEditor = document.createElement("fieldset"); skillsEditor.className = "profile-entry-editor"; const skillsLegend = document.createElement("legend"); skillsLegend.textContent = "Technologien und Skills"; skillsEditor.append(skillsLegend);
    Object.entries(profileSkillCategories).forEach(([key, label]) => { const id = `profile-skill-${key}`; const input = createInput(id, "text", "z. B. JavaScript, TypeScript"); input.name = `skill-${key}`; input.value = (profile.skills[key] || []).map(skill => skill.name).join(", "); skillsEditor.append(createLabel(id, label), input); }); appendTo("skills", skillsEditor);
    const hint = document.createElement("p"); hint.className = "profile-editor-hint"; hint.textContent = "Die Einträge werden automatisch strukturiert und für Matching und KI-Analyse aufbereitet."; appendTo("general", hint);
    const save = document.createElement("button"); save.className = "button button-primary"; save.type = "submit"; save.textContent = "Profil speichern"; form.append(save);
    form.onsubmit = event => { event.preventDefault(); try { const next = getProfile(); personalFields.forEach(key => next.personal[key] = form.elements[key].value.trim()); next.summary = form.elements.summary.value.trim(); Object.entries(entryEditors).forEach(([key, list]) => { next[key] = [...list.children].map(entry => { const value = { id: entry.dataset.id || `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }; entry.querySelectorAll("[name]").forEach(input => { value[input.name] = input.name === "technologies" ? input.value.split(",").map(item => item.trim()).filter(Boolean) : input.name === "activities" ? input.value.split("\n").map(item => item.trim()).filter(Boolean) : input.value.trim(); }); return value; }); }); Object.keys(profileSkillCategories).forEach(key => { next.skills[key] = form.elements[`skill-${key}`].value.split(",").map(name => name.trim()).filter(Boolean).map(name => ({ id: `skill-${key}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || Date.now()}`, name })); }); saveProfile(next); closeModal(form.closest(".modal-container")); loadProfile(); } catch (error) { alert(`Profil konnte nicht gespeichert werden: ${error.message}`); } };
    modal.content.append(form);
}

function downloadJson(data, name) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url); }
function exportProfile() { downloadJson(exportProfileData(), `applyhq-profile-${new Date().toISOString().slice(0, 10)}.json`); }
function importProfile() { const input = document.createElement("input"); input.type = "file"; input.accept = ".json,application/json"; input.onchange = () => { const file = input.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { importProfileData(JSON.parse(reader.result)); loadProfile(); } catch (error) { alert(`Profilimport fehlgeschlagen: ${error.message}`); } }; reader.readAsText(file); }; input.click(); }
