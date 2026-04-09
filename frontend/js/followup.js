window.CARA = window.CARA || {};

(() => {
  const STORAGE_KEY = "cara-followups";

  function readItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (error) {
      console.error("Failed to parse follow-up storage:", error);
      return [];
    }
  }

  function writeItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function renderList() {
    const list = document.querySelector("[data-followup-list]");
    if (!list) return;

    const items = readItems();
    if (!items.length) {
      list.innerHTML = "<p class='text-muted'>No follow-up scheduled yet.</p>";
      return;
    }

    list.innerHTML = items
      .map(
        (item) =>
          `<article class="card card-tight">
            <h4>${item.patient}</h4>
            <p class="text-muted">${item.date} · ${item.reason}</p>
          </article>`,
      )
      .join("");
  }

  function toggleModal(modal, open) {
    if (!modal) return;
    modal.classList.toggle("is-open", open);
    modal.setAttribute("aria-hidden", String(!open));
  }

  function openPanel(panel, open) {
    if (!panel) return;
    panel.setAttribute("aria-hidden", String(!open));
    window.CARA.animations?.animatePanel(panel, open);
  }

  function init() {
    const modal = document.querySelector("[data-followup-modal]");
    const recordModal = document.querySelector("[data-record-modal]");
    const panel = document.querySelector("[data-queue-panel]");
    const openButtons = document.querySelectorAll("[data-open-followup]");
    const closeButtons = document.querySelectorAll("[data-close-followup]");
    const form = document.querySelector("[data-followup-form]");
    const rowButtons = document.querySelectorAll("[data-queue-row]");
    const panelName = document.querySelector("[data-panel-name]");
    const panelCondition = document.querySelector("[data-panel-condition]");
    const openSoapButton = document.querySelector("[data-open-soap]");
    const viewRecordButton = document.querySelector("[data-view-record]");

    openButtons.forEach((button) => {
      button.addEventListener("click", () => toggleModal(modal, true));
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", () => toggleModal(modal, false));
    });

    rowButtons.forEach((button) => {
      if (!button.getAttribute("aria-label")) {
        const patient = button.dataset.patient || "selected patient";
        button.setAttribute("aria-label", `Open details for ${patient}`);
      }

      const open = () => {
        const patient = button.dataset.patient || "Selected patient";
        const condition = button.dataset.condition || "No condition";
        if (panelName) panelName.textContent = patient;
        if (panelCondition) panelCondition.textContent = condition;

        openPanel(panel, true);
      };

      button.addEventListener("click", open);
      button.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      });
    });

    document.querySelectorAll("[data-close-panel]").forEach((button) => {
      button.addEventListener("click", () => {
        openPanel(panel, false);
      });
    });

    if (openSoapButton) {
      openSoapButton.addEventListener("click", () => {
        window.CARA.routerState?.setActive?.("view-soap");
        openPanel(panel, false);
      });
    }

    if (viewRecordButton) {
      viewRecordButton.addEventListener("click", () => toggleModal(recordModal, true));
    }

    document.querySelectorAll("[data-close-record]").forEach((button) => {
      button.addEventListener("click", () => toggleModal(recordModal, false));
    });

    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      openPanel(panel, false);
      toggleModal(modal, false);
      toggleModal(recordModal, false);
    });

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const submitButton = form.querySelector("button[type='submit']");
        if (submitButton) submitButton.disabled = true;
        const payload = {
          patient: form.querySelector("[name='patient']")?.value?.trim() || "Unknown Patient",
          date: form.querySelector("[name='date']")?.value || "No date",
          reason: form.querySelector("[name='reason']")?.value?.trim() || "Review",
        };
        const items = readItems();
        items.unshift(payload);
        writeItems(items);
        renderList();
        toggleModal(modal, false);
        form.reset();
        window.CARA.animations?.showToast("Follow-up scheduled.");
        if (submitButton) submitButton.disabled = false;
      });
    }

    renderList();
  }

  window.CARA.followup = { init, renderList };
  document.addEventListener("DOMContentLoaded", init);
})();
