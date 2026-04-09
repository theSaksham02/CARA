window.CARA = window.CARA || {};

(() => {
  function parseCounter(text) {
    const value = Number((text || "").replace(/[^0-9.]/g, ""));
    if (Number.isNaN(value)) return { value: 0, suffix: "" };
    const suffix = (text || "").replace(/[0-9.,\s]/g, "");
    return { value, suffix };
  }

  function animateCounter(element) {
    const raw = element.dataset.counter || element.textContent || "0";
    const { value, suffix } = parseCounter(raw);
    const startTime = performance.now();
    const duration = 900;

    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const current = value * eased;
      const output = Number.isInteger(value) ? Math.round(current) : current.toFixed(1);
      element.textContent = `${output}${suffix}`;
      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function init() {
    const counters = Array.from(document.querySelectorAll("[data-counter]"));
    if (!counters.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      counters.forEach((counter) => {
        counter.textContent = counter.dataset.counter || counter.textContent;
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.4 },
    );

    counters.forEach((counter) => observer.observe(counter));
  }

  window.CARA.counters = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
