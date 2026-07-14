/* Acquisition-engine console: a simulated replay of the autonomous
   outreach pipeline. Names, towns, and timings are illustrative. */

(function () {
  "use strict";

  var FEED = [
    { t: "23:41", tag: "scan", text: "Quincy: dental office, site last touched 2017, booking by phone only" },
    { t: "23:41", tag: "scan", text: "Braintree: bottle shop, no website found, strong foot traffic reviews" },
    { t: "23:43", tag: "build", text: "preview generated: storefront template, inventory and delivery module" },
    { t: "23:44", tag: "scan", text: "Weymouth: landscaping co, ads pointing at a dead social page" },
    { t: "23:47", tag: "mail", text: "outreach drafted to bottle shop owner, preview link attached" },
    { t: "23:52", tag: "scan", text: "Hingham: med spa, great reviews, no reminder or deposit flow" },
    { t: "00:12", tag: "build", text: "preview generated: recall and reminder flow for the dental office" },
    { t: "00:15", tag: "mail", text: "two follow-ups queued for the morning send window" },
    { t: "00:38", tag: "scan", text: "Plymouth: auto shop, review replies stopped eight months ago" },
    { t: "01:05", tag: "build", text: "preview generated: photo-to-quote intake for the landscaper" },
    { t: "08:03", tag: "reply", text: "bottle shop owner: can it take delivery orders?" },
    { t: "08:03", tag: "agent", text: "replied in 41 seconds: yes, phone-order flow, live preview sent" },
    { t: "08:19", tag: "reply", text: "dental office manager asks about insurance intake forms" },
    { t: "08:20", tag: "agent", text: "replied with the intake-automation one-pager" },
    { t: "09:02", tag: "deal", text: "call booked: Friday 2:00 pm with the bottle shop owner" },
    { t: "09:40", tag: "build", text: "revision: rare-bottle drop list added to the storefront preview" },
    { t: "10:15", tag: "deal", text: "pilot agreed: photo-to-quote for the landscaping co" },
    { t: "10:16", tag: "cycle", text: "cycle complete, next scan window opens tonight" }
  ];

  var TAG_LABEL = {
    scan: "scan", build: "build", mail: "outreach",
    reply: "reply", agent: "agent", deal: "booked", cycle: "cycle"
  };

  var COUNTER_FOR = { scan: "scanned", build: "previews", mail: "sent", reply: "replies", agent: "replies", deal: "booked" };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  document.querySelectorAll("[data-console]").forEach(function (root) {
    var compact = root.hasAttribute("data-compact");

    var head = el("div", "cx-head");
    head.appendChild(el("span", "cx-title", "acquisition-engine"));
    head.appendChild(el("span", "cx-pill", "simulated replay"));
    var pause = el("button", "cx-pause", "Pause");
    pause.setAttribute("aria-label", "Pause the replay");
    head.appendChild(pause);
    root.appendChild(head);

    var counters = { scanned: 0, previews: 0, sent: 0, replies: 0, booked: 0 };
    var stats = el("div", "cx-stats");
    var statEls = {};
    [["scanned", "scanned"], ["previews", "previews built"], ["sent", "emails sent"], ["replies", "replies handled"], ["booked", "calls booked"]]
      .slice(0, compact ? 3 : 5)
      .forEach(function (pair) {
        var cell = el("div", "cx-stat");
        var num = el("b", null, "0");
        cell.appendChild(num);
        cell.appendChild(el("span", null, pair[1]));
        statEls[pair[0]] = num;
        stats.appendChild(cell);
      });
    root.appendChild(stats);

    var feed = el("div", "cx-feed");
    feed.setAttribute("role", "log");
    feed.setAttribute("aria-live", "off");
    root.appendChild(feed);

    var i = 0;
    var paused = false;
    var timer = null;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function addLine() {
      var ev = FEED[i % FEED.length];
      i += 1;
      var line = el("div", "cx-line cx-" + ev.tag);
      line.appendChild(el("span", "cx-time", ev.t));
      line.appendChild(el("span", "cx-tag", TAG_LABEL[ev.tag] || ev.tag));
      line.appendChild(el("span", "cx-text", ev.text));
      feed.appendChild(line);
      while (feed.children.length > (compact ? 9 : 14)) feed.removeChild(feed.firstChild);
      feed.scrollTop = feed.scrollHeight;

      var key = COUNTER_FOR[ev.tag];
      if (key && statEls[key]) {
        counters[key] += ev.tag === "scan" ? 1 + Math.floor(Math.random() * 3) : 1;
        statEls[key].textContent = String(counters[key]);
      }
    }

    /* seed a visible backlog so the panel never starts empty */
    var seedCount = compact ? 5 : 8;
    for (var s = 0; s < seedCount; s++) addLine();

    function tick() {
      if (!paused) addLine();
      timer = setTimeout(tick, reduced ? 4200 : (compact ? 2600 : 1900));
    }
    timer = setTimeout(tick, 1600);

    pause.addEventListener("click", function () {
      paused = !paused;
      pause.textContent = paused ? "Resume" : "Pause";
    });

    /* stop burning cycles when off-screen */
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { paused = !en.isIntersecting || pause.textContent === "Resume"; });
      }, { threshold: 0.05 });
      io.observe(root);
    }
  });
})();
