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

  function renderSOAP(noteKey) {
    const note = NOTE_DATA[noteKey] || NOTE_DATA.amara;
    const output = document.querySelector("#soap-output");
    if (!output) return;

    const sections = formatSOAP(note);
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

  function init() {
    const noteButtons = document.querySelectorAll("[data-soap-note]");
    if (!noteButtons.length) return;

    noteButtons.forEach((button) => {
      button.addEventListener("click", () => {
        noteButtons.forEach((node) => node.classList.remove("is-active"));
        button.classList.add("is-active");
        renderSOAP(button.dataset.soapNote || "amara");
      });
    });

    const exportButton = document.querySelector("[data-soap-export]");
    if (exportButton) {
      exportButton.addEventListener("click", () => window.print());
    }

    const sendButton = document.querySelector("[data-soap-send]");
    if (sendButton) {
      sendButton.addEventListener("click", () => {
        window.CARA.animations?.showToast("SOAP note sent to Patient Compass.");
      });
    }

    renderSOAP("amara");
  }

  window.CARA.soap = { formatSOAP, renderSOAP, init };
  document.addEventListener("DOMContentLoaded", init);
})();
