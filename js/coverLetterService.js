async function generateCoverLetter(application, profile, fetcher = fetch) {
    if (!application?.jobAnalysis) throw new Error("Zuerst muss die Stellenanzeige analysiert werden.");
    if (!application?.jobMatching) throw new Error("Zuerst muss das Profil-Matching durchgeführt werden.");
    if (!profile || !(profile.summary || profile.experience?.length || profile.education?.length || profile.projects?.length || Object.values(profile.skills || {}).some(items => items.length))) throw new Error("Ein ausgefülltes Bewerberprofil ist erforderlich.");
    const apiUrl = typeof window !== "undefined" ? window.APPLYHQ_JOB_SEARCH_API_URL || "" : "";
    const contact = application.contact || {};
    const response = await fetcher(`${apiUrl}/api/ai/cover-letter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobAnalysis: application.jobAnalysis, jobMatching: application.jobMatching, profile: buildCoverLetterProfile(profile), company: { name: application.company || "" }, contact: { salutation: contact.salutation || "", firstName: contact.firstName || "", lastName: contact.lastName || "", position: contact.position || "" } }) });
    let payload = {}; try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(payload.error || `Anschreiben-Service antwortete mit HTTP ${response.status}.`);
    if (!payload.success || !payload.coverLetter) throw new Error("Der Anschreiben-Service lieferte kein Ergebnis.");
    assertValidCoverLetter(payload.coverLetter);
    return payload.coverLetter;
}
