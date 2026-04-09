window.CARA = window.CARA || {};

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ROUTES = {
    ward: [
      "view-overview",
      "view-queue",
      "view-soap",
      "view-assistant",
      "view-impact",
      "view-audit",
      "view-settings",
    ],
    compass: ["view-home", "view-visit", "view-medicines", "view-return", "view-help"],
  };

  const ALIASES = {
    triage: "view-overview",
    soap: "view-soap",
    followup: "view-queue",
    overview: "view-overview",
    queue: "view-queue",
    assistant: "view-assistant",
    impact: "view-impact",
  };

  function normalizeHash(value, fallback) {
    if (!value) return fallback;
    const cleaned = value.startsWith("#") ? value.slice(1) : value;
    return cleaned || fallback;
  }

  function initRouter(scope) {
    const root = document.querySelector(`[data-router="${scope}"]`);
    if (!root) return null;

    const validViews = new Set(ROUTES[scope] || []);
    const defaultView = ROUTES[scope]?.[0];
    if (!defaultView) return null;

    const views = Array.from(root.querySelectorAll("[data-view]"));
    const routes = Array.from(root.querySelectorAll("[data-route]"));
    root.style.viewTransitionName = "cara-view";

    function applyView(targetView, replace) {
      views.forEach((view) => {
        const isActive = view.dataset.view === targetView;
        view.classList.toggle("is-active", isActive);
        view.hidden = !isActive;
      });

      routes.forEach((route) => {
        const routeTarget = route.dataset.route || "";
        if (routeTarget === targetView) {
          route.setAttribute("aria-current", "page");
          route.classList.add("is-active");
        } else {
          route.removeAttribute("aria-current");
          route.classList.remove("is-active");
        }
      });

      const nextHash = `#${targetView}`;
      if (window.location.hash !== nextHash) {
        if (replace) {
          history.replaceState(null, "", nextHash);
        } else {
          history.pushState(null, "", nextHash);
        }
      }

      root.dataset.activeView = targetView;
      window.dispatchEvent(
        new CustomEvent("cara:view-change", { detail: { scope, view: targetView } }),
      );
    }

    function setActive(viewName, replace = false) {
      const resolvedView = ALIASES[viewName] || viewName;
      const targetView = validViews.has(resolvedView) ? resolvedView : defaultView;
      if (!reducedMotion && typeof document.startViewTransition === "function") {
        document.startViewTransition(() => applyView(targetView, replace));
        return;
      }
      applyView(targetView, replace);
    }

    routes.forEach((route) => {
      route.addEventListener("click", (event) => {
        const target = route.dataset.route;
        if (!target) return;
        event.preventDefault();
        setActive(target);
      });
    });

    window.addEventListener("hashchange", () => {
      setActive(normalizeHash(window.location.hash, defaultView), true);
    });

    window.addEventListener("keydown", (event) => {
      if (!event.altKey) return;
      const index = Number(event.key) - 1;
      if (Number.isNaN(index) || index < 0 || index >= ROUTES[scope].length) return;
      event.preventDefault();
      setActive(ROUTES[scope][index]);
    });

    setActive(normalizeHash(window.location.hash, defaultView), true);

    return { setActive };
  }

  function init() {
    const scope = document.body.dataset.router || "";
    if (!scope || !ROUTES[scope]) return;
    window.CARA.routerState = initRouter(scope);
  }

  window.CARA.router = { initRouter };
  document.addEventListener("DOMContentLoaded", init);
})();

