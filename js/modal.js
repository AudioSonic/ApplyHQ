function createModal() {
    const modalContainer = document.createElement("div");
    const modal = document.createElement("div");
    const modalHeader = document.createElement("header");
    const modalContent = document.createElement("section");
    const modalFooter = document.createElement("footer");
    const modalTitle = document.createElement("h2");
    const btCloseModal = document.createElement("button");

    modalContainer.classList.add("modal-container");
    modal.classList.add("modal");
    modalHeader.classList.add("modal-header");
    modalContent.classList.add("modal-content");
    modalFooter.classList.add("modal-footer");
    btCloseModal.classList.add("close-modal-button");
    btCloseModal.type = "button";
    btCloseModal.setAttribute("aria-label", "Modal schließen");
    btCloseModal.textContent = "\u00d7";

    function closeCurrentModal() {
        document.removeEventListener("keydown", handleEscapeKey);
        closeModal(modalContainer);
    }

    function handleEscapeKey(event) {
        if(event.key === "Escape"){
            closeCurrentModal();
        }
    }

    btCloseModal.addEventListener("click", closeCurrentModal);
    document.addEventListener("keydown", handleEscapeKey);
    modalContainer.addEventListener("click", event => {
        if(event.target === modalContainer){
            closeCurrentModal();
        }
    });

    modalContainer.append(modal);
    modal.append(modalHeader, modalContent, modalFooter);
    modalHeader.append(modalTitle, btCloseModal);
    document.body.append(modalContainer);

    return {
        container: modalContainer,
        content: modalContent,
        footer: modalFooter,
        title: modalTitle
    };
}

function closeModal(modal) {
    if(!modal){
        return;
    }

    modal.remove();
}
