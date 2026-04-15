(function attachJoinUs(globalScope) {
  'use strict';

  function showFeedback(target, message, isError) {
    if (!target) return;
    target.textContent = message;
    target.className = isError
      ? 'text-sm font-semibold text-error mt-2'
      : 'text-sm font-semibold text-primary mt-2';
  }

  function createApi() {
    if (!globalScope.CaraApi) return null;
    const baseUrl =
      typeof globalScope.resolveCaraApiBaseUrl === 'function'
        ? globalScope.resolveCaraApiBaseUrl()
        : '';
    return new globalScope.CaraApi({ baseUrl });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('[data-join-form]');
    if (!form) return;
    const api = createApi();
    if (!api) return;

    const feedback = form.querySelector('[data-form-feedback]');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const payload = {
        name: form.querySelector('[name="name"]')?.value?.trim() || '',
        email: form.querySelector('[name="email"]')?.value?.trim() || '',
        role: form.querySelector('[name="role"]')?.value?.trim() || '',
        message: form.querySelector('[name="message"]')?.value?.trim() || '',
      };

      if (!payload.name || !payload.email || !payload.role || !payload.message) {
        showFeedback(feedback, 'Please complete all required fields before submitting.', true);
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
      }
      showFeedback(feedback, '', false);

      try {
        const response = await api.submitJoinUs(payload);
        showFeedback(
          feedback,
          response.message || 'Thanks! Your details were received. The CARA team will contact you.',
          false
        );
        form.reset();
      } catch (error) {
        showFeedback(feedback, error.message || 'Unable to submit right now. Please try again.', true);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Send Message';
        }
      }
    });
  });
})(window);
