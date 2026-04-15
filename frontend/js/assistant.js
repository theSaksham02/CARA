window.CARA = window.CARA || {};

(() => {
  const ACTIVE_PATIENT_KEY = "cara-active-patient-id";

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

    const createApi = () => {
      if (!window.CaraApi) return null;
      const baseUrl =
        typeof window.resolveCaraApiBaseUrl === "function"
          ? window.resolveCaraApiBaseUrl()
          : "";
      return new window.CaraApi({ baseUrl });
    };

    document.querySelectorAll("[data-quick-prompt]").forEach((button) => {
      button.addEventListener("click", () => {
        input.value = button.dataset.quickPrompt || "";
        input.focus();
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      const submitButton = form.querySelector("button[type='submit']");
      if (submitButton) submitButton.disabled = true;
      appendBubble(thread, text, "user");
      input.value = "";
      const typingBubble = appendTyping(thread);
      try {
        const api = createApi();
        if (!api) {
          throw new Error("Assistant API unavailable.");
        }
        const response = await api.askAssistant({
          question: text,
          patient_id: window.sessionStorage.getItem(ACTIVE_PATIENT_KEY) || undefined,
          top_k: 5,
        });
        typingBubble.remove();
        const answer = response.escalate
          ? `${response.answer}\n\n(Escalation recommended: ${response.reason || "low confidence"})`
          : response.answer;
        streamAIResponse(thread, answer);
      } catch (error) {
        typingBubble.remove();
        streamAIResponse(
          thread,
          `Unable to retrieve a grounded response right now. ${error.message || ""}`.trim(),
        );
      } finally {
        if (submitButton) submitButton.disabled = false;
        input.focus();
      }
    });
  }

  window.CARA.assistant = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
