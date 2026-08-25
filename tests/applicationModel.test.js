const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadModel() {
    const context = { console, Date, Object };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "applicationModel.js"), "utf8"), context);
    return context;
}

test("migriert description verlustfrei nach jobPosting.rawText", () => {
    const context = loadModel();
    const application = context.migrateApplication({ id: 1, company: "Test GmbH", position: "Entwickler", status: "open", description: "Originaltext", url: "https://example.com/job" });
    assert.equal(application.jobPosting.rawText, "Originaltext");
    assert.equal(application.description, "Originaltext");
    assert.equal(application.jobPosting.sourceUrl, "https://example.com/job");
});

test("strukturiert Kontakt und Unternehmensanschrift", () => {
    const context = loadModel();
    const application = context.migrateApplication({ id: 1, company: "Test GmbH", position: "Entwickler", status: "open", contact: { salutation: "Frau", lastName: "Muster", position: "Recruiting" }, companyAddress: { street: "Hauptstraße", houseNumber: "1", postalCode: "01067", city: "Dresden", country: "Deutschland" } });
    assert.equal(application.contact.position, "Recruiting");
    assert.equal(application.companyAddress.postalCode, "01067");
    assert.equal(context.validateApplication(application).length, 0);
});

test("Bewerbungskontext enthält Details, aber keine persönlichen Notizen", () => {
    const context = loadModel();
    const application = context.migrateApplication({ id: 1, company: "Test GmbH", position: "Entwickler", status: "open", details: "Hybrid möglich", notes: "Nicht an KI senden" });
    const result = context.buildApplicationContext(application, { summary: "Profil" });
    assert.equal(result.details, "Hybrid möglich");
    assert.equal(Object.prototype.hasOwnProperty.call(result, "notes"), false);
    assert.equal(result.profile.summary, "Profil");
});

test("ungültige Stellenanzeigen werden erkannt", () => {
    const context = loadModel();
    assert.ok(context.validateJobPosting({ version: 1, rawText: 42, sourceUrl: "not-a-url", source: "manual", capturedAt: "x", updatedAt: "x" }).length > 0);
});
