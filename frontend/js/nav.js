window.CARA = window.CARA || {};

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function sameOriginLink(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return false;
    if (!anchor.href) return false;
    const url = new URL(anchor.href, window.location.href);
    return url.origin === window.location.origin;
  }

  function setActivePublicLinks() {
    const path = window.location.pathname.replace(/\/+$/, "");
    document.querySelectorAll("[data-public-link]").forEach((link) => {
      const href = (link.getAttribute("href") || "").replace(/\/+$/, "");
      const isActive =
        href === path ||
        (href.endsWith("/index.html") && path === "") ||
        (href === "./index.html" && (path === "" || path.endsWith("/index.html")));
      if (isActive) link.setAttribute("aria-current", "page");
    });
  }

  function setupMobileMenu() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const panel = document.querySelector("[data-mobile-menu]");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const isOpen = panel.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  function setupWardSidebar() {
    const toggle = document.querySelector("[data-ward-menu-toggle]");
    const sidebar = document.querySelector("[data-ward-sidebar]");
    if (!toggle || !sidebar) return;

    toggle.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    sidebar.querySelectorAll("a[data-route]").forEach((route) => {
      route.addEventListener("click", () => {
        sidebar.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function setupJoinForm() {
    const form = document.querySelector("[data-join-form]");
    if (!form) return;
    const feedback = form.querySelector("[data-form-feedback]");
    const submitButton = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {
        name: form.querySelector("[name='name']")?.value?.trim() || "",
        email: form.querySelector("[name='email']")?.value?.trim() || "",
        role: form.querySelector("[name='role']")?.value?.trim() || "",
        message: form.querySelector("[name='message']")?.value?.trim() || "",
      };

      if (!payload.name || !payload.email || !payload.role || !payload.message) {
        if (feedback) {
          feedback.textContent = "Please complete all fields before submitting.";
        }
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
      }

      try {
        if (!window.CaraApi) {
          throw new Error("Backend API unavailable.");
        }
        const baseUrl =
          typeof window.resolveCaraApiBaseUrl === "function"
            ? window.resolveCaraApiBaseUrl()
            : "";
        const api = new window.CaraApi({ baseUrl });
        const response = await api.submitJoinUs(payload);
        if (feedback) {
          feedback.textContent =
            response.message ||
            "Thanks! Your details were received. The CARA team will contact you.";
        }
        form.reset();
      } catch (error) {
        if (feedback) {
          feedback.textContent = error.message || "Unable to submit right now.";
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    });
  }

  function setupPageTransitions() {
    document.body.style.viewTransitionName = "cara-route";
    if (reducedMotion) return;

    document.addEventListener("click", (event) => {
      const anchor = event.target.closest("a");
      if (!anchor) return;
      if (!sameOriginLink(anchor)) return;
      if (anchor.hasAttribute("data-no-transition")) return;
      if (anchor.target === "_blank") return;
      if (anchor.hash && anchor.pathname === window.location.pathname) return;

      event.preventDefault();
      if (typeof document.startViewTransition === "function") {
        document.startViewTransition(() => {
          window.location.href = anchor.href;
        });
        return;
      }

      document.body.classList.add("route-exit");
      window.setTimeout(() => {
        window.location.href = anchor.href;
      }, 120);
    });
  }

  function setupScrollProgress() {
    if (reducedMotion) return;
    const progress = document.querySelector("[data-scroll-progress]");
    if (!progress) return;

    let rafId = 0;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      progress.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
      rafId = 0;
    };

    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
  }

  function init() {
    setActivePublicLinks();
    setupMobileMenu();
    setupWardSidebar();
    setupJoinForm();
    setupPageTransitions();
    setupScrollProgress();
  }

  window.CARA.nav = { init };
  document.addEventListener("DOMContentLoaded", init);
})();
