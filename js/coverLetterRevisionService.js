async function reviseCoverLetter(application, profile, userRevisionInstruction = "", fetcher = fetch) {
    if (!application?.coverLetter) throw new Error("Zuerst muss ein Anschreiben erstellt werden.");
    if (!application?.coverLetterReview) throw new Error("Zuerst muss das Anschreiben geprüft werden.");
    if (!application?.jobAnalysis || !application?.jobMatching) throw new Error("Stellenanalyse und Matching sind erforderlich.");
    if (!profile) throw new Error("Ein Bewerberprofil ist erforderlich.");
    const apiUrl = typeof window !== "undefined" ? window.APPLYHQ_JOB_SEARCH_API_URL || "" : "";
    const contact = application.contact || {};
    const response = await fetcher(`${apiUrl}/api/ai/cover-letter-revision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coverLetter: application.coverLetter, coverLetterReview: application.coverLetterReview, jobAnalysis: application.jobAnalysis, jobMatching: application.jobMatching, profile: buildCoverLetterProfile(profile), company: { name: application.company || "" }, position: application.position || "", contact: { salutation: contact.salutation || "", firstName: contact.firstName || "", lastName: contact.lastName || "" }, userRevisionInstruction: String(userRevisionInstruction || "").trim() }) });
    let payload = {}; try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(payload.error || `Überarbeitungs-Service antwortete mit HTTP ${response.status}.`);
    if (!payload.success || !payload.coverLetter || !Array.isArray(payload.changes)) throw new Error("Der Überarbeitungs-Service lieferte kein gültiges Ergebnis.");
    assertValidCoverLetter(payload.coverLetter);
    return payload;
}
