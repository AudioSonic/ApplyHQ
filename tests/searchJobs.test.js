const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadSearchLogic(applications = []) {
    const context = { applications, console, window: { APPLYHQ_JOB_SEARCH_API_URL: "" } };
    vm.createContext(context);
    const source = fs.readFileSync(path.join(__dirname, "..", "js", "searchJobs.js"), "utf8");
    vm.runInContext(source, context);
    return context;
}

function profile(overrides = {}) {
    return {
        location: "Leipzig",
        radius: 25,
        remote: false,
        employmentType: "full-time",
        searchTerms: ["html", "css", "javascript", "frontend"],
        lastSearch: null,
        ...overrides
    };
}

test("akzeptiert aufgerundete Hälfte der Keywords", () => {
    const context = loadSearchLogic();
    const result = context.evaluateSearchJob({
        company: "Test GmbH",
        position: "Webentwickler",
        city: "Leipzig",
        keywords: ["html", "css"],
        publishedAt: "2026-08-23"
    }, profile());
    assert.equal(result.isMatch, true);
    assert.deepEqual(result.matchedKeywords, ["html", "css"]);
});

test("behandelt Softwareentwicklung, Softwareentwickler und Software Entwickler gleich", () => {
    const context = loadSearchLogic();
    const result = context.evaluateSearchJob({
        company: "Test GmbH",
        position: "Software Entwickler (m/w/d)",
        city: "Leipzig",
        keywords: [],
        publishedAt: "2026-08-23"
    }, profile({ searchTerms: ["softwareentwicklung"] }));
    assert.equal(result.isMatch, true);
    assert.deepEqual(result.matchedKeywords, ["softwareentwicklung"]);
});

test("behandelt Deutschland als deutschlandweiten Standort", () => {
    const context = loadSearchLogic();
    const result = context.evaluateSearchJob({
        company: "Test GmbH",
        position: "Frontend Developer",
        city: "Berlin",
        keywords: ["html"],
        publishedAt: "2026-08-23"
    }, profile({ location: "Deutschland", radius: 0, searchTerms: ["html"] }));
    assert.equal(result.isMatch, true);
    assert.equal(result.isLocationMatch, true);
});

test("behandelt einen leeren Standort als deutschlandweite Suche", () => {
    const context = loadSearchLogic();
    const result = context.evaluateSearchJob({
        company: "Test GmbH",
        position: "Frontend Developer",
        city: "Berlin",
        keywords: ["html"],
        publishedAt: "2026-08-23"
    }, profile({ location: "", searchTerms: ["html"] }));
    assert.equal(result.isMatch, true);
    assert.equal(result.isLocationMatch, true);
});

test("behandelt einen leeren Radius als exakten Standort", () => {
    const context = loadSearchLogic();
    const matchingJob = context.evaluateSearchJob({
        company: "Test GmbH",
        position: "Frontend Developer",
        city: "Leipzig",
        keywords: ["html"],
        publishedAt: "2026-08-23"
    }, profile({ radius: "", searchTerms: ["html"] }));
    const distantJob = context.evaluateSearchJob({
        company: "Test GmbH",
        position: "Frontend Developer",
        city: "Berlin",
        keywords: ["html"],
        publishedAt: "2026-08-23"
    }, profile({ radius: "", searchTerms: ["html"] }));
    assert.equal(matchingJob.isLocationMatch, true);
    assert.equal(distantJob.isLocationMatch, false);
});

test("übernimmt die Stellenbeschreibung, lässt Details aber leer", () => {
    const context = loadSearchLogic();
    const result = context.getAutomaticApplicationData({
        company: "Test GmbH",
        position: "Softwareentwickler",
        description: "<p>Entwicklung&nbsp;moderner Software</p>",
        city: "Leipzig",
        url: "https://example.com/job"
    });
    assert.equal(result.description, "Entwicklung moderner Software");
    assert.equal(result.details, "");
});

test("akzeptiert eine passende Remote-Stelle außerhalb des Radius", () => {
    const context = loadSearchLogic();
    const result = context.evaluateSearchJob({
        company: "Remote GmbH",
        position: "Frontend Developer",
        city: "Berlin",
        remote: true,
        keywords: ["html", "css"],
        publishedAt: "2026-08-23"
    }, profile({ remote: true }));
    assert.equal(result.isMatch, true);
});

test("erkennt normalisierte Duplikate innerhalb von sechs Monaten", () => {
    const existing = {
        company: "ccc software gmbh",
        position: "Softwareentwickler .NET/C#",
        city: "Leipzig",
        date: "2026-08-06",
        url: ""
    };
    const context = loadSearchLogic([existing]);
    const result = context.classifySearchJob({
        company: "ccc software gmbh",
        position: "ccc software gmbh: Softwareentwickler .NET/C# (m/w/d) in Leipzig",
        city: "Leipzig",
        url: "https://example.com/new-url"
    }, new Date("2026-08-23"));
    assert.equal(result.status, "duplicate");
});

test("ignoriert bereits vor dem letzten Suchlauf veröffentlichte Stellen", () => {
    const context = loadSearchLogic();
    const result = context.runLocalSearch(profile({ lastSearch: "2026-08-23" }), new Date("2026-08-23"));
    assert.equal(result.checkedCount, 0);
    assert.equal(result.newJobs.length, 0);
});
