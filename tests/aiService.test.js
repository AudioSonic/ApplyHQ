const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadService() {
    const context = { window: { APPLYHQ_JOB_SEARCH_API_URL: "https://worker.example" }, fetch };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", "aiService.js"), "utf8"), context);
    return context;
}

test("AI-Service sendet nur einen Worker-Request", async () => {
    const context = loadService();
    let request;
    const result = await context.testAiConnection("Test", async (url, options) => { request = { url, options }; return new Response(JSON.stringify({ success: true, provider: "openai", model: "gpt-5.6-luna", output: "Hallo." }), { status: 200 }); });
    assert.equal(request.url, "https://worker.example/api/ai/test");
    assert.equal(JSON.parse(request.options.body).input, "Test");
    assert.equal(result.output, "Hallo.");
});

test("AI-Service behandelt Worker-Fehler", async () => {
    const context = loadService();
    await assert.rejects(() => context.testAiConnection("Test", async () => new Response(JSON.stringify({ error: "Nicht verfügbar" }), { status: 503 })), /Nicht verfügbar/);
});

test("AI-Service lehnt ungültige Worker-Antworten ab", async () => {
    const context = loadService();
    await assert.rejects(() => context.testAiConnection("Test", async () => new Response(JSON.stringify({ success: true }), { status: 200 })), /ungültige Antwort/);
});
