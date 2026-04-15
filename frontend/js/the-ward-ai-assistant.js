(function attachWardAssistant(globalScope) {
  'use strict';

  const ACTIVE_PATIENT_KEY = 'cara-active-patient-id';

  function createApi() {
    if (!globalScope.CaraApi) return null;
    const baseUrl =
      typeof globalScope.resolveCaraApiBaseUrl === 'function'
        ? globalScope.resolveCaraApiBaseUrl()
        : '';
    return new globalScope.CaraApi({ baseUrl });
  }

  function getActivePatientId() {
    return globalScope.sessionStorage.getItem(ACTIVE_PATIENT_KEY);
  }

  function addMessage(history, text, isUser, citations = []) {
    if (!history) return;
    const div = document.createElement('div');
    div.className = isUser ? 'flex justify-end ml-24' : 'flex justify-start mr-24';

    const citationHtml =
      !isUser && citations.length
        ? `<div class="mt-3 text-[11px] text-on-surface-variant">Sources: ${citations
            .slice(0, 3)
            .map((citation) => `${citation.source_type}:${citation.source_id || citation.chunk_id}`)
            .join(' | ')}</div>`
        : '';

    div.innerHTML = isUser
      ? `
        <div class="bg-surface-container-lowest px-6 py-4 rounded-xl rounded-tr-none shadow-sm max-w-2xl mt-4">
          <p class="text-sm font-medium text-primary mb-1">Dr. Aris</p>
          <p class="text-on-surface leading-relaxed whitespace-pre-wrap"></p>
        </div>`
      : `
        <div class="border-l-4 border-primary-container bg-surface-container-low px-6 py-5 rounded-xl rounded-tl-none max-w-2xl mt-4">
          <div class="flex items-center gap-2 mb-3">
            <span class="bg-primary-container text-on-primary-container text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">CARA AI</span>
            <span class="text-[10px] text-primary/60 font-semibold bg-primary-fixed-dim/30 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
              <span class="material-symbols-outlined text-[10px]" style="font-variation-settings: 'FILL' 1;">verified</span> Grounded
            </span>
          </div>
          <p class="text-on-surface leading-relaxed whitespace-pre-wrap"></p>
          ${citationHtml}
        </div>`;

    const textNode = div.querySelector('p.text-on-surface');
    if (textNode) {
      textNode.textContent = text;
    }

    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
  }

  function attachQuickPrompts(input) {
    document.querySelectorAll('[data-quick-prompt]').forEach((button) => {
      button.addEventListener('click', () => {
        input.value = button.dataset.quickPrompt || button.textContent.trim();
        input.focus();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const history = document.getElementById('chat-history');
    const api = createApi();
    if (!input || !sendBtn || !history || !api) return;

    attachQuickPrompts(input);

    async function handleSend() {
      const text = input.value.trim();
      if (!text) return;

      addMessage(history, text, true);
      input.value = '';
      sendBtn.disabled = true;

      try {
        const response = await api.askAssistant({
          question: text,
          patient_id: getActivePatientId() || undefined,
          top_k: 5,
        });

        const answer = response.escalate
          ? `${response.answer}\n\n(Escalation recommended: ${response.reason || 'low confidence'})`
          : response.answer;
        addMessage(history, answer, false, response.citations || []);
      } catch (error) {
        addMessage(
          history,
          `Error: ${error.message || 'Could not connect to CARA assistant backend.'}`,
          false
        );
      } finally {
        sendBtn.disabled = false;
      }
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSend();
      }
    });
  });
})(window);
