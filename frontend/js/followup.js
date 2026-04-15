window.CARA = window.CARA || {};

(() => {
  const ACTIVE_PATIENT_KEY = "cara-active-patient-id";

  function createApi() {
    if (!window.CaraApi) return null;
    const baseUrl =
      typeof window.resolveCaraApiBaseUrl === "function"
        ? window.resolveCaraApiBaseUrl()
        : "";
    return new window.CaraApi({ baseUrl });
  }

  async function renderList(api, items) {
    const list = document.querySelector("[data-followup-list]");
    if (!list) return;
    if (!items.length) {
      list.innerHTML = "<p class='text-muted'>No follow-up scheduled yet.</p>";
      return;
    }

    list.innerHTML = items
      .map(
        (item) =>
          `<article class="card card-tight">
            <h4>${item.patient_name || item.patient_id || "Patient"}</h4>
            <p class="text-muted">${item.due_date} · ${item.instructions}</p>
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
    const api = createApi();
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
    const patientField = document.querySelector("[name='patient_id']");

    async function hydratePatientOptions() {
      if (!api || !patientField) return;
      try {
        const { patients } = await api.listPatients();
        const activePatientId = window.sessionStorage.getItem(ACTIVE_PATIENT_KEY);
        patientField.innerHTML = (patients || [])
          .map((patient) => {
            const isSelected = activePatientId && activePatientId === patient.id ? "selected" : "";
            return `<option value="${patient.id}" ${isSelected}>${patient.full_name} (${patient.id.slice(0, 8)}...)</option>`;
          })
          .join("");
      } catch (error) {
        console.error("Unable to load patient options", error);
      }
    }

    async function refreshFollowups() {
      if (!api) return;
      try {
        const { followups } = await api.listFollowups();
        await renderList(api, followups || []);
      } catch (error) {
        window.CARA.animations?.showToast(error.message || "Unable to load follow-ups.");
      }
    }

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
        const patientId = button.dataset.patientId || "";
        if (panelName) panelName.textContent = patient;
        if (panelCondition) panelCondition.textContent = condition;
        if (patientId) {
          window.sessionStorage.setItem(ACTIVE_PATIENT_KEY, patientId);
          if (patientField) patientField.value = patientId;
        }

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
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!api) {
          window.CARA.animations?.showToast("Backend API unavailable.", true);
          return;
        }
        const submitButton = form.querySelector("button[type='submit']");
        if (submitButton) submitButton.disabled = true;
        const payload = {
          patient_id: form.querySelector("[name='patient_id']")?.value?.trim(),
          due_date: form.querySelector("[name='date']")?.value || "",
          instructions: form.querySelector("[name='reason']")?.value?.trim() || "",
          urgency: "YELLOW",
        };

        if (!payload.patient_id || !payload.due_date || !payload.instructions) {
          window.CARA.animations?.showToast("Patient, date, and reason are required.");
          if (submitButton) submitButton.disabled = false;
          return;
        }

        try {
          await api.createFollowup(payload);
          window.sessionStorage.setItem(ACTIVE_PATIENT_KEY, payload.patient_id);
          await refreshFollowups();
          toggleModal(modal, false);
          form.reset();
          await hydratePatientOptions();
          window.CARA.animations?.showToast("Follow-up scheduled.");
        } catch (error) {
          window.CARA.animations?.showToast(error.message || "Failed to schedule follow-up.");
        } finally {
          if (submitButton) submitButton.disabled = false;
        }
      });
    }

    hydratePatientOptions();
    refreshFollowups();
  }

  window.CARA.followup = { init, renderList };
  document.addEventListener("DOMContentLoaded", init);
})();
