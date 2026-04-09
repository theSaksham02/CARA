window.CARA = window.CARA || {};

(() => {
  const DANGER_SIGNS = ["cannot drink", "convulsions", "unconscious", "severe breathing"];

  const RULES = [
    {
      urgency: "Red",
      reason: "Danger sign: immediate referral required.",
      match: (symptoms) => symptoms.some((symptom) => DANGER_SIGNS.includes(symptom)),
    },
    {
      urgency: "Red",
      reason: "Danger sign: difficulty breathing in child under 2.",
      match: (symptoms, ageMonths) =>
        ageMonths < 24 && symptoms.includes("fever") && symptoms.includes("severe breathing"),
    },
    {
      urgency: "Yellow",
      reason: "Moderate risk: monitor and follow-up within 24 hours.",
      match: (symptoms) => symptoms.includes("fever") || symptoms.includes("diarrhoea"),
    },
  ];

  function classify(symptoms, ageMonths) {
    const normalized = symptoms.map((item) => item.toLowerCase().trim());
    const rule = RULES.find((entry) => entry.match(normalized, ageMonths));
    if (rule) return { urgency: rule.urgency, reason: rule.reason };
    return { urgency: "Green", reason: "No major danger signs detected. Routine care advised." };
  }

  function badgeClass(urgency) {
    if (urgency === "Red") return "badge badge-red";
    if (urgency === "Yellow") return "badge badge-yellow";
    return "badge badge-green";
  }

  function init() {
    const form = document.querySelector("#triage-form");
    if (!form) return;
    const result = document.querySelector("#triage-result");
    const selected = new Set();

    form.querySelectorAll("[data-symptom]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const symptom = chip.dataset.symptom;
        if (!symptom) return;
        const has = selected.has(symptom);
        if (has) {
          selected.delete(symptom);
          chip.setAttribute("aria-pressed", "false");
        } else {
          selected.add(symptom);
          chip.setAttribute("aria-pressed", "true");
        }
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!selected.size) {
        window.CARA.animations?.showToast("Select at least one symptom before running triage.");
        return;
      }

      const ageMonths = Number(form.querySelector("[name='age-months']")?.value || 0);
      const triage = classify(Array.from(selected), ageMonths);

      if (!result) return;
      result.hidden = false;
      result.querySelector("[data-triage-badge]").className = badgeClass(triage.urgency);
      result.querySelector("[data-triage-badge]").textContent = triage.urgency;
      result.querySelector("[data-triage-reason]").textContent = triage.reason;
      result.querySelector("[data-triage-json]").textContent = JSON.stringify(
        { symptoms: Array.from(selected), age_months: ageMonths },
        null,
        2,
      );

      if (window.CARA.animations) window.CARA.animations.showToast(`Triage: ${triage.urgency}`);
    });
  }

  window.CARA.triage = { classify, init };
  document.addEventListener("DOMContentLoaded", init);
})();
