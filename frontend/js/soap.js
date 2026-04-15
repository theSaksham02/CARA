window.CARA = window.CARA || {};

(() => {
  const KEYWORDS = {
    subjective: ["reports", "complains", "feels", "pain", "history", "cough"],
    objective: ["temperature", "bp", "pulse", "spo2", "respiratory", "exam"],
    assessment: ["suspected", "likely", "diagnosis", "impression", "assessment"],
    plan: ["refer", "give", "start", "prescribe", "follow-up", "schedule"],
  };

  const NOTE_DATA = {
    amara:
      "Patient reports chest pain for 2 hours. Temperature is 38.1C and BP is 145/90. Suspected severe pneumonia. Refer urgently and schedule follow-up.",
    elena:
      "Patient complains of breathlessness. Pulse is 112 and oxygen saturation is 91%. Assessment suggests acute cardiopulmonary risk. Start oxygen and refer immediately.",
    julian:
      "Patient feels mild dizziness. BP is 138/84. Assessment indicates moderate dehydration. Give oral fluids and follow-up tomorrow.",
    silas:
      "Patient reports mild throat discomfort. Exam otherwise normal. Assessment is viral upper respiratory infection. Prescribe rest and home care.",
  };

  const ACTIVE_PATIENT_KEY = "cara-active-patient-id";
  let currentNoteKey = "amara";

  function createApi() {
    if (!window.CaraApi) return null;
    const baseUrl =
      typeof window.resolveCaraApiBaseUrl === "function"
        ? window.resolveCaraApiBaseUrl()
        : "";
    return new window.CaraApi({ baseUrl });
  }

  function sectionForSentence(sentence) {
    const text = sentence.toLowerCase();
    if (KEYWORDS.objective.some((word) => text.includes(word))) return "objective";
    if (KEYWORDS.assessment.some((word) => text.includes(word))) return "assessment";
    if (KEYWORDS.plan.some((word) => text.includes(word))) return "plan";
    if (KEYWORDS.subjective.some((word) => text.includes(word))) return "subjective";
    return "subjective";
  }

  function formatSOAP(note) {
    const sections = {
      subjective: [],
      objective: [],
      assessment: [],
      plan: [],
    };

    note
      .split(/[.?!]+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((sentence) => {
        sections[sectionForSentence(sentence)].push(sentence);
      });

    return sections;
  }

  function renderSOAPFromSections(sections) {
    const output = document.querySelector("#soap-output");
    if (!output) return;
    output.innerHTML = `
      <article class="card card-tight">
        <h3>Subjective</h3>
        <p>${sections.subjective.join(". ") || "No subjective data captured."}</p>
      </article>
      <article class="card card-tight">
        <h3>Objective</h3>
        <p>${sections.objective.join(". ") || "No objective data captured."}</p>
      </article>
      <article class="card card-tight">
        <h3>Assessment</h3>
        <p>${sections.assessment.join(". ") || "No assessment data captured."}</p>
      </article>
      <article class="card card-tight">
        <h3>Plan</h3>
        <p>${sections.plan.join(". ") || "No plan data captured."}</p>
      </article>
    `;
  }

  function renderSOAP(noteKey) {
    const note = NOTE_DATA[noteKey] || NOTE_DATA.amara;
    const sections = formatSOAP(note);
    renderSOAPFromSections(sections);
  }

  function init() {
    const noteButtons = document.querySelectorAll("[data-soap-note]");
    if (!noteButtons.length) return;

    noteButtons.forEach((button) => {
      button.addEventListener("click", () => {
        noteButtons.forEach((node) => node.classList.remove("is-active"));
        button.classList.add("is-active");
        currentNoteKey = button.dataset.soapNote || "amara";
        renderSOAP(currentNoteKey);
      });
    });

    const exportButton = document.querySelector("[data-soap-export]");
    if (exportButton) {
      exportButton.addEventListener("click", () => window.print());
    }

    const sendButton = document.querySelector("[data-soap-send]");
    if (sendButton) {
      sendButton.addEventListener("click", async () => {
        const transcriptInput = document.querySelector("#manual-note");
        const transcript = transcriptInput?.value?.trim() || NOTE_DATA[currentNoteKey] || "";
        if (!transcript) {
          window.CARA.animations?.showToast("Add a transcript before sending.");
          return;
        }

        const api = createApi();
        if (!api) {
          window.CARA.animations?.showToast("Backend API unavailable.");
          return;
        }

        sendButton.disabled = true;
        sendButton.textContent = "Saving...";
        try {
          const response = await api.generateNote({
            patient_id: window.sessionStorage.getItem(ACTIVE_PATIENT_KEY) || undefined,
            transcript,
          });
          const note = response.note || {};
          renderSOAPFromSections({
            subjective: Array.isArray(note.subjective) ? note.subjective : [note.subjective].filter(Boolean),
            objective: Array.isArray(note.objective) ? note.objective : [note.objective].filter(Boolean),
            assessment: Array.isArray(note.assessment) ? note.assessment : [note.assessment].filter(Boolean),
            plan: Array.isArray(note.plan) ? note.plan : [note.plan].filter(Boolean),
          });
          window.CARA.animations?.showToast("SOAP note saved to backend.");
        } catch (error) {
          window.CARA.animations?.showToast(error.message || "Unable to save SOAP note.");
        } finally {
          sendButton.disabled = false;
          sendButton.textContent = "Send to Patient Compass";
        }
      });
    }

    renderSOAP("amara");
  }

  window.CARA.soap = { formatSOAP, renderSOAP, init };
  document.addEventListener("DOMContentLoaded", init);
})();
