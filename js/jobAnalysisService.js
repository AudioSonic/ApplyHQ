async function analyzeJobPosting(application, fetcher = fetch) {
    const rawText = application?.jobPosting?.rawText || application?.description || "";
    if (!rawText.trim()) throw new Error("Keine Stellenanzeige vorhanden.");
    const apiUrl = typeof window !== "undefined" ? window.APPLYHQ_JOB_SEARCH_API_URL || "" : "";
    const response = await fetcher(`${apiUrl}/api/ai/job-analysis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawText, details: application.details || "" }) });
    let payload = {}; try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(payload.error || `Analyse-Service antwortete mit HTTP ${response.status}.`);
    if (!payload.success || !payload.analysis) throw new Error("Der Analyse-Service lieferte keine Analyse.");
    assertValidJobAnalysis(payload.analysis);
    return payload.analysis;
}
