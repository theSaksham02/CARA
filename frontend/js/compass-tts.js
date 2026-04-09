window.CARA = window.CARA || {};

(() => {
  const LANG_CONFIG = {
    en: { locale: "en-US", label: "English" },
    sw: { locale: "sw-TZ", label: "Swahili" },
    hi: { locale: "hi-IN", label: "Hindi" },
  };

  const COPY = {
    en: {
      homeHeading: "Hello, Amara",
      homeSub: "Here is your health summary from today.",
      urgentTitle: "See the doctor now",
      urgentBody: "Your symptoms need immediate attention.",
      whatDo: "What should I do?",
      returnTitle: "Come back on Thursday, 17 April",
      savePhone: "Save to my phone",
      helpLabel: "Need urgent help right now?",
    },
    sw: {
      homeHeading: "Habari, Amara",
      homeSub: "Huu ni muhtasari wako wa afya wa leo.",
      urgentTitle: "Muone daktari sasa",
      urgentBody: "Dalili zako zinahitaji huduma ya haraka.",
      whatDo: "Nifanye nini?",
      returnTitle: "Rudi Alhamisi, 17 Aprili",
      savePhone: "Hifadhi kwenye simu yangu",
      helpLabel: "Unahitaji msaada wa haraka sasa?",
    },
    hi: {
      homeHeading: "नमस्ते, अमारा",
      homeSub: "आज की आपकी स्वास्थ्य जानकारी यहाँ है।",
      urgentTitle: "अभी डॉक्टर से मिलें",
      urgentBody: "आपके लक्षणों पर तुरंत ध्यान चाहिए।",
      whatDo: "मुझे क्या करना चाहिए?",
      returnTitle: "गुरुवार, 17 अप्रैल को वापस आएँ",
      savePhone: "मेरे फ़ोन में सेव करें",
      helpLabel: "क्या अभी तुरंत मदद चाहिए?",
    },
  };

  let currentLang = "en";

  function speakFromElement(element) {
    const targetSelector = element.dataset.ttsTarget;
    const directText = element.dataset.ttsText;
    let text = directText || "";
    if (!text && targetSelector) {
      const target = document.querySelector(targetSelector);
      text = target?.textContent?.trim() || "";
    }
    if (!text) return;
    window.CARA.voice?.speak(text, LANG_CONFIG[currentLang].locale);
  }

  function updateLanguage(lang) {
    if (!COPY[lang]) return;
    currentLang = lang;
    document.documentElement.lang = LANG_CONFIG[lang].locale;

    document.querySelectorAll("[data-i18n-key]").forEach((node) => {
      const key = node.dataset.i18nKey;
      if (!key || !COPY[lang][key]) return;
      node.textContent = COPY[lang][key];
    });

    document.querySelectorAll("[data-lang]").forEach((button) => {
      const selected = button.dataset.lang === lang;
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function downloadICS() {
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CARA//FollowUp//EN",
      "BEGIN:VEVENT",
      "UID:cara-followup-001@example.com",
      "DTSTAMP:20260417T090000Z",
      "DTSTART:20260417T090000Z",
      "DTEND:20260417T100000Z",
      "SUMMARY:CARA Follow-up Visit",
      "DESCRIPTION:Follow-up check-up scheduled by CARA.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cara-followup.ics";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function init() {
    if (document.body.dataset.router !== "compass") return;

    document.querySelectorAll("[data-lang]").forEach((button) => {
      button.addEventListener("click", () => updateLanguage(button.dataset.lang || "en"));
    });

    document.querySelectorAll("[data-tts]").forEach((button) => {
      button.addEventListener("click", () => speakFromElement(button));
    });

    const saveButton = document.querySelector("[data-save-calendar]");
    if (saveButton) saveButton.addEventListener("click", downloadICS);

    document.querySelectorAll("[data-med-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const active = button.getAttribute("aria-pressed") === "true";
        button.setAttribute("aria-pressed", String(!active));
      });
    });

    const helpToggle = document.querySelector("[data-help-toggle]");
    const helpExpand = document.querySelector("[data-help-expand]");
    if (helpToggle && helpExpand) {
      helpToggle.addEventListener("click", () => {
        const open = helpExpand.classList.toggle("is-open");
        helpToggle.setAttribute("aria-expanded", String(open));
      });
    }

    const mapsButton = document.querySelector("[data-open-maps]");
    if (mapsButton) {
      mapsButton.addEventListener("click", () => {
        const query = encodeURIComponent("nearest clinic near me");
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
      });
    }

    updateLanguage(currentLang);
  }

  window.CARA.compass = { init, updateLanguage };
  document.addEventListener("DOMContentLoaded", init);
})();
