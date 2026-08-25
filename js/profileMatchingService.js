async function matchApplicationProfile(application, profile, fetcher = fetch, force = false) {
    if (!application?.jobAnalysis) throw new Error("Zuerst muss die Stellenanzeige analysiert werden.");
    if (!profile || !(profile.summary || profile.experience?.length || profile.education?.length || profile.projects?.length || Object.values(profile.skills || {}).some(items => items.length))) throw new Error("Ein ausgefülltes Bewerberprofil ist erforderlich.");
    const fingerprint = buildMatchingFingerprint(application.jobAnalysis, profile);
    if (!force && application.jobMatching?.fingerprint === fingerprint) return application.jobMatching;
    const apiUrl = typeof window !== "undefined" ? window.APPLYHQ_JOB_SEARCH_API_URL || "" : "";
    const response = await fetcher(`${apiUrl}/api/ai/profile-matching`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobAnalysis: application.jobAnalysis, profile: buildMatchingProfile(profile) }) });
    let payload = {}; try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(payload.error || `Matching-Service antwortete mit HTTP ${response.status}.`);
    if (!payload.success || !payload.matching) throw new Error("Der Matching-Service lieferte kein Ergebnis.");
    assertValidProfileMatching(payload.matching);
    const result = finalizeProfileMatching(payload.matching);
    result.fingerprint = fingerprint;
    return result;
}
