const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load() { const context = { window: { APPLYHQ_JOB_SEARCH_API_URL: "https://worker.example" }, fetch }; vm.createContext(context); vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "jobAnalysisModel.js"), "utf8"), context); vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "jobAnalysisService.js"), "utf8"), context); return context; }
function empty() { return load().createEmptyJobAnalysis(); }

test("validiert ein versioniertes JobAnalysis-Modell", () => { const context = load(); const analysis = empty(); assert.equal(context.validateJobAnalysis(analysis).length, 0); analysis.version = 2; assert.ok(context.validateJobAnalysis(analysis).length > 0); });
test("sendet nur rawText und details, niemals notes oder Profil", async () => { const context = load(); let body; const analysis = empty(); analysis.position.title = "Softwareentwickler"; const result = await context.analyzeJobPosting({ jobPosting: { rawText: "C#/.NET" }, details: "Hybrid", notes: "privat", profile: { summary: "privat" } }, async (_url, options) => { body = JSON.parse(options.body); return new Response(JSON.stringify({ success: true, analysis }), { status: 200 }); }); assert.deepEqual(Object.keys(body).sort(), ["details", "rawText"]); assert.equal(body.rawText, "C#/.NET"); assert.equal(result.position.title, "Softwareentwickler"); });
test("verwendet description nur als Alt-Fallback", async () => { const context = load(); let body; await context.analyzeJobPosting({ description: "Alte Stellenbeschreibung" }, async (_url, options) => { body = JSON.parse(options.body); return new Response(JSON.stringify({ success: true, analysis: empty() }), { status: 200 }); }); assert.equal(body.rawText, "Alte Stellenbeschreibung"); });
