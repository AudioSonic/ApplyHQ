async function analyzeJobPosting(application, fetcher = fetch) {
    const rawText = application?.jobPosting?.rawText || application?.description || "";
    if (!rawText.trim()) throw new Error("Keine Stellenanzeige vorhanden.");
    const apiUrl = typeof window !== "undefined" ? window.APPLYHQ_JOB_SEARCH_API_URL || "" : "";
    const response = await fetcher(`${apiUrl}/api/ai/job-analysis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawText, details: application.details || "" }) });
    let payload = {}; try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(payload.error || `Analyse-Service antwortete mit HTTP ${response.status}.`);
    if (!payload.success || !payload.analysis) throw new Error("Der Analyse-Service lieferte keine Analyse.");
    assertValidJobAnalysis(payload.analysis);
    return deduplicateJobAnalysis(payload.analysis);
}

function deduplicateJobAnalysis(analysis) { const unique = values => { const seen = new Set(); return (values || []).filter(value => { const key = typeof value === "string" ? value.trim().toLocaleLowerCase("de-DE") : JSON.stringify(value); if (seen.has(key)) return false; seen.add(key); return true; }); }; return { ...analysis, tasks: unique(analysis.tasks), softSkills: unique(analysis.softSkills), education: unique(analysis.education), languages: unique(analysis.languages), benefits: unique(analysis.benefits), additionalRequirements: unique(analysis.additionalRequirements), requirements: { ...analysis.requirements, mustHave: unique(analysis.requirements.mustHave), niceToHave: unique(analysis.requirements.niceToHave) }, skills: Object.fromEntries(Object.entries(analysis.skills).map(([category, values]) => [category, unique(values)])) }; }
