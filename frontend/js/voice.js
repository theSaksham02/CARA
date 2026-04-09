window.CARA = window.CARA || {};

(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function speak(text, lang = "en-US") {
    if (!("speechSynthesis" in window)) return false;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function setupDictation() {
    const startButtons = document.querySelectorAll("[data-voice-action='start']");
    if (!startButtons.length) return;

    startButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!SpeechRecognition) {
          window.CARA.animations?.showToast("Voice input is not supported in this browser.");
          return;
        }

        const targetSelector = button.dataset.voiceTarget;
        const target = targetSelector ? document.querySelector(targetSelector) : null;
        if (!target) return;

        const recognition = new SpeechRecognition();
        recognition.lang = document.documentElement.lang || "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.start();

        recognition.onresult = (event) => {
          const transcript = event.results?.[0]?.[0]?.transcript?.trim();
          if (!transcript) return;
          target.value = target.value ? `${target.value} ${transcript}` : transcript;
          target.dispatchEvent(new Event("input"));
        };

        recognition.onerror = () => {
          window.CARA.animations?.showToast("Could not capture audio. Please try again.");
        };
      });
    });
  }

  window.CARA.voice = { speak, setupDictation };
  document.addEventListener("DOMContentLoaded", setupDictation);
})();
