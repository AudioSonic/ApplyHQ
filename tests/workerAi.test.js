const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadWorker() {
    const source = fs.readFileSync(path.join(__dirname, "..", "worker", "src", "index.js"), "utf8").replace("export default {", "const worker = {");
    const context = { console, Date, URL, Response, fetch: async () => new Response("{}") };
    vm.createContext(context);
    vm.runInContext(`${source}\nthis.worker = worker;`, context);
    return context;
}

test("Worker validiert den AI-Testrequest", () => {
    const context = loadWorker();
    assert.equal(context.validateAiTestRequest({ input: "Test" }), "");
    assert.match(context.validateAiTestRequest({ input: "" }), /erforderlich/);
    assert.match(context.validateAiTestRequest({ input: "x".repeat(4001) }), /höchstens/);
});

test("OpenAI-Provider nutzt zentrale Konfiguration und Structured Outputs", async () => {
    const context = loadWorker();
    let request;
    const provider = context.createOpenAiProvider({ OPENAI_API_KEY: "test-secret", OPENAI_MODEL: "gpt-5.6-luna" }, async (url, options) => {
        request = { url, options };
        return new Response(JSON.stringify({ output_text: JSON.stringify({ answer: "Hallo" }) }), { status: 200 });
    });
    const result = await provider.generate("Test");
    const body = JSON.parse(request.options.body);
    assert.equal(result.answer, "Hallo");
    assert.equal(body.model, "gpt-5.6-luna");
    assert.equal(body.store, false);
    assert.equal(body.text.format.type, "json_schema");
    assert.match(request.options.headers.Authorization, /^Bearer /);
});

test("fehlendes Secret wird ohne Provideraufruf gemeldet", async () => {
    const context = loadWorker();
    const result = await context.createOpenAiProvider({}, async () => { throw new Error("must not call"); }).generate("Test");
    assert.equal(result.error, "missing_key");
});

test("normalisiert bekannte Profilnamen auf stabile IDs", () => {
    const context = loadWorker();
    const matching = { version: 1, score: null, requirements: { mustHave: { matched: 1, total: 1, items: [{ requirement: "C#", status: "matched", profileEvidence: ["C#"] }] }, niceToHave: { matched: 0, total: 0, items: [] } }, skills: { matched: [], partial: [], missing: [] }, experience: { status: "unclear" }, education: { status: "unclear" }, projects: { status: "unclear", relevant: [] }, softSkills: { status: "unclear" }, languages: { status: "unclear" } };
    assert.equal(context.validateProfileMatchingResponse(matching, { skills: { programmingLanguages: [{ id: "skill-csharp", name: "C#" }] }, experience: [], education: [], projects: [] }), "");
    assert.deepEqual(matching.requirements.mustHave.items[0].profileEvidence, ["skill-csharp"]);
});
