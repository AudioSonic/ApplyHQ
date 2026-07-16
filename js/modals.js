function createModal(title) {
    const modalContainer = document.createElement("div");
    const modal = document.createElement("div");
    const header = document.createElement("h1");
    const btClose = document.createElement("button");

    modalContainer.classList.add("modal-container");
    modal.classList.add("modal");

    header.textContent = title;
    btClose.textContent = "×";

    btClose.addEventListener("click", () => {
        closeModal(modalContainer);
    });

    document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeModal(modalContainer);
    }
    });

    modalContainer.addEventListener("click", event => {
    if (event.target === modalContainer) {
        closeModal(modalContainer);
    }
    });

    modalContainer.append(modal);
    modal.append(header, btClose);

    document.body.append(modalContainer);

    return modalContainer;
}

function closeModal(modal) {
    modal.remove();
}

