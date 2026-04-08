const routes = {
  about: "about.html",
  research: "research.html",
  "join us": "join-us.html",
  "the ward": "the-ward.html",
  "patient compass": "patient-compass.html",
  "access platform": "the-ward-overview.html",
  "enter the ward": "the-ward-overview.html",
  "view patient compass": "patient-compass-home.html",
  overview: "the-ward-overview.html",
  "patient queue": "the-ward-patient-queue.html",
  "soap notes": "the-ward-soap-notes.html",
  "ai assistant": "the-ward-ai-assistant.html",
  impact: "the-ward-impact-dashboard.html",
  home: "patient-compass-home.html",
  "my visit": "patient-compass-my-visit-summary.html",
  "view full queue": "the-ward-patient-queue.html",
  "open soap": "the-ward-soap-notes.html",
  "open soap note": "the-ward-soap-notes.html",
  "send to patient compass": "patient-compass-my-visit-summary.html",
  "privacy policy": "privacy-ethics.html",
  cara: "index.html",
};

const normalize = (value) =>
  value
    .replace(/\s+/g, " ")
    .replace(/[→•]/g, "")
    .trim()
    .toLowerCase();

const bindRoute = (element, route) => {
  if (!route) return;

  if (element.tagName === "A") {
    element.setAttribute("href", route);
    return;
  }

  element.dataset.route = route;
  element.tabIndex = element.tabIndex >= 0 ? element.tabIndex : 0;
  if (!element.getAttribute("role")) {
    element.setAttribute("role", "link");
  }

  const activate = () => {
    window.location.href = route;
  };

  element.addEventListener("click", activate);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  });
};

const resolveRoute = (element) => {
  const text = normalize(element.textContent || "");
  const title = normalize(element.getAttribute("title") || "");

  if (routes[text]) return routes[text];
  if (routes[title]) return routes[title];

  if (text.includes("access platform")) return routes["access platform"];
  if (text.includes("enter the ward")) return routes["enter the ward"];
  if (text.includes("view patient compass")) return routes["view patient compass"];
  if (text.includes("view full queue")) return routes["view full queue"];
  if (text.includes("open soap")) return routes["open soap"];
  if (text.includes("send to patient compass")) return routes["send to patient compass"];

  return null;
};

const wireRoutes = () => {
  const interactive = document.querySelectorAll("a[href='#'], button, [title='Open SOAP']");
  interactive.forEach((element) => {
    const route = resolveRoute(element);
    if (route) bindRoute(element, route);
  });
};

const animateShellOnScroll = () => {
  const toggle = () => {
    document.body.classList.toggle("is-scrolled", window.scrollY > 16);
  };

  toggle();
  window.addEventListener("scroll", toggle, { passive: true });
};

const collectRevealTargets = () => {
  const targets = new Set();
  const selectors = [
    "body > nav",
    "body > header",
    "body > aside",
    "body > main",
    "body > section",
    "body > footer",
    "main > section",
    "main > div",
    "section > div",
    "footer > div",
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (element.children.length === 0 && element.textContent.trim().length === 0) return;
      targets.add(element);
    });
  });

  return [...targets];
};

const wireReveals = () => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    document.documentElement.classList.add("reduced-motion");
  }

  const targets = collectRevealTargets();
  targets.forEach((element, index) => {
    element.dataset.reveal = "true";
    element.style.setProperty("--cara-delay", `${Math.min(index * 70, 320)}ms`);
  });

  if (prefersReducedMotion) {
    targets.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  targets.forEach((element) => observer.observe(element));
};

document.documentElement.classList.add("js");
wireRoutes();
wireReveals();
animateShellOnScroll();
