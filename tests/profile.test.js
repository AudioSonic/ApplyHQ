const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadProfileLogic() {
    const values = new Map();
    const context = { structuredClone, console, localStorage: { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) } };
    vm.createContext(context);
    ["profileModel.js", "profileRepository.js"].forEach(file => vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", file), "utf8"), context));
    return context;
}

test("erstellt ein gültiges Standardprofil", () => {
    const context = loadProfileLogic();
    const profile = context.createDefaultProfile();
    assert.equal(context.validateProfile(profile).length, 0);
    assert.equal(profile.version, 1);
});

test("speichert und lädt ein Profil über das Repository", () => {
    const context = loadProfileLogic();
    const profile = context.createDefaultProfile();
    profile.personal.firstName = "Ada";
    profile.skills.programmingLanguages.push({ id: "skill-javascript", name: "JavaScript", category: "programmingLanguages" });
    context.saveProfile(profile);
    assert.equal(context.getProfile().personal.firstName, "Ada");
    assert.equal(context.getProfile().skills.programmingLanguages[0].id, "skill-javascript");
});

test("importiert nur typisierte und valide Profildaten", () => {
    const context = loadProfileLogic();
    const profile = context.createDefaultProfile();
    profile.projects.push({ id: "project-applyhq", name: "ApplyHQ" });
    context.importProfileData({ type: "applyhq-profile", version: 1, profile });
    assert.equal(context.getProfile().projects[0].id, "project-applyhq");
    assert.throws(() => context.importProfileData({ type: "other", version: 1, profile }));
});

test("migriert ein Profil ohne Version und lehnt ungültige IDs ab", () => {
    const context = loadProfileLogic();
    const migrated = context.migrateProfile({ personal: { firstName: "Grace" } });
    assert.equal(migrated.version, 1);
    assert.equal(migrated.personal.firstName, "Grace");
    const invalid = context.createDefaultProfile();
    invalid.projects.push({ id: "not valid", name: "Fehler" });
    assert.ok(context.validateProfile(invalid).length > 0);
});
