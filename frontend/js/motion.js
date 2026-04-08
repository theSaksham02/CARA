const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const page = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
const revealCallbacks = new WeakMap();
const splitTextCache = new WeakSet();
const parallaxItems = [];
let revealObserver;
let progressBar;

const longPages = new Set([
  "about.html",
  "research.html",
  "privacy-ethics.html",
  "index.html",
  "join-us.html",
]);

const onceVisible = (element, callback) => {
  if (!element) return;
  markReveal(element);
  revealCallbacks.set(element, callback);
};

const markReveal = (element, delay = 0) => {
  if (!element) return;
  element.dataset.reveal = "true";
  element.style.setProperty("--cara-delay", `${delay}ms`);
};

const prepareSequence = (elements, start = 0, step = 70) => {
  elements.forEach((element, index) => markReveal(element, start + index * step));
};

const applyReadyState = () => {
  document.documentElement.classList.add("js");
  if (prefersReducedMotion) {
    document.documentElement.classList.add("reduced-motion");
  }
  document.body.classList.add("cara-shell");
};

const initProgressBar = () => {
  if (!longPages.has(page)) return;

  progressBar = document.createElement("div");
  progressBar.className = "cara-progress";
  progressBar.setAttribute("aria-hidden", "true");
  document.body.append(progressBar);

  const update = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    progressBar.style.setProperty("--cara-progress", `${Math.min(Math.max(progress, 0), 1)}`);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
};

const initScrollChrome = () => {
  const toggle = () => {
    document.body.classList.toggle("is-scrolled", window.scrollY > 16);
  };

  toggle();
  window.addEventListener("scroll", toggle, { passive: true });
};

const initRevealObserver = () => {
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        const callback = revealCallbacks.get(entry.target);
        if (callback) callback(entry.target);
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  qa("[data-reveal]").forEach((element) => {
    if (prefersReducedMotion) {
      element.classList.add("is-visible");
      const callback = revealCallbacks.get(element);
      if (callback) callback(element);
      return;
    }
    revealObserver.observe(element);
  });
};

const animate = (element, keyframes, options) => {
  if (!element) return;
  if (prefersReducedMotion) {
    if (Array.isArray(keyframes) && keyframes.length) {
      Object.entries(keyframes[keyframes.length - 1]).forEach(([property, value]) => {
        element.style[property] = value;
      });
    }
    return;
  }
  element.animate(keyframes, options);
};

const splitCharacters = (element) => {
  if (!element || splitTextCache.has(element)) return [];

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let current;
  while ((current = walker.nextNode())) {
    if (!current.textContent.trim()) continue;
    nodes.push(current);
  }

  const chars = [];
  nodes.forEach((textNode) => {
    const fragment = document.createDocumentFragment();
    [...textNode.textContent].forEach((char) => {
      const span = document.createElement("span");
      span.className = "cara-char";
      span.textContent = char === " " ? "\u00A0" : char;
      fragment.append(span);
      chars.push(span);
    });
    textNode.parentNode.replaceChild(fragment, textNode);
  });

  splitTextCache.add(element);
  return chars;
};

const splitWords = (element) => {
  if (!element || splitTextCache.has(element)) return [];

  const text = element.textContent.trim().split(/\s+/);
  element.textContent = "";
  const words = text.map((word, index) => {
    const span = document.createElement("span");
    span.className = "cara-word";
    span.textContent = word;
    element.append(span);
    if (index < text.length - 1) {
      element.append(document.createTextNode(" "));
    }
    return span;
  });

  splitTextCache.add(element);
  return words;
};

const setupSplitHero = (element) => {
  const chars = splitCharacters(element);
  chars.forEach((char, index) => {
    char.style.setProperty("--cara-char-delay", `${index * 20}ms`);
  });

  onceVisible(element, () => {
    chars.forEach((char, index) => {
      animate(
        char,
        [
          { opacity: 0, transform: "translate3d(0, 1.15em, 0)", filter: "blur(8px)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0)" },
        ],
        {
          duration: 900,
          delay: index * 20,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      );
    });
  });
};

const setupWordReveal = (element) => {
  const words = splitWords(element);
  onceVisible(element, () => {
    words.forEach((word, index) => {
      animate(
        word,
        [
          { opacity: 0, transform: "translate3d(0, 0.5em, 0)", filter: "blur(8px)" },
          { opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0)" },
        ],
        {
          duration: 760,
          delay: index * 60,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      );
    });
  });
};

const setupTypewriter = (element, delay = 0) => {
  if (!element) return;
  const finalText = element.textContent.trim();
  element.textContent = "";
  element.classList.add("cara-type-cursor");

  onceVisible(element, () => {
    if (prefersReducedMotion) {
      element.textContent = finalText;
      element.classList.remove("cara-type-cursor");
      return;
    }

    let index = 0;
    const tick = () => {
      index += 1;
      element.textContent = finalText.slice(0, index);
      if (index < finalText.length) {
        window.setTimeout(tick, 24);
      } else {
        window.setTimeout(() => element.classList.remove("cara-type-cursor"), 500);
      }
    };

    window.setTimeout(tick, delay);
  });
};

const initUnderlines = () => {
  qa("nav a, footer a, aside a, header a").forEach((link) => {
    if (link.closest(".rounded-full")) return;
    link.classList.add("cara-link");
  });
};

const isLargeButton = (element) =>
  element.matches("button, a") &&
  element.className.includes("rounded-full") &&
  element.offsetWidth >= 96 &&
  normalizeText(element.textContent).length > 4;

const normalizeText = (value) => value.replace(/\s+/g, " ").trim().toLowerCase();

const initRipples = () => {
  qa("button, a.rounded-full").forEach((element) => {
    element.classList.add("cara-interactive");
    element.addEventListener("click", (event) => {
      const rect = element.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "cara-ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      element.append(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    });
  });
};

const initMagneticButtons = () => {
  if (!supportsHover || prefersReducedMotion) return;

  qa("button, a").filter(isLargeButton).forEach((element) => {
    element.classList.add("cara-magnetic");

    const reset = () => {
      element.style.setProperty("--cara-mx", "0px");
      element.style.setProperty("--cara-my", "0px");
    };

    element.addEventListener("mousemove", (event) => {
      const rect = element.getBoundingClientRect();
      const offsetX = event.clientX - rect.left - rect.width / 2;
      const offsetY = event.clientY - rect.top - rect.height / 2;
      element.style.setProperty("--cara-mx", `${Math.max(Math.min(offsetX * 0.15, 8), -8)}px`);
      element.style.setProperty("--cara-my", `${Math.max(Math.min(offsetY * 0.15, 8), -8)}px`);
    });

    element.addEventListener("mouseleave", reset);
    element.addEventListener("blur", reset);
  });
};

const registerTilt = (elements) => {
  if (!supportsHover || prefersReducedMotion) return;

  elements.forEach((element) => {
    element.classList.add("cara-tilt-card");

    const reset = () => {
      element.style.setProperty("--cara-tilt-x", "0deg");
      element.style.setProperty("--cara-tilt-y", "0deg");
      element.style.setProperty("--cara-glare-x", "50%");
      element.style.setProperty("--cara-glare-y", "50%");
    };

    element.addEventListener("mousemove", (event) => {
      const rect = element.getBoundingClientRect();
      const offsetX = (event.clientX - rect.left) / rect.width;
      const offsetY = (event.clientY - rect.top) / rect.height;
      const tiltY = (offsetX - 0.5) * 8;
      const tiltX = (0.5 - offsetY) * 8;

      element.style.setProperty("--cara-tilt-x", `${tiltX.toFixed(2)}deg`);
      element.style.setProperty("--cara-tilt-y", `${tiltY.toFixed(2)}deg`);
      element.style.setProperty("--cara-glare-x", `${offsetX * 100}%`);
      element.style.setProperty("--cara-glare-y", `${offsetY * 100}%`);
    });

    element.addEventListener("mouseleave", reset);
    element.addEventListener("blur", reset);
    reset();
  });
};

const registerParallax = (element, speed = 0.12) => {
  if (!element || prefersReducedMotion) return;
  element.classList.add("cara-parallax");
  parallaxItems.push({ element, speed });
};

const initParallax = () => {
  if (!parallaxItems.length || prefersReducedMotion) return;

  const update = () => {
    parallaxItems.forEach(({ element, speed }) => {
      const rect = element.getBoundingClientRect();
      const distance = rect.top - window.innerHeight / 2;
      element.style.setProperty("--cara-parallax-y", `${distance * -speed}px`);
    });
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
};

const initCounters = (elements) => {
  elements.forEach((element) => {
    const parsed = parseCounter(element.textContent.trim());
    if (!parsed) return;

    onceVisible(element, () => {
      if (prefersReducedMotion) {
        element.textContent = parsed.format(parsed.value);
        return;
      }

      const start = performance.now();
      const duration = 1200;
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = parsed.value * eased;
        element.textContent = parsed.format(current);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          element.textContent = parsed.format(parsed.value);
        }
      };

      requestAnimationFrame(step);
    });
  });
};

const parseCounter = (text) => {
  if (!text || /\d-\d/.test(text)) return null;
  const clean = text.replace(/,/g, "").trim();

  if (/^\d+$/.test(clean)) {
    const padding = text.startsWith("0") ? text.length : 0;
    return {
      value: Number(clean),
      format: (value) => {
        const rounded = Math.round(value);
        return padding ? String(rounded).padStart(padding, "0") : `${rounded}`;
      },
    };
  }

  if (/^\d{1,3}(,\d{3})+$/.test(text)) {
    return {
      value: Number(clean),
      format: (value) => Math.round(value).toLocaleString("en-US"),
    };
  }

  if (/^\d+(\.\d+)?%$/.test(clean)) {
    const decimals = clean.includes(".") ? clean.split(".")[1].length - 1 : 0;
    return {
      value: Number(clean.slice(0, -1)),
      format: (value) => `${value.toFixed(decimals)}%`,
    };
  }

  if (/^\d+(\.\d+)?m$/.test(clean)) {
    const decimals = clean.includes(".") ? clean.split(".")[1].length - 1 : 0;
    return {
      value: Number(clean.slice(0, -1)),
      format: (value) => `${value.toFixed(decimals)}m`,
    };
  }

  if (/^\d+(\.\d+)?M$/.test(clean)) {
    const decimals = clean.includes(".") ? clean.split(".")[1].length - 1 : 0;
    return {
      value: Number(clean.slice(0, -1)),
      format: (value) => `${value.toFixed(decimals)}M`,
    };
  }

  if (/^\d+(\.\d+)?\s*billion\+$/i.test(clean)) {
    return {
      value: Number(clean.replace(/[^\d.]/g, "")),
      format: (value) => `${Math.round(value)} Billion+`,
    };
  }

  if (/^\d+(\.\d+)?x$/i.test(clean) || /^\d+(\.\d+)?×$/.test(clean)) {
    const symbol = clean.endsWith("×") ? "×" : "x";
    return {
      value: Number(clean.slice(0, -1)),
      format: (value) => `${Math.round(value)}${symbol}`,
    };
  }

  if (/^\d+\s*sec$/i.test(clean)) {
    return {
      value: Number(clean.replace(/[^\d.]/g, "")),
      format: (value) => `${Math.round(value)} sec`,
    };
  }

  return null;
};

const initBadgeMorphs = () => {
  const badgeMatcher = /^(red|yellow|green|critical|urgent|stable|high priority|immediate|high triage)$/i;
  qa("span").forEach((badge) => {
    if (!badgeMatcher.test(normalizeText(badge.textContent))) return;
    badge.classList.add("cara-badge");
    onceVisible(badge, () => badge.classList.add("cara-badge-live"));
  });
};

const initBellShake = () => {
  qa("button, span").forEach((element) => {
    const icon = element.matches(".material-symbols-outlined")
      ? element
      : q(".material-symbols-outlined", element);
    if (!icon || normalizeText(icon.textContent) !== "notifications") return;

    const dot = element.parentElement?.querySelector(".bg-error.rounded-full, .bg-error.rounded-full.border-2");
    if (!dot && !element.closest("button")?.parentElement?.querySelector(".bg-error")) return;

    icon.classList.add("cara-alert-bell");
    onceVisible(icon, () => {
      icon.classList.add("cara-bell-ring");
      window.setTimeout(() => icon.classList.remove("cara-bell-ring"), 900);
    });
  });
};

const initFieldFocus = () => {
  qa("form .flex.flex-col.gap-2").forEach((field) => {
    const label = q("label", field);
    const input = q("input, textarea, select", field);
    if (!label || !input) return;

    field.classList.add("cara-field");
    label.classList.add("cara-field-label");
    input.classList.add("cara-field-input");

    const sync = () => {
      const active = document.activeElement === input || !!input.value;
      field.classList.toggle("is-active", active);
    };

    sync();
    input.addEventListener("focus", sync);
    input.addEventListener("blur", sync);
    input.addEventListener("input", sync);
    input.addEventListener("change", sync);
  });
};

const initSearchShells = () => {
  qa("div.relative").forEach((shell) => {
    const input = q("input", shell);
    const icon = q(".material-symbols-outlined", shell);
    if (!input || !icon || normalizeText(icon.textContent) !== "search") return;
    shell.classList.add("cara-search-shell");
  });
};

const initSkeletonPanels = (elements) => {
  elements.forEach((element) => {
    element.classList.add("cara-skeleton-shell");
    window.setTimeout(() => {
      element.classList.add("cara-skeleton-loaded");
    }, 650);
  });
};

const initImageWipes = (elements) => {
  elements.forEach((element) => {
    element.classList.add("cara-image-wipe");
    onceVisible(element, () => element.classList.add("cara-image-ready"));
  });
};

const initBarChartAnimations = () => {
  qa(".h-1.w-full.bg-surface-container-high.rounded-full.overflow-hidden > div").forEach((bar) => {
    bar.classList.add("cara-scale-x");
    onceVisible(bar, () => bar.classList.add("cara-chart-ready"));
  });

  qa("[class*='h-['][class*='rounded-t-md']").forEach((bar) => {
    bar.classList.add("cara-scale-y");
    onceVisible(bar, () => bar.classList.add("cara-chart-ready"));
  });

  qa("[class*='w-['][class*='bg-primary'], [class*='w-['][class*='bg-secondary-fixed']").forEach((bar) => {
    if (!bar.closest(".rounded-full")) return;
    bar.classList.add("cara-scale-x");
    onceVisible(bar, () => bar.classList.add("cara-chart-ready"));
  });
};

const initCircularMeters = () => {
  qa("circle[stroke-dasharray]").forEach((circle) => {
    const finalOffset = circle.getAttribute("stroke-dashoffset") || "0";
    circle.dataset.finalOffset = finalOffset;
    circle.setAttribute("stroke-dashoffset", circle.getAttribute("stroke-dasharray"));
    onceVisible(circle, () => {
      animate(
        circle,
        [
          { strokeDashoffset: circle.getAttribute("stroke-dasharray") },
          { strokeDashoffset: finalOffset },
        ],
        {
          duration: 1400,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      );
    });
  });

  qa(".relative.w-48.h-48.rounded-full")
    .filter((chart) => chart.className.includes("border-[16px]"))
    .forEach((chart) => {
      chart.classList.add("cara-donut");
      onceVisible(chart, () => chart.classList.add("cara-donut-live"));
    });
};

const initReturnPulse = () => {
  const card = qa("section").find((section) => normalizeText(section.textContent).includes("come back on"));
  if (!card) return;
  card.classList.add("cara-return-date");
  onceVisible(card, () => card.classList.add("cara-return-live"));
};

const initSymptomIcons = () => {
  const cards = qa("main > .grid.grid-cols-3 > div, .grid.grid-cols-3 > div")
    .filter((card) => normalizeText(card.textContent).includes("breathing fast") || normalizeText(card.textContent).includes("fever") || normalizeText(card.textContent).includes("not drinking"));

  cards.forEach((card, index) => {
    card.classList.add("cara-symptom-card");
    onceVisible(card, () => {
      animate(
        card,
        [
          {
            opacity: 0,
            transform: `translate3d(${[-80, 0, 80][index] || 0}px, ${[40, -50, 32][index] || 32}px, 0) scale(0.92)`,
          },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          duration: 700,
          delay: index * 120,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards",
        }
      );
    });
  });
};

const initHeroBackgrounds = () => {
  const heroSelectors = {
    "index.html": "body > section:first-of-type",
    "about.html": "main > section:first-of-type",
    "research.html": "main > header:first-of-type",
    "join-us.html": "main > section:first-of-type",
    "patient-compass-home.html": "main > section:first-of-type",
  };

  const heroSelector = heroSelectors[page];
  if (!heroSelector) return;

  const hero = q(heroSelector);
  if (!hero) return;
  hero.classList.add("cara-hero-shell");

  const imageContainer = q("img", hero)?.parentElement;
  if (imageContainer) {
    registerParallax(imageContainer, 0.1);
    initImageWipes([imageContainer]);
  }

  if (page === "index.html") {
    const mockup = q("section .relative > .bg-surface-container-lowest", hero.parentElement || document);
    if (mockup) registerParallax(mockup, 0.06);
  }
};

const initPageSpecific = () => {
  const publicSections = qa("body > nav, body > section, body > footer, main > section, main > header, main > div, footer > div");
  prepareSequence(publicSections.filter((element) => element.offsetParent !== null), 0, 70);

  switch (page) {
    case "index.html": {
      const headline = q("section h1");
      if (headline) setupSplitHero(headline);

      const cards = qa("section:nth-of-type(3) .grid > div, section:nth-of-type(6) .animate-marquee > div");
      registerTilt(cards.filter((card) => card.closest("section")));
      prepareSequence(qa("section:nth-of-type(3) .grid > div, section:nth-of-type(4) .grid > div, section:nth-of-type(6) .animate-marquee > div"), 120, 90);
      initCounters(
        qa("section:nth-of-type(2) .text-4xl, section:nth-of-type(5) .text-8xl")
      );
      break;
    }
    case "about.html": {
      const paragraph = q("main > section:first-of-type p.text-xl");
      if (paragraph) setupWordReveal(paragraph);
      registerTilt(qa("main .grid.grid-cols-1.md\\:grid-cols-5 > div"));
      initImageWipes([q("main > section:first-of-type .relative.h-\\[600px\\]")].filter(Boolean));
      prepareSequence(qa("main > section:nth-of-type(3) .grid > div, main > section:nth-of-type(4) .grid > div"), 120, 80);
      break;
    }
    case "research.html": {
      registerTilt(qa("main > section:nth-of-type(1) .grid > div, main > section:nth-of-type(2) .grid > div"));
      initBarChartAnimations();
      prepareSequence(qa("main > section > div.grid > div"), 80, 100);
      break;
    }
    case "join-us.html": {
      registerTilt(qa("main > section:nth-of-type(2) .grid > div"));
      initFieldFocus();
      initSearchShells();
      initImageWipes([q("main > section:nth-of-type(4) .h-\\[600px\\]")].filter(Boolean));
      break;
    }
    case "the-ward-overview.html": {
      initCounters(qa(".instrument-text"));
      initBellShake();
      initCircularMeters();
      initSkeletonPanels([q("main .grid.grid-cols-1.md\\:grid-cols-4"), q("main .bg-primary.text-on-primary-container.rounded-xl")].filter(Boolean));
      initBadgeMorphs();
      prepareSequence(qa("tbody tr, main .grid.grid-cols-2 > div"), 80, 90);
      break;
    }
    case "the-ward-patient-queue.html": {
      initBadgeMorphs();
      initBellShake();
      initSearchShells();
      prepareSequence(qa("tbody tr"), 60, 80);
      initSkeletonPanels([q("main .bg-surface-container-lowest.rounded-xl.overflow-hidden"), q("main aside.w-\\[400px\\]")].filter(Boolean));
      break;
    }
    case "the-ward-soap-notes.html": {
      initBellShake();
      initBadgeMorphs();
      initSearchShells();
      initSkeletonPanels([q("main section.flex-grow"), q("main aside.w-80")].filter(Boolean));
      prepareSequence(qa("main section.flex-grow .space-y-6 > div"), 80, 90);
      break;
    }
    case "the-ward-ai-assistant.html": {
      initBellShake();
      const responseParagraphs = qa(".border-l-4.border-primary-container.bg-surface-container-low p.text-on-surface");
      responseParagraphs.forEach((paragraph, index) => setupTypewriter(paragraph, index * 400));
      registerTilt(qa("aside.w-\\[380px\\] .rounded-2xl, aside.w-\\[380px\\] button.rounded-xl"));
      break;
    }
    case "the-ward-impact-dashboard.html": {
      initCounters(qa(".text-5xl.font-instrument, .text-3xl.font-headline"));
      initBellShake();
      initBarChartAnimations();
      initCircularMeters();
      registerTilt(qa("main section.grid > div"));
      break;
    }
    case "patient-compass-home.html": {
      initBadgeMorphs();
      initReturnPulse();
      initSymptomIcons();
      initImageWipes([q("main .h-48.rounded-xl")].filter(Boolean));
      break;
    }
    case "patient-compass-my-visit-summary.html": {
      registerTilt(qa("main .grid.grid-cols-1.md\\:grid-cols-3 > div"));
      initImageWipes([q("main .md\\:col-span-2 .h-24.rounded-lg")].filter(Boolean));
      break;
    }
    default:
      break;
  }
};

export const initMotion = () => {
  applyReadyState();
  initProgressBar();
  initScrollChrome();
  initUnderlines();
  initRipples();
  initMagneticButtons();
  initSearchShells();
  initHeroBackgrounds();
  initPageSpecific();
  initRevealObserver();
  initParallax();
};
