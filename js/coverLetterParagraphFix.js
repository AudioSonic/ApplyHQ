const originalRenderCoverTab = renderCoverTab;
renderCoverTab = function(content, application, profile, rerender) {
    originalRenderCoverTab(content, application, profile, rerender);
    content.querySelectorAll(".cover-letter-edit-label").forEach(label => {
        const match = label.textContent.match(/^Absatz (\d+)$/);
        if (!match) return;
        const input = label.nextElementSibling;
        if (!input) return;
        const index = Number(match[1]) - 1;
        input.addEventListener("change", () => {
            const body = [...(application.coverLetter.body || [])];
            body[index] = input.value;
            updateApplication(application, { coverLetter: { ...application.coverLetter, body } });
        });
    });
};
