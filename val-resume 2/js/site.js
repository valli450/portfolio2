/* Shared site behavior: icon injection, scroll reveals, demo deep links. */

(function () {
  "use strict";

  /* Inline Phosphor icons: <span data-icon="play" class="..."></span> */
  if (typeof ICONS !== "undefined") {
    document.querySelectorAll("[data-icon]").forEach(function (el) {
      var d = ICONS[el.dataset.icon];
      if (!d) return;
      var cls = ("icon " + el.className).trim();
      el.outerHTML = '<svg class="' + cls + '" viewBox="0 0 256 256" aria-hidden="true"><path d="' + d + '"/></svg>';
    });
  }

  /* Scroll reveals */
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealed = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    revealed.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealed.forEach(function (el) { io.observe(el); });
  }

  /* Demo deep links: buttons with data-demo message the embedded app */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-demo]");
    if (!btn) return;
    var frame = document.getElementById("demo-frame");
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({ type: "jf-nav", dest: btn.dataset.demo }, "*");
    var col = document.querySelector(".case-demo-col");
    if (col && window.getComputedStyle(col).display === "none") {
      window.location.href = btn.dataset.demoHref || "app.html";
    }
  });
})();
