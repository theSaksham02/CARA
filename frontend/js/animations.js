window.CARA = window.CARA || {};

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function revealOnScroll() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (reducedMotion) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );

    items.forEach((item) => observer.observe(item));
  }

  function heroTimeline() {
    const hero = document.querySelector("[data-hero]");
    if (!hero || reducedMotion) return;

    if (window.gsap) {
      window.gsap.from(hero.querySelectorAll("[data-hero-item]"), {
        y: 24,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });
      return;
    }

    hero.querySelectorAll("[data-hero-item]").forEach((item, index) => {
      item.style.animationDelay = `${index * 70}ms`;
      item.classList.add("fade-up");
    });
  }

  function animatePanel(element, open) {
    if (!element) return;
    element.classList.toggle("is-open", open);
    if (reducedMotion) return;

    if (window.gsap) {
      window.gsap.to(element, {
        x: open ? 0 : "100%",
        duration: 0.42,
        ease: "back.out(1.08)",
      });
      return;
    }

    element.animate(
      [
        { transform: open ? "translateX(100%)" : "translateX(0)" },
        { transform: open ? "translateX(0)" : "translateX(100%)" },
      ],
      {
        duration: 340,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "forwards",
      },
    );
  }

  function showToast(message) {
    const wrap = document.querySelector("[data-toast-wrap]");
    if (!wrap) return;

    const toast = document.createElement("div");
    toast.className = "toast pop-in";
    toast.textContent = message;
    wrap.appendChild(toast);
    window.setTimeout(() => toast.remove(), 2400);
  }

  function parallaxHero() {
    if (reducedMotion) return;
    const items = Array.from(document.querySelectorAll("[data-parallax]"));
    if (!items.length) return;

    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      items.forEach((item) => {
        const speed = Number(item.dataset.parallax || "0.08");
        const offset = Math.max(-60, Math.min(60, y * speed));
        item.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
  }

  function init() {
    heroTimeline();
    revealOnScroll();
    parallaxHero();
  }

  window.CARA.animations = {
    init,
    animatePanel,
    showToast,
    reducedMotion,
  };

  document.addEventListener("DOMContentLoaded", init);
})();
