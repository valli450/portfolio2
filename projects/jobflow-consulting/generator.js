/* Preview-site generator: assembles a working storefront preview,
   the way the acquisition engine does before first contact.
   Assembly timing is staged; the produced storefront is live UI. */

(function () {
  "use strict";

  var stage = document.getElementById("gen-stage");
  var urlEl = document.getElementById("gen-url");
  var goBtn = document.getElementById("gen-go");
  var typeSel = document.getElementById("gen-type");
  var townSel = document.getElementById("gen-town");
  if (!stage || !goBtn) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var GEN = {
    bottle: {
      slug: "bottle-shop",
      name: "Cove Street Spirits",
      tag: "Wine, whiskey and cold beer, delivered to your door",
      cta: "Call to order",
      phone: "(617) 555-0142",
      hours: "Open 7 days, 10 am to 10 pm",
      itemsLabel: "In the store now",
      accent: "#7a2e35",
      canAllocate: true,
      items: [
        { n: "Blanton's Single Barrel", p: 74.99, left: 6 },
        { n: "Tito's Handmade 1.75L", p: 29.99 },
        { n: "Josh Cellars Cabernet", p: 13.99 },
        { n: "Eagle Rare 10 Year", p: 49.99, left: 4 },
        { n: "Corona Extra 12-pack", p: 16.99 },
        { n: "Oyster Bay Sauv Blanc", p: 11.99 }
      ],
      steps: [
        "scaffolding storefront",
        "writing hero, hours, and delivery area",
        "stocking inventory from the POS export",
        "wiring the phone-order delivery flow",
        "attaching the rare-bottle text list"
      ]
    },
    pizza: {
      slug: "pizza",
      name: "Little Anchor Pizza",
      tag: "South Shore pies, out the door in fifteen minutes",
      cta: "Order by phone",
      phone: "(781) 555-0168",
      hours: "Tue to Sun, 11 am to 9 pm",
      itemsLabel: "From the menu",
      accent: "#a1561f",
      items: [
        { n: "Cheese, large", p: 15.5 },
        { n: "Pepperoni, large", p: 18 },
        { n: "White clam pie", p: 22 },
        { n: "Chicken parm sub", p: 13.5 },
        { n: "Greek salad", p: 11 },
        { n: "Garlic knots, 6", p: 6.5 }
      ],
      steps: [
        "scaffolding storefront",
        "importing the menu with prices",
        "writing hero and hours",
        "wiring call-to-order and catering intake",
        "adding the missed-call text-back hook"
      ]
    },
    landscape: {
      slug: "landscaping",
      name: "Granite Yard Co.",
      tag: "Lawns, cleanups, and stonework done right",
      cta: "Text photos for a quote",
      phone: "(339) 555-0114",
      hours: "Mon to Sat, 7 am to 5 pm",
      itemsLabel: "Services",
      accent: "#2e6b3f",
      items: [
        { n: "Weekly mowing", p: 55, from: true },
        { n: "Spring cleanup", p: 240, from: true },
        { n: "Mulch install, per yard", p: 95, from: true },
        { n: "Hedge trimming", p: 120, from: true },
        { n: "Patio and walkway stonework", p: 1800, from: true },
        { n: "Gutter clearing", p: 140, from: true }
      ],
      steps: [
        "scaffolding storefront",
        "writing hero and service area",
        "listing services with starting prices",
        "setting up photo-to-quote intake",
        "wiring the seasonal reminder list"
      ]
    }
  };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function fmt(n) {
    return "$" + n.toLocaleString("en-US", {
      minimumFractionDigits: n % 1 ? 2 : 0,
      maximumFractionDigits: 2
    });
  }

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, reduced ? 30 : ms); });
  }

  var running = false;

  async function generate() {
    if (running) return;
    running = true;
    goBtn.disabled = true;
    goBtn.textContent = "Assembling...";

    var biz = GEN[typeSel.value];
    var town = townSel.value;
    urlEl.textContent = "preview.jobflow.digital/" + town.toLowerCase() + "-" + biz.slug;

    stage.innerHTML = "";
    stage.classList.remove("lit");
    var log = el("div", "gen-log");
    stage.appendChild(log);

    for (var i = 0; i < biz.steps.length; i++) {
      log.appendChild(el("div", "gen-log-line", "<i>" + String(i + 1) + "/" + biz.steps.length + "</i> " + esc(biz.steps[i])));
      await sleep(650);
    }
    log.appendChild(el("div", "gen-log-line gen-log-done", "preview ready"));
    await sleep(700);

    stage.innerHTML = "";
    stage.classList.add("lit");
    stage.style.setProperty("--pv-accent", biz.accent);
    renderPreview(biz, town);

    goBtn.disabled = false;
    goBtn.textContent = "Generate the preview";
    running = false;
  }

  function renderPreview(biz, town) {
    var pv = el("div", "pv");

    var hero = el("header", "pv-hero pv-sec");
    hero.appendChild(el("div", "pv-town", esc(town) + ", MA"));
    hero.appendChild(el("h3", "pv-name", esc(biz.name)));
    hero.appendChild(el("p", "pv-tag", esc(biz.tag)));
    var cta = el("button", "pv-cta", esc(biz.cta));
    cta.addEventListener("click", function () {
      sync(pv, "Call flow: rings the counter phone, logs the order if missed.");
    });
    hero.appendChild(cta);
    pv.appendChild(hero);

    var info = el("div", "pv-info pv-sec");
    info.appendChild(el("span", null, esc(biz.hours)));
    info.appendChild(el("span", null, esc(biz.phone)));
    info.appendChild(el("span", null, "Serves " + esc(town) + " and nearby"));
    pv.appendChild(info);

    var items = el("div", "pv-items pv-sec");
    items.appendChild(el("div", "pv-items-head", esc(biz.itemsLabel) + " <small>tap a price to edit it, like the owner would</small>"));
    biz.items.forEach(function (item) {
      items.appendChild(itemRow(item, biz, pv));
    });
    pv.appendChild(items);

    var syncBar = el("div", "pv-sync pv-sec");
    syncBar.id = "pv-sync";
    syncBar.textContent = "Synced with the register. Changes land here in seconds.";
    pv.appendChild(syncBar);

    stage.appendChild(pv);

    if (!reduced) {
      pv.querySelectorAll(".pv-sec").forEach(function (sec, i) {
        sec.style.animationDelay = (i * 0.14) + "s";
      });
    }
  }

  function itemRow(item, biz, pv) {
    var row = el("div", "pv-item");
    var left = el("div", "pv-item-name", esc(item.n));
    if (item.left != null) {
      var chip = el("span", "pv-chip", item.left + " left");
      left.appendChild(chip);
    }
    row.appendChild(left);

    var price = el("button", "pv-price", (item.from ? "from " : "") + fmt(item.p));
    price.setAttribute("aria-label", "Edit price for " + item.n);
    price.addEventListener("click", function () {
      startEdit(price, item, biz, pv);
    });
    row.appendChild(price);

    if (biz.canAllocate && item.left != null) {
      var drop = el("button", "pv-drop", "Drop alert");
      drop.addEventListener("click", function () {
        sync(pv, "Text blast queued to 214 subscribers: " + item.n + ", " + item.left + " bottles, first come.");
        drop.textContent = "Alert queued";
        drop.disabled = true;
      });
      row.appendChild(drop);
    }
    return row;
  }

  function startEdit(priceBtn, item, biz, pv) {
    if (priceBtn.dataset.editing) return;
    priceBtn.dataset.editing = "1";
    var input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.className = "pv-price-input";
    input.value = String(item.p);
    priceBtn.replaceWith(input);
    input.focus();
    input.select();

    function commit() {
      var v = parseFloat(input.value);
      if (v && v > 0) {
        item.p = Math.round(v * 100) / 100;
        sync(pv, item.n + " updated to " + fmt(item.p) + ". Live on the site, logged at the register.");
      }
      delete priceBtn.dataset.editing;
      priceBtn.textContent = (item.from ? "from " : "") + fmt(item.p);
      input.replaceWith(priceBtn);
    }
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") input.blur();
    });
  }

  function sync(pv, msg) {
    var bar = pv.querySelector("#pv-sync");
    if (!bar) return;
    bar.textContent = msg;
    bar.classList.remove("flash");
    void bar.offsetWidth;
    bar.classList.add("flash");
  }

  goBtn.addEventListener("click", generate);

  /* deep-linked from the hub: pre-run once when scrolled into view */
  if (location.hash === "#generator") {
    setTimeout(generate, reduced ? 100 : 700);
  }
})();
