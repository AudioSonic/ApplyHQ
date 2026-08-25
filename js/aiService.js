const APPLYHQ_AI_TEST_PATH = "/api/ai/test";

async function testAiConnection(input, fetcher = fetch) {
    const apiUrl = typeof window !== "undefined" ? window.APPLYHQ_JOB_SEARCH_API_URL || "" : "";
    if (!apiUrl) throw new Error("Kein ApplyHQ-Worker konfiguriert.");
    const response = await fetcher(`${apiUrl}${APPLYHQ_AI_TEST_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input })
    });
    let payload = {};
    try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(payload.error || `KI-Service antwortete mit HTTP ${response.status}.`);
    if (payload.success !== true || typeof payload.output !== "string") throw new Error("Der KI-Service lieferte eine ungültige Antwort.");
    return payload;
}
