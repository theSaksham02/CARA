/**
 * route-wiring.js — ES Module for Stitch/Tailwind multi-page navigation.
 * Wires href="#" links and data-route buttons to real page URLs.
 * Loaded by the-ward-*.html, patient-compass-*.html, and marketing pages.
 */
import { initMotion } from "./motion.js";

const routes = {
  about: "about.html",
  research: "research.html",
  "join us": "join-us.html",
  "the ward": "the-ward.html",
  ward: "the-ward-overview.html",
  "patient compass": "patient-compass.html",
  patients: "the-ward-patient-queue.html",
  insights: "the-ward-impact-dashboard.html",
  "access platform": "the-ward-login.html",
  "enter the ward": "the-ward-login.html",
  "view patient compass": "patient-compass-login.html",
  "view your compass": "patient-compass-login.html",
  "clinician portal": "the-ward-login.html",
  "patient portal": "patient-compass-login.html",
  overview: "the-ward-overview.html",
  "patient queue": "the-ward-patient-queue.html",
  "soap notes": "the-ward-soap-notes.html",
  "ai assistant": "the-ward-ai-assistant.html",
  impact: "the-ward-impact-dashboard.html",
  home: "patient-compass-home.html",
  "my visit": "patient-compass-my-visit-summary.html#my-visit",
  "my medicines": "patient-compass-my-visit-summary.html#medicines",
  medicines: "patient-compass-my-visit-summary.html#medicines",
  "return date": "patient-compass-home.html#next-visit",
  "next visit": "patient-compass-home.html#next-visit",
  help: "guided-tour.html",
  "view full queue": "the-ward-patient-queue.html",
  "view record": "the-ward-patient-profile.html",
  "patient profile": "the-ward-patient-profile.html",
  "open soap": "the-ward-soap-notes.html",
  "open soap note": "the-ward-soap-notes.html",
  "send to patient compass": "patient-compass-my-visit-summary.html",
  "guided tour": "guided-tour.html",
  "offline mode": "offline-mode.html",
  "back to safety (dashboard)": "the-ward-overview.html",
  "search patient registry": "the-ward-patient-queue.html",
  "contact registrar": "join-us.html",
  "help center": "guided-tour.html",
  "go to local dashboard": "the-ward-overview.html",
  "start the demo": "the-ward-login.html",
  "get started now": "the-ward-login.html",
  "talk to an expert": "join-us.html",
  "data privacy": "privacy-ethics.html",
  "system status": "offline-mode.html",
  "security protocols": "privacy-ethics.html",
  features: "the-ward.html",
  security: "privacy-ethics.html",
  integrations: "research.html",
  "about us": "about.html",
  contact: "join-us.html",
  support: "privacy-ethics.html",
  "terms of service": "privacy-ethics.html",
  "privacy policy": "privacy-ethics.html",
  cara: "index.html",
};

const normalize = (value) =>
  value
    .replace(/\s+/g, " ")
    .replace(/[→•]/g, "")
    .trim()
    .toLowerCase();

const getRouteText = (element) => {
  const clone = element.cloneNode(true);
  clone
    .querySelectorAll(".material-symbols-outlined")
    .forEach((icon) => icon.remove());
  return normalize(clone.textContent || "");
};

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

  const activate = (event) => {
    event?.preventDefault();
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
  const explicit = element.dataset.route;
  if (explicit) return explicit;

  const text = getRouteText(element);
  const title = normalize(element.getAttribute("title") || "");

  if (routes[text]) return routes[text];
  if (routes[title]) return routes[title];

  if (text.includes("access platform")) return routes["access platform"];
  if (text.includes("enter the ward")) return routes["enter the ward"];
  if (text.includes("view patient compass"))
    return routes["view patient compass"];
  if (text.includes("view full queue")) return routes["view full queue"];
  if (text.includes("open soap")) return routes["open soap"];
  if (text.includes("send to patient compass"))
    return routes["send to patient compass"];

  return null;
};

const wireRoutes = () => {
  const interactive = document.querySelectorAll(
    "a[href='#'], button, [title='Open SOAP'], [title='View Record'], [data-route]"
  );
  interactive.forEach((element) => {
    const route = resolveRoute(element);
    if (route) bindRoute(element, route);
  });
};

wireRoutes();
initMotion();
