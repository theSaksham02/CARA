window.CARA = window.CARA || {};

(() => {
  const DATA_BY_RANGE = {
    today: [35, 42, 38, 46, 44],
    week: [32, 38, 41, 39, 45, 48, 43],
    month: [30, 34, 37, 41, 39, 44, 47, 45, 49, 52, 50, 48],
  };

  let chart;

  function renderFallback(target, values) {
    if (!target) return;
    target.innerHTML = values
      .map(
        (value, index) =>
          `<div class="card card-tight">
            <p class="text-muted">Point ${index + 1}</p>
            <p><strong>${value}</strong> patients</p>
          </div>`,
      )
      .join("");
  }

  function renderChart(range) {
    const values = DATA_BY_RANGE[range] || DATA_BY_RANGE.month;
    const canvas = document.querySelector("#impact-chart");
    const fallback = document.querySelector("#impact-chart-fallback");

    if (!canvas || !window.Chart) {
      renderFallback(fallback, values);
      return;
    }

    fallback.hidden = true;
    const context = canvas.getContext("2d");
    if (!context) return;

    if (chart) chart.destroy();
    chart = new window.Chart(context, {
      type: "bar",
      data: {
        labels: values.map((_, index) => `T${index + 1}`),
        datasets: [
          {
            label: "Patients",
            data: values,
            borderRadius: 8,
            backgroundColor: olive || "rgb(92 110 46)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
  }

  function init() {
    const rangeButtons = document.querySelectorAll("[data-range]");
    if (!rangeButtons.length) return;

    rangeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        rangeButtons.forEach((node) => node.setAttribute("aria-pressed", "false"));
        button.setAttribute("aria-pressed", "true");
        renderChart(button.dataset.range || "month");
      });
    });

    renderChart("month");
  }

  window.CARA.charts = { init, renderChart };
  document.addEventListener("DOMContentLoaded", init);
})();
    const olive = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-olive")
      .trim();
