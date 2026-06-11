// TEN Theme Toggle
// Switches between dark (default) and light mode using data-theme attribute
(function () {
  const KEY = "ten-theme";

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  // Apply saved or system preference on load
  const saved = localStorage.getItem(KEY);
  const preferred = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  applyTheme(preferred);

  // Expose globally
  window.TEN = window.TEN || {};
  window.TEN.toggleTheme = toggleTheme;
  window.TEN.applyTheme  = applyTheme;

  // Auto-bind any element with data-theme-toggle
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-theme-toggle]").forEach(el => {
      el.addEventListener("click", toggleTheme);
    });
  });
}());
