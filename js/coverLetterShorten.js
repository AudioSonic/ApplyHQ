function addShortenCoverLetterAction(content, application, profile, rerender) {
    const action = workflowAction("Anschreiben kürzen", async event => {
        event.currentTarget.disabled = true;
        const processing = beginAiProcess("Anschreiben wird gekürzt", ["Bestehende Inhalte werden übernommen …", "Wiederholungen werden entfernt …", "Fakten und Profilbezug bleiben erhalten …"]);
        if (!processing) return;
        try {
            const result = await reviseCoverLetter(application, profile, "Fasse das bestehende Anschreiben deutlich kürzer. Verwende ausschließlich die bereits enthaltenen Inhalte und bewahre die wichtigsten belegten Aussagen, den konkreten Stellenbezug und die persönliche Motivation. Erfinde nichts und entferne Wiederholungen. Ziel ist eine kompakte, professionelle Fassung.");
            const previous = { ...application.coverLetter, revision: application.coverLetter.revision || 1 };
            const history = Array.isArray(application.coverLetterVersions) ? application.coverLetterVersions : [];
            updateApplication(application, { coverLetter: { ...result.coverLetter, revision: previous.revision + 1, signature: [profile.personal?.firstName, profile.personal?.lastName].filter(Boolean).join(" ") || "[Name]" }, coverLetterVersions: [...history, previous], coverLetterChanges: result.changes, coverLetterReview: null });
            processing.close(); rerender();
        } catch (error) { processing.close(); alert(`Kürzen fehlgeschlagen: ${error.message}`); event.currentTarget.disabled = false; }
    });
    content.append(action);
}

const originalRenderReviewPanel = renderReviewPanel;
renderReviewPanel = function(content, application, profile, rerender) {
    originalRenderReviewPanel(content, application, profile, rerender);
    if (application.coverLetter) addShortenCoverLetterAction(content, application, profile, rerender);
};
