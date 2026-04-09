window.CARA = window.CARA || {};

(() => {
  const RESPONSES = [
    "Protocol check complete: classify as YELLOW, monitor hydration and repeat vitals in 30 minutes.",
    "Based on IMCI logic, this symptom cluster needs immediate referral and first-dose antibiotic.",
    "No red-flag indicators detected. Continue routine care and schedule next visit.",
  ];

  function appendBubble(thread, text, type = "ai") {
    const bubble = document.createElement("article");
    bubble.className = `bubble chat-bubble ${type === "user" ? "bubble-user" : "bubble-ai"}`;
    bubble.textContent = text;
    thread.appendChild(bubble);
    requestAnimationFrame(() => bubble.classList.add("is-visible"));
    thread.scrollTop = thread.scrollHeight;
  }

  function appendTyping(thread) {
    const bubble = document.createElement("article");
    bubble.className = "bubble chat-bubble bubble-ai is-visible";
    bubble.setAttribute("aria-live", "polite");
    bubble.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
    return bubble;
  }

  function streamAIResponse(thread, text) {
    const bubble = document.createElement("article");
    bubble.className = "bubble chat-bubble bubble-ai";
    thread.appendChild(bubble);
    requestAnimationFrame(() => bubble.classList.add("is-visible"));

    const chars = Array.from(text);
    let index = 0;

    const tick = () => {
      bubble.textContent = chars.slice(0, index).join("");
      thread.scrollTop = thread.scrollHeight;
      if (index < chars.length) {
        index += 1;
        window.setTimeout(tick, 12);
      }
    };

    tick();
  }

  function init() {
    const form = document.querySelector("#assistant-form");
    const input = document.querySelector("#assistant-input");
    const thread = document.querySelector("#assistant-thread");
    if (!form || !input || !thread) return;

    document.querySelectorAll("[data-quick-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        input.value = button.dataset.quickPrompt || "";
        input.focus();
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const submitButton = form.querySelector("button[type='submit']");
      if (submitButton) submitButton.disabled = true;
      appendBubble(thread, text, "user");
      input.value = "";
      const typingBubble = appendTyping(thread);
      window.setTimeout(() => {
        typingBubble.remove();
        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        streamAIResponse(thread, response);
        if (submitButton) submitButton.disabled = false;
        input.focus();
      }, 520);
    });
  }

  window.CARA.assistant = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
