/* JobFlow demo app - self-contained vanilla JS simulation.
   All data lives in memory and resets on reload. */

(function () {
  "use strict";

  var $screen = document.getElementById("screen");
  var $tabbar = document.getElementById("tabbar");
  var $sheetLayer = document.getElementById("sheet-layer");
  var $sheet = document.getElementById("sheet");
  var $toasts = document.getElementById("toast-layer");
  var $tourLayer = document.getElementById("tour-layer");
  var $tourCard = document.getElementById("tour-card");
  var $app = document.getElementById("app");

  if (window.self !== window.top) document.body.classList.add("embedded");

  /* ---------- helpers ---------- */

  function ic(name, cls) {
    var d = ICONS[name];
    if (!d) return "";
    return '<svg class="icon ' + (cls || "") + '" viewBox="0 0 256 256" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  function money(n, forceCents) {
    var hasCents = forceCents || Math.round(n * 100) % 100 !== 0;
    return "$" + n.toLocaleString("en-US", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: hasCents ? 2 : 0
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function todayLabel() {
    return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- seed data ---------- */

  var CATS = [
    { id: "materials", label: "Materials", icon: "hammer" },
    { id: "fuel", label: "Fuel", icon: "truck" },
    { id: "tools", label: "Tools", icon: "wrench" },
    { id: "permits", label: "Permits", icon: "invoice" },
    { id: "labor", label: "Labor", icon: "hard-hat" }
  ];

  var db = {
    projects: [
      { id: "p1", name: "Bathroom remodel", client: "Marek Kowalski", addr: "2214 Hartwell Ave", budget: 8400, status: "active" },
      { id: "p2", name: "Roof replacement", client: "Deerfield Ridge HOA", addr: "19 Deerfield Ridge Rd", budget: 24600, status: "active" },
      { id: "p3", name: "200A panel upgrade", client: "Luz Ferreira", addr: "87 Calloway St", budget: 3150, status: "active" },
      { id: "p4", name: "Deck rebuild", client: "Tom Okafor", addr: "640 Birchwood Ln", budget: 6750, status: "done" }
    ],
    invoices: [
      { id: "INV-1043", projectId: "p1", label: "Progress: tile and wet room", amount: 2100, status: "sent", date: "Jul 11", due: "Jul 25", ts: 60 },
      { id: "INV-1042", projectId: "p1", label: "50% deposit", amount: 4200, status: "paid", date: "Jul 5", due: "Jul 5", ts: 40 },
      { id: "INV-1041", projectId: "p2", label: "50% deposit", amount: 12300, status: "paid", date: "Jul 2", due: "Jul 2", ts: 20 },
      { id: "INV-1040", projectId: "p3", label: "50% deposit", amount: 1575, status: "overdue", date: "Jun 27", due: "Jul 11", ts: 10 },
      { id: "INV-1039", projectId: "p4", label: "Final balance", amount: 6750, status: "paid", date: "Jun 30", due: "Jun 30", ts: 5 }
    ],
    payments: [
      { id: "pay3", invoiceId: "INV-1042", amount: 4200, method: "Zelle", date: "Jul 5", ts: 41 },
      { id: "pay2", invoiceId: "INV-1041", amount: 12300, method: "Check", date: "Jul 3", ts: 21 },
      { id: "pay1", invoiceId: "INV-1039", amount: 6750, method: "Card", date: "Jun 30", ts: 6 }
    ],
    expenses: [
      { id: "e7", projectId: "p1", note: "Crew labor, Saturday", cat: "labor", amount: 960, date: "Jul 12", seed: null, ts: 62 },
      { id: "e6", projectId: "p1", note: "Wet room membrane kit", cat: "materials", amount: 289.99, date: "Jul 9", seed: "jobflow-membrane", ts: 55 },
      { id: "e5", projectId: "p1", note: "Tile, thinset, grout", cat: "materials", amount: 612.48, date: "Jul 8", seed: "jobflow-tile", ts: 50 },
      { id: "e4", projectId: null, note: "Tile saw blade", cat: "tools", amount: 89.99, date: "Jul 8", seed: "jobflow-blade", ts: 48 },
      { id: "e3", projectId: null, note: "Fuel, week 28", cat: "fuel", amount: 58.20, date: "Jul 7", seed: null, ts: 45 },
      { id: "e2", projectId: "p2", note: "Shingle delivery, ABC Supply", cat: "materials", amount: 4890, date: "Jul 6", seed: "jobflow-shingles", ts: 42 },
      { id: "e1", projectId: "p3", note: "Electrical permit, city", cat: "permits", amount: 145, date: "Jun 26", seed: null, ts: 4 }
    ],
    tasks: [
      { id: "t1", projectId: "p1", label: "Demo old tile and fixtures", eta: "Done Thu", done: true },
      { id: "t2", projectId: "p1", label: "Waterproof shower walls", eta: "Done Fri", done: true },
      { id: "t3", projectId: "p1", label: "Tile shower walls", eta: "Today", done: false },
      { id: "t4", projectId: "p1", label: "Grout and seal", eta: "Tomorrow", done: false },
      { id: "t5", projectId: "p1", label: "Set vanity and faucet", eta: "Wed", done: false }
    ],
    photos: []
  };

  var nextInvoiceNum = 1044;
  var tsCounter = 100;

  /* ---------- derived numbers ---------- */

  function collected() { return db.payments.reduce(function (s, p) { return s + p.amount; }, 0); }
  function outstanding() {
    return db.invoices.filter(function (i) { return i.status === "sent" || i.status === "overdue"; });
  }
  function outstandingTotal() { return outstanding().reduce(function (s, i) { return s + i.amount; }, 0); }
  function spentTotal() { return db.expenses.reduce(function (s, e) { return s + e.amount; }, 0); }
  function netProfit() { return collected() - spentTotal(); }
  function taxReserve() { return Math.max(0, netProfit() * 0.25); }
  function project(id) { return db.projects.find(function (p) { return p.id === id; }); }
  function projectSpent(id) {
    return db.expenses.filter(function (e) { return e.projectId === id; })
      .reduce(function (s, e) { return s + e.amount; }, 0);
  }
  function projectInvoices(id) { return db.invoices.filter(function (i) { return i.projectId === id; }); }

  /* ---------- state ---------- */

  var state = {
    mode: "signin",           // signin | pin | owner | worker
    tab: "home",              // owner tab
    view: null,               // {type:'project', id} pushed detail view
    invoiceFilter: "all",
    pin: "",
    clockedIn: false,
    clockStart: null,
    signingIn: false,
    backNav: false
  };

  var clockTimer = null;

  /* ---------- rendering ---------- */

  function render() {
    var html = "";
    var chromeDark = false;
    var showTabs = false;

    if (state.mode === "signin") { html = viewSignin(); chromeDark = true; }
    else if (state.mode === "pin") { html = viewPin(); chromeDark = true; }
    else if (state.mode === "digest") { html = viewDigest(); chromeDark = true; }
    else if (state.mode === "worker") { html = viewWorker(); }
    else if (state.view && state.view.type === "project") { html = viewProjectDetail(state.view.id); showTabs = true; }
    else {
      showTabs = true;
      if (state.tab === "home") html = viewHome();
      if (state.tab === "projects") html = viewProjects();
      if (state.tab === "invoices") html = viewInvoices();
      if (state.tab === "payments") html = viewPayments();
      if (state.tab === "expenses") html = viewExpenses();
    }

    $app.classList.toggle("chrome-dark", chromeDark);
    $screen.innerHTML = '<div class="screen' + (showTabs ? "" : " no-tabs") + (state.backNav ? " slide-back" : "") + '">' + html + "</div>";
    state.backNav = false;

    $tabbar.hidden = !showTabs;
    if (showTabs) renderTabs();
  }

  function renderTabs() {
    var due = outstanding().length;
    var tabs = [
      { id: "home", label: "Home", icon: "house" },
      { id: "projects", label: "Projects", icon: "briefcase" },
      { id: "invoices", label: "Invoices", icon: "receipt", badge: due },
      { id: "payments", label: "Payments", icon: "credit-card" },
      { id: "expenses", label: "Expenses", icon: "wallet" }
    ];
    $tabbar.innerHTML = tabs.map(function (t) {
      var on = state.tab === t.id && !state.view;
      var iconName = on && ICONS[t.icon + "-fill"] ? t.icon + "-fill" : t.icon;
      return '<button data-action="tab" data-arg="' + t.id + '" class="' + (on ? "on" : "") + '" aria-label="' + t.label + '">' +
        (t.badge ? '<span class="badge">' + t.badge + "</span>" : "") +
        ic(iconName) + "<span>" + t.label + "</span></button>";
    }).join("");
  }

  /* ---------- screens ---------- */

  function viewSignin() {
    return (
      '<div class="signin">' +
        '<div class="brand-mark">JF</div>' +
        "<h1>Run the whole job from your pocket.</h1>" +
        "<p>Projects, invoices, expenses, and crew. Built for contractors who would rather be on site than at a desk.</p>" +
        '<div class="spacer"></div>' +
        '<button class="btn-google" data-action="signin-google">' + gMark() + "<span>" + (state.signingIn ? "Signing in..." : "Continue with Google") + "</span></button>" +
        '<button class="btn-worker" data-action="goto-pin">' + ic("hard-hat") + " Worker sign-in with PIN</button>" +
        '<button class="tour-link" data-action="tour-start">' + ic("play") + " Play the 60-second tour</button>" +
        '<div class="fine">Demo build. Everything works, data resets on reload.</div>' +
      "</div>"
    );
  }

  function gMark() {
    return '<svg class="gmark" viewBox="0 0 48 48" aria-hidden="true">' +
      '<path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>' +
      '<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>' +
      '<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>' +
      '<path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
  }

  function viewPin() {
    var dots = "";
    for (var i = 0; i < 4; i++) dots += '<i class="' + (i < state.pin.length ? "fill" : "") + '"></i>';
    var keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
    return (
      '<div class="pin-screen">' +
        '<button class="pin-back" data-action="pin-exit">' + ic("arrow-left") + "</button>" +
        "<h1>Crew sign-in</h1>" +
        "<p>Enter the 4-digit PIN from your boss.<br>No account or email needed. Try any PIN.</p>" +
        '<div class="pin-dots">' + dots + "</div>" +
        '<div class="pin-pad">' +
        keys.map(function (k) {
          if (k === "") return '<button class="blank" tabindex="-1"></button>';
          if (k === "del") return '<button data-action="pin-del" aria-label="Delete">' + ic("backspace") + "</button>";
          return '<button data-action="pin-key" data-arg="' + k + '">' + k + "</button>";
        }).join("") +
        "</div>" +
      "</div>"
    );
  }

  function viewHome() {
    var acts = recentActivity().slice(0, 4);
    return (
      '<p class="h-greet">Good morning, Val</p>' +
      '<h1 class="h-title">Here is the month.</h1>' +
      '<div class="hero-card">' +
        '<div class="label">Collected in July</div>' +
        '<div class="big money" id="hero-num">' + money(collected()) + "</div>" +
        '<div class="hero-split">' +
          '<div><div class="label">Net profit</div><div class="val money">' + money(netProfit()) + "</div></div>" +
          '<div><div class="label">Tax reserve, 25%</div><div class="val money">' + money(taxReserve()) + "</div></div>" +
        "</div>" +
      "</div>" +
      '<div class="stat-row">' +
        '<button class="stat-card warn" data-action="goto-outstanding">' +
          '<div class="label">' + ic("bell") + " Outstanding</div>" +
          '<div class="val money">' + money(outstandingTotal()) + "</div>" +
          '<div class="sub">' + outstanding().length + " open invoice" + (outstanding().length === 1 ? "" : "s") + "</div>" +
        "</button>" +
        '<button class="stat-card" data-action="tab" data-arg="projects">' +
          '<div class="label">' + ic("briefcase") + " Active jobs</div>" +
          '<div class="val">' + db.projects.filter(function (p) { return p.status === "active"; }).length + "</div>" +
          '<div class="sub">' + db.tasks.filter(function (t) { return !t.done; }).length + " crew tasks open</div>" +
        "</button>" +
      "</div>" +
      '<div class="quick-row">' +
        '<button class="quick" data-action="sheet-new-invoice">' + ic("paper-plane-tilt") + "New invoice</button>" +
        '<button class="quick" data-action="sheet-new-expense">' + ic("camera") + "Add expense</button>" +
        '<button class="quick" data-action="sheet-new-project">' + ic("plus") + "New project</button>" +
      "</div>" +
      '<div class="sec-head"><h2>Recent activity</h2></div>' +
      '<div class="list">' + acts.join("") + "</div>"
    );
  }

  function recentActivity() {
    var items = [];
    db.payments.forEach(function (p) {
      var inv = db.invoices.find(function (i) { return i.id === p.invoiceId; });
      var pr = inv ? project(inv.projectId) : null;
      items.push({ ts: p.ts, html: activityRow("check", "", "Payment received", (pr ? pr.client : "Client") + ", " + p.method, "+" + money(p.amount), p.date) });
    });
    db.invoices.filter(function (i) { return i.status !== "paid"; }).forEach(function (i) {
      var pr = project(i.projectId);
      items.push({ ts: i.ts, html: activityRow("paper-plane-tilt", "info", "Invoice " + i.id + " sent", pr ? pr.client : "", money(i.amount), i.date) });
    });
    db.expenses.slice(0, 4).forEach(function (e) {
      items.push({ ts: e.ts, html: activityRow("wallet", "warn", esc(e.note), catLabel(e.cat), "-" + money(e.amount), e.date) });
    });
    return items.sort(function (a, b) { return b.ts - a.ts; }).map(function (i) { return i.html; });
  }

  function activityRow(icon, tone, title, sub, amt, when) {
    return '<div class="row-card"><div class="row-ico ' + tone + '">' + ic(icon) + "</div>" +
      '<div class="row-main"><div class="t">' + title + '</div><div class="s">' + esc(sub) + "</div></div>" +
      '<div class="row-end"><div class="amt money">' + amt + '</div><div class="when">' + when + "</div></div></div>";
  }

  function catLabel(id) {
    var c = CATS.find(function (c) { return c.id === id; });
    return c ? c.label : id;
  }

  function viewProjects() {
    return (
      '<div class="h-page"><h1 class="h-title">Projects</h1>' +
      '<button class="btn sm subtle" data-action="sheet-new-project">' + ic("plus") + " New</button></div>" +
      '<div class="list">' +
      db.projects.map(function (p) {
        var spent = projectSpent(p.id);
        var pct = Math.min(100, Math.round((spent / p.budget) * 100));
        return (
          '<button class="row-card" data-action="open-project" data-arg="' + p.id + '" style="display:block">' +
            '<div style="display:flex;align-items:center;gap:13px">' +
              '<div class="row-ico">' + ic(p.status === "done" ? "check" : "hammer") + "</div>" +
              '<div class="row-main"><div class="t">' + esc(p.name) + '</div><div class="s">' + esc(p.client) + "</div></div>" +
              '<span class="chip ' + (p.status === "done" ? "done" : "active") + '">' + (p.status === "done" ? "Complete" : "Active") + "</span>" +
            "</div>" +
            '<div class="budget-bar"><i class="' + (pct > 85 ? "hot" : "") + '" style="width:' + pct + '%"></i></div>' +
            '<div class="budget-meta"><span>' + money(spent) + " spent</span><span>" + money(p.budget) + " budget</span></div>" +
          "</button>"
        );
      }).join("") +
      "</div>"
    );
  }

  function viewProjectDetail(id) {
    var p = project(id);
    if (!p) return "";
    var spent = projectSpent(id);
    var pct = Math.min(100, Math.round((spent / p.budget) * 100));
    var invs = projectInvoices(id);
    var exps = db.expenses.filter(function (e) { return e.projectId === id; });
    var tasks = db.tasks.filter(function (t) { return t.projectId === id; });
    var doneCount = tasks.filter(function (t) { return t.done; }).length;

    return (
      '<div class="subnav"><button data-action="back">' + ic("arrow-left") + '</button><span class="crumb">Projects</span></div>' +
      '<div class="detail-head"><h1>' + esc(p.name) + '</h1><div class="who">' + ic("user") + esc(p.client) + " &middot; " + esc(p.addr) + "</div></div>" +
      '<div class="kv-card">' +
        '<div class="kv-line"><span class="k">Budget</span><span class="v money">' + money(p.budget) + "</span></div>" +
        '<div class="kv-line"><span class="k">Spent to date</span><span class="v money">' + money(spent) + "</span></div>" +
        '<div class="kv-line"><span class="k">Invoiced</span><span class="v money">' + money(invs.reduce(function (s, i) { return s + i.amount; }, 0)) + "</span></div>" +
        '<div class="budget-bar"><i class="' + (pct > 85 ? "hot" : "") + '" style="width:' + pct + '%"></i></div>' +
        '<div class="budget-meta"><span>' + pct + "% of budget used</span><span>" + money(Math.max(0, p.budget - spent)) + " left</span></div>" +
      "</div>" +
      (tasks.length ?
        '<div class="sec-head"><h2>Crew tasks</h2><span style="font-size:13px;color:var(--muted)">' + doneCount + " of " + tasks.length + " done</span></div>" +
        '<div class="list">' + tasks.map(function (t) {
          return '<div class="task-row' + (t.done ? " done" : "") + '"><span class="box">' + ic("check") + '</span><span class="t">' + esc(t.label) + '</span><span class="eta">' + esc(t.eta) + "</span></div>";
        }).join("") + "</div>" : "") +
      (invs.length ?
        '<div class="sec-head"><h2>Invoices</h2></div><div class="list">' +
        invs.map(invoiceRow).join("") + "</div>" : "") +
      (exps.length ?
        '<div class="sec-head"><h2>Expenses</h2></div><div class="list">' +
        exps.map(expenseRow).join("") + "</div>" : "") +
      '<div style="margin-top:22px"><button class="btn" data-action="sheet-new-invoice" data-arg="' + p.id + '">' + ic("paper-plane-tilt") + " Invoice this project</button></div>"
    );
  }

  function invoiceRow(i) {
    var p = project(i.projectId);
    var chip = { paid: "Paid", sent: "Sent", overdue: "Overdue", draft: "Draft" }[i.status];
    return (
      '<button class="row-card" data-action="open-invoice" data-arg="' + i.id + '">' +
        '<div class="row-ico ' + (i.status === "overdue" ? "warn" : i.status === "sent" ? "info" : "") + '">' + ic("receipt") + "</div>" +
        '<div class="row-main"><div class="t">' + i.id + " &middot; " + esc(p ? p.client : "") + '</div><div class="s">' + esc(i.label) + "</div></div>" +
        '<div class="row-end"><div class="amt money">' + money(i.amount) + '</div><div class="when"><span class="chip ' + i.status + '">' + chip + "</span></div></div>" +
      "</button>"
    );
  }

  function expenseRow(e) {
    var thumb = e.seed
      ? '<img class="row-thumb" alt="Receipt photo" loading="lazy" src="https://picsum.photos/seed/' + e.seed + '/96/96">'
      : '<div class="row-ico warn">' + ic(catIcon(e.cat)) + "</div>";
    return (
      '<div class="row-card">' + thumb +
        '<div class="row-main"><div class="t">' + esc(e.note) + '</div><div class="s">' + catLabel(e.cat) + (e.projectId ? " &middot; " + esc(project(e.projectId).name) : " &middot; Overhead") + "</div></div>" +
        '<div class="row-end"><div class="amt money">-' + money(e.amount, true) + '</div><div class="when">' + e.date + "</div></div>" +
      "</div>"
    );
  }

  function catIcon(id) {
    var c = CATS.find(function (c) { return c.id === id; });
    return c ? c.icon : "wallet";
  }

  function viewInvoices() {
    var f = state.invoiceFilter;
    var list = db.invoices.filter(function (i) {
      if (f === "open") return i.status === "sent" || i.status === "overdue";
      if (f === "paid") return i.status === "paid";
      return true;
    });
    return (
      '<div class="h-page"><h1 class="h-title">Invoices</h1>' +
      '<button class="btn sm subtle" data-action="sheet-new-invoice">' + ic("plus") + " New</button></div>" +
      '<div class="seg">' +
        segBtn("invoice", "all", "All", f) + segBtn("invoice", "open", "Open", f) + segBtn("invoice", "paid", "Paid", f) +
      "</div>" +
      (list.length
        ? '<div class="list">' + list.map(invoiceRow).join("") + "</div>"
        : emptyState("receipt", "Nothing here yet", "Invoices you send will show up in this list.", "sheet-new-invoice", "Create an invoice"))
    );
  }

  function segBtn(kind, val, label, current) {
    return '<button data-action="seg-' + kind + '" data-arg="' + val + '" class="' + (current === val ? "on" : "") + '">' + label + "</button>";
  }

  function emptyState(icon, t, s, action, cta) {
    return '<div class="empty">' + ic(icon) + '<div class="t">' + t + '</div><div class="s">' + s + "</div>" +
      (action ? '<button class="btn" data-action="' + action + '">' + cta + "</button>" : "") + "</div>";
  }

  function viewPayments() {
    var rows = db.payments.map(function (p) {
      var inv = db.invoices.find(function (i) { return i.id === p.invoiceId; });
      var pr = inv ? project(inv.projectId) : null;
      return (
        '<div class="row-card"><div class="row-ico">' + ic("check") + "</div>" +
          '<div class="row-main"><div class="t">' + esc(pr ? pr.client : "Client") + '</div><div class="s">' + (inv ? inv.id : "") + " &middot; " + p.method + "</div></div>" +
          '<div class="row-end"><div class="amt money">+' + money(p.amount) + '</div><div class="when">' + p.date + "</div></div>" +
        "</div>"
      );
    }).join("");
    return (
      '<div class="h-page"><h1 class="h-title">Payments</h1></div>' +
      '<div class="stat-row" style="margin-bottom:18px">' +
        '<div class="stat-card"><div class="label">' + ic("coins") + ' Collected</div><div class="val money">' + money(collected()) + "</div><div class=\"sub\">this month</div></div>" +
        '<div class="stat-card warn"><div class="label">' + ic("bell") + ' Awaiting</div><div class="val money">' + money(outstandingTotal()) + "</div><div class=\"sub\">" + outstanding().length + " open</div></div>" +
      "</div>" +
      '<div class="sec-head"><h2>History</h2></div>' +
      '<div class="list">' + rows + "</div>"
    );
  }

  function viewExpenses() {
    var byCat = CATS.map(function (c) {
      var total = db.expenses.filter(function (e) { return e.cat === c.id; })
        .reduce(function (s, e) { return s + e.amount; }, 0);
      return { cat: c, total: total };
    }).filter(function (x) { return x.total > 0; });

    return (
      '<div class="h-page"><h1 class="h-title">Expenses</h1>' +
      '<button class="btn sm subtle" data-action="sheet-new-expense">' + ic("camera") + " Add</button></div>" +
      '<div class="hero-card" style="margin-top:2px;background:linear-gradient(145deg,#5c2f10,#8a4517 62%,#a1561f)">' +
        '<div class="label" style="color:#e8c9ad">Spent in July</div>' +
        '<div class="big money">' + money(spentTotal(), true) + "</div>" +
        '<div class="hero-split" style="border-color:rgba(255,255,255,0.2)">' +
        byCat.slice(0, 3).map(function (x) {
          return '<div><div class="label" style="color:#e8c9ad">' + x.cat.label + '</div><div class="val money">' + money(x.total) + "</div></div>";
        }).join("") +
        "</div>" +
      "</div>" +
      '<div class="sec-head"><h2>All receipts</h2></div>' +
      '<div class="list">' + db.expenses.map(expenseRow).join("") + "</div>"
    );
  }

  /* ---------- morning digest ---------- */

  function viewDigest() {
    var open = outstanding();
    var tasks = db.tasks.filter(function (t) { return t.projectId === "p1"; });
    var done = tasks.filter(function (t) { return t.done; }).length;
    var pct = Math.round((done / tasks.length) * 100);
    return (
      '<div class="digest">' +
        '<div class="dg-time">7:02</div>' +
        '<div class="dg-date">Tuesday, July 14</div>' +
        '<div class="dg-card">' +
          '<div class="dg-app">' + ic("bell") + '<span>JobFlow &middot; Morning digest</span><em>now</em></div>' +
          '<div class="dg-line"><b>Money.</b> ' + money(collected()) + " collected this month. " +
            open.length + " invoice" + (open.length === 1 ? "" : "s") + " still open, " + money(outstandingTotal()) + " waiting.</div>" +
          '<div class="dg-line"><b>Crew.</b> Bathroom remodel is ' + pct + "% done, on schedule. Diego clocked " + (state.clockedIn ? "in" : "8 hours Saturday") + ".</div>" +
          '<div class="dg-line"><b>Today.</b> Three jobs on the board. Rain risk on the Deerfield roof after 2 pm.</div>' +
          '<div class="dg-line dg-hint">Reply 1 to send payment reminders. Reply 2 for the full schedule.</div>' +
        "</div>" +
        '<div class="dg-actions">' +
          '<button class="btn" data-action="digest-open">Open JobFlow</button>' +
          '<button class="btn ghost" data-action="digest-back" style="background:rgba(255,255,255,0.08);border:0;color:#dce8e0">Back to sign-in</button>' +
        "</div>" +
        '<p class="dg-note">Sent by text every morning at 7. The numbers above are live demo state.</p>' +
      "</div>"
    );
  }

  /* ---------- worker mode ---------- */

  function viewWorker() {
    var p = project("p1");
    var tasks = db.tasks.filter(function (t) { return t.projectId === "p1"; });
    var done = tasks.filter(function (t) { return t.done; }).length;
    var pct = Math.round((done / tasks.length) * 100);
    var C = 2 * Math.PI * 26;

    return (
      '<div class="h-page" style="margin-top:8px"><div>' +
        '<p class="h-greet" style="margin:0">Hey, Diego</p><h1 class="h-title" style="font-size:24px">Today’s job</h1></div>' +
        '<button class="btn sm ghost" data-action="worker-exit">Switch</button></div>' +
      '<div class="worker-hero">' +
        '<div class="label">' + esc(p.client) + "</div>" +
        "<h2>" + esc(p.name) + "</h2>" +
        '<div class="addr">' + ic("truck") + esc(p.addr) + "</div>" +
        '<div class="actions">' +
          '<button class="btn sm" data-action="worker-nav">Navigate</button>' +
          '<button class="btn sm ghost" data-action="worker-call">Call Val</button>' +
        "</div>" +
      "</div>" +
      '<div class="clock-strip' + (state.clockedIn ? " on" : "") + '">' +
        '<div><div class="t">' + (state.clockedIn ? "On the clock" : "Not clocked in") + '</div><div class="s" id="clock-elapsed">' + (state.clockedIn ? "Started " + state.clockStart : "Tap to start your shift") + "</div></div>" +
        '<button class="btn sm' + (state.clockedIn ? "" : " subtle") + '" data-action="clock-toggle">' + (state.clockedIn ? "Clock out" : "Clock in") + "</button>" +
      "</div>" +
      '<div class="progress-ring-wrap">' +
        '<div style="position:relative;width:60px;height:60px">' +
          '<svg class="ring" width="60" height="60"><circle class="track" cx="30" cy="30" r="26" fill="none" stroke-width="6"/>' +
          '<circle class="fillc" cx="30" cy="30" r="26" fill="none" stroke-width="6" stroke-linecap="round" stroke-dasharray="' + C + '" stroke-dashoffset="' + (C * (1 - pct / 100)) + '"/></svg>' +
          '<span class="ring-label">' + pct + "%</span>" +
        "</div>" +
        '<div class="txt"><div class="t">' + done + " of " + tasks.length + ' tasks done</div><div class="s">Val sees this update live</div></div>' +
      "</div>" +
      '<div class="sec-head"><h2>Task list</h2></div>' +
      '<div class="list">' +
      tasks.map(function (t) {
        return '<button class="task-row' + (t.done ? " done" : "") + '" data-action="toggle-task" data-arg="' + t.id + '">' +
          '<span class="box">' + ic("check") + '</span><span class="t">' + esc(t.label) + '</span><span class="eta">' + esc(t.eta) + "</span></button>";
      }).join("") +
      "</div>" +
      '<div style="margin-top:16px"><button class="btn ghost" data-action="worker-photo">' + ic("camera") + " Add site photo</button></div>" +
      (db.photos.length ?
        '<div class="sec-head"><h2>Site photos</h2></div>' +
        '<div style="display:flex;gap:9px;flex-wrap:wrap">' +
        db.photos.map(function (s) {
          return '<img src="https://picsum.photos/seed/' + s + '/140/140" alt="Site photo" style="width:76px;height:76px;border-radius:14px;object-fit:cover">';
        }).join("") + "</div>" : "")
    );
  }

  /* ---------- sheets ---------- */

  var sheetState = {};

  function openSheet(html) {
    $sheet.innerHTML = html;
    $sheetLayer.hidden = false;
  }
  function closeSheet() {
    $sheetLayer.hidden = true;
    $sheet.innerHTML = "";
    sheetState = {};
  }

  function sheetNewInvoice(presetProjectId) {
    var active = db.projects.filter(function (p) { return p.status === "active"; });
    sheetState = { kind: "invoice", dep: "half", projectId: presetProjectId || active[0].id, amount: "" };
    openSheet(
      "<h2>New invoice</h2>" +
      '<p class="sheet-sub">Sent by text and email with a pay link.</p>' +
      '<div class="field"><label for="inv-project">Project</label>' +
        '<select id="inv-project" data-input="inv-project">' +
        active.map(function (p) {
          return '<option value="' + p.id + '"' + (p.id === sheetState.projectId ? " selected" : "") + ">" + esc(p.name) + " &middot; " + esc(p.client) + "</option>";
        }).join("") +
        "</select></div>" +
      '<div class="field" id="f-amount"><label for="inv-amount">Job total</label>' +
        '<div class="amount-input"><span>$</span><input id="inv-amount" data-input="inv-amount" inputmode="decimal" placeholder="0.00" autocomplete="off"></div>' +
        '<div class="err">Enter an amount first.</div></div>' +
      '<div class="field"><label>Collect now</label>' +
        '<div class="seg" style="margin:0">' +
          '<button data-action="dep-mode" data-arg="half" class="on">50% deposit</button>' +
          '<button data-action="dep-mode" data-arg="full">Full amount</button>' +
          '<button data-action="dep-mode" data-arg="later">Invoice only</button>' +
        "</div>" +
        '<div class="help">Deposits get paid before the job starts.</div></div>' +
      '<div class="dep-preview"><span>Client pays now</span><span class="money" id="dep-now">$0</span></div>' +
      '<button class="btn" data-action="send-invoice">' + ic("paper-plane-tilt") + " Send invoice</button>"
    );
    updateDepPreview();
  }

  function updateDepPreview() {
    var el = document.getElementById("dep-now");
    if (!el) return;
    var amt = parseFloat(sheetState.amount) || 0;
    var now = sheetState.dep === "half" ? amt / 2 : sheetState.dep === "full" ? amt : 0;
    el.textContent = money(now);
    var wrap = el.parentElement;
    wrap.firstElementChild.textContent = sheetState.dep === "later" ? "Due on completion" : "Client pays now";
    if (sheetState.dep === "later") el.textContent = money(amt);
  }

  function sheetNewExpense() {
    sheetState = { kind: "expense", cat: "materials", seed: null, amount: "", note: "" };
    openSheet(
      "<h2>Add expense</h2>" +
      '<p class="sheet-sub">Logged against the job so profit stays honest.</p>' +
      '<div class="field" id="f-exp-amount"><label for="exp-amount">Amount</label>' +
        '<div class="amount-input"><span>$</span><input id="exp-amount" data-input="exp-amount" inputmode="decimal" placeholder="0.00" autocomplete="off"></div>' +
        '<div class="err">Enter an amount first.</div></div>' +
      '<div class="field"><label>Category</label><div class="cat-grid">' +
        CATS.map(function (c) {
          return '<button data-action="pick-cat" data-arg="' + c.id + '" class="' + (c.id === "materials" ? "on" : "") + '">' + ic(c.icon) + c.label + "</button>";
        }).join("") +
      "</div></div>" +
      '<div class="field"><label for="exp-note">What was it</label>' +
        '<input id="exp-note" data-input="exp-note" placeholder="Tile, thinset, grout" autocomplete="off"></div>' +
      '<div class="field"><label for="exp-project">Job</label>' +
        '<select id="exp-project" data-input="exp-project">' +
        '<option value="">Overhead, no job</option>' +
        db.projects.filter(function (p) { return p.status === "active"; }).map(function (p) {
          return '<option value="' + p.id + '">' + esc(p.name) + "</option>";
        }).join("") +
        "</select></div>" +
      '<button class="receipt-drop" data-action="snap-receipt" id="receipt-drop">' + ic("camera") + "<span>Snap the receipt</span></button>" +
      '<button class="btn" data-action="save-expense">Save expense</button>'
    );
  }

  function sheetNewProject() {
    sheetState = { kind: "project" };
    openSheet(
      "<h2>New project</h2>" +
      '<p class="sheet-sub">A job, its budget, and its client in one place.</p>' +
      '<div class="field" id="f-pr-name"><label for="pr-name">Job name</label>' +
        '<input id="pr-name" placeholder="Kitchen refit" autocomplete="off"><div class="err">Give the job a name.</div></div>' +
      '<div class="field"><label for="pr-client">Client</label>' +
        '<input id="pr-client" placeholder="Name or company" autocomplete="off"></div>' +
      '<div class="field"><label for="pr-budget">Budget</label>' +
        '<div class="amount-input"><span>$</span><input id="pr-budget" inputmode="decimal" placeholder="0" autocomplete="off"></div>' +
        '<div class="help">You can change this any time.</div></div>' +
      '<button class="btn" data-action="save-project">Create project</button>'
    );
  }

  function sheetInvoiceDetail(id) {
    var i = db.invoices.find(function (x) { return x.id === id; });
    if (!i) return;
    var p = project(i.projectId);
    var chip = { paid: "Paid", sent: "Sent", overdue: "Overdue" }[i.status];
    sheetState = { kind: "invoice-detail", id: id };
    openSheet(
      "<h2>" + i.id + '</h2><p class="sheet-sub">' + esc(i.label) + "</p>" +
      '<div class="kv-card" style="margin-bottom:16px">' +
        '<div class="kv-line"><span class="k">Client</span><span class="v">' + esc(p.client) + "</span></div>" +
        '<div class="kv-line"><span class="k">Project</span><span class="v">' + esc(p.name) + "</span></div>" +
        '<div class="kv-line"><span class="k">Issued</span><span class="v">' + i.date + "</span></div>" +
        '<div class="kv-line"><span class="k">Due</span><span class="v">' + i.due + "</span></div>" +
        '<div class="kv-line"><span class="k">Status</span><span class="chip ' + i.status + '">' + chip + "</span></div>" +
        '<div class="kv-line total"><span class="k">Total</span><span class="v money">' + money(i.amount) + "</span></div>" +
      "</div>" +
      (i.status === "paid"
        ? '<button class="btn ghost" data-action="fake-pdf">Download PDF</button>'
        : '<button class="btn" data-action="record-payment" data-arg="' + i.id + '">' + ic("check") + " Record payment</button>" +
          '<div style="height:10px"></div>' +
          '<button class="btn ghost" data-action="send-reminder" data-arg="' + i.id + '">Send a friendly reminder</button>')
    );
  }

  /* ---------- toasts ---------- */

  function toast(msg, icon) {
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = ic(icon || "check") + esc(msg);
    $toasts.appendChild(el);
    setTimeout(function () {
      el.classList.add("leaving");
      setTimeout(function () { el.remove(); }, 300);
    }, 2400);
  }

  /* ---------- actions ---------- */

  var RECEIPT_SEEDS = ["jobflow-lumber", "jobflow-paint", "jobflow-fittings", "jobflow-hardware"];
  var receiptIdx = 0;

  var actions = {
    "signin-google": function () {
      if (state.signingIn) return;
      state.signingIn = true;
      render();
      setTimeout(function () {
        state.signingIn = false;
        state.mode = "owner";
        state.tab = "home";
        render();
        toast("Signed in as Val Dranov");
      }, reducedMotion ? 50 : 700);
    },
    "goto-pin": function () { state.mode = "pin"; state.pin = ""; render(); },
    "pin-exit": function () { state.mode = "signin"; state.backNav = true; render(); },
    "pin-key": function (d) {
      if (state.pin.length >= 4) return;
      state.pin += d;
      render();
      if (state.pin.length === 4) {
        setTimeout(function () { state.mode = "worker"; render(); toast("Welcome back, Diego"); }, reducedMotion ? 50 : 350);
      }
    },
    "pin-del": function () { state.pin = state.pin.slice(0, -1); render(); },
    "tab": function (t) { state.tab = t; state.view = null; render(); },
    "goto-outstanding": function () { state.tab = "invoices"; state.invoiceFilter = "open"; state.view = null; render(); },
    "back": function () { state.view = null; state.backNav = true; render(); },
    "open-project": function (id) { state.view = { type: "project", id: id }; render(); },
    "open-invoice": function (id) { sheetInvoiceDetail(id); },
    "seg-invoice": function (f) { state.invoiceFilter = f; render(); },
    "close-sheet": closeSheet,
    "sheet-new-invoice": function (projectId) { sheetNewInvoice(projectId || null); },
    "sheet-new-expense": sheetNewExpense,
    "sheet-new-project": sheetNewProject,

    "dep-mode": function (mode, el) {
      sheetState.dep = mode;
      el.parentElement.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b === el); });
      updateDepPreview();
    },

    "send-invoice": function () {
      var amt = parseFloat(sheetState.amount);
      var field = document.getElementById("f-amount");
      if (!amt || amt <= 0) { field.classList.add("invalid"); return; }
      var p = project(sheetState.projectId);
      var dep = sheetState.dep;
      var now = dep === "half" ? amt / 2 : amt;
      var label = dep === "half" ? "50% deposit" : dep === "full" ? "Full amount" : "Balance due on completion";
      var id = "INV-" + nextInvoiceNum++;
      db.invoices.unshift({
        id: id, projectId: p.id, label: label, amount: Math.round(now * 100) / 100,
        status: "sent", date: todayLabel(), due: dep === "later" ? "On completion" : todayLabel(), ts: tsCounter++
      });
      closeSheet();
      state.tab = "invoices";
      state.invoiceFilter = "all";
      state.view = null;
      render();
      toast(id + " sent to " + p.client, "paper-plane-tilt");
    },

    "pick-cat": function (cat, el) {
      sheetState.cat = cat;
      el.parentElement.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b === el); });
    },

    "snap-receipt": function () {
      sheetState.seed = RECEIPT_SEEDS[receiptIdx++ % RECEIPT_SEEDS.length];
      var drop = document.getElementById("receipt-drop");
      drop.classList.add("has");
      drop.innerHTML = '<img src="https://picsum.photos/seed/' + sheetState.seed + '/96/96" alt="Receipt">' +
        "<span>Receipt attached</span>" + ic("check");
    },

    "save-expense": function () {
      var amt = parseFloat(sheetState.amount);
      var field = document.getElementById("f-exp-amount");
      if (!amt || amt <= 0) { field.classList.add("invalid"); return; }
      var note = (document.getElementById("exp-note").value || "").trim() || catLabel(sheetState.cat) + " purchase";
      var projectId = document.getElementById("exp-project").value || null;
      db.expenses.unshift({
        id: "e" + tsCounter, projectId: projectId, note: note, cat: sheetState.cat,
        amount: Math.round(amt * 100) / 100, date: todayLabel(), seed: sheetState.seed, ts: tsCounter++
      });
      closeSheet();
      state.tab = "expenses";
      state.view = null;
      render();
      toast("Expense saved", "wallet");
    },

    "save-project": function () {
      var name = (document.getElementById("pr-name").value || "").trim();
      var field = document.getElementById("f-pr-name");
      if (!name) { field.classList.add("invalid"); return; }
      var client = (document.getElementById("pr-client").value || "").trim() || "New client";
      var budget = parseFloat(document.getElementById("pr-budget").value) || 0;
      var id = "p" + tsCounter;
      db.projects.unshift({ id: id, name: name, client: client, addr: "", budget: budget || 1, status: "active" });
      closeSheet();
      state.tab = "projects";
      state.view = null;
      render();
      toast("Project created");
    },

    "record-payment": function (id) {
      var inv = db.invoices.find(function (i) { return i.id === id; });
      if (!inv || inv.status === "paid") return;
      inv.status = "paid";
      db.payments.unshift({ id: "pay" + tsCounter, invoiceId: id, amount: inv.amount, method: "Zelle", date: todayLabel(), ts: tsCounter++ });
      closeSheet();
      render();
      toast(money(inv.amount) + " from " + project(inv.projectId).client, "coins");
    },

    "send-reminder": function (id) {
      var inv = db.invoices.find(function (i) { return i.id === id; });
      closeSheet();
      toast("Reminder sent to " + project(inv.projectId).client, "paper-plane-tilt");
    },

    "fake-pdf": function () { closeSheet(); toast("PDF saved to Files"); },

    "toggle-task": function (id) {
      var t = db.tasks.find(function (x) { return x.id === id; });
      t.done = !t.done;
      render();
      var open = db.tasks.filter(function (x) { return x.projectId === "p1" && !x.done; }).length;
      if (open === 0) toast("All tasks done. Val has been notified.");
    },

    "clock-toggle": function () {
      state.clockedIn = !state.clockedIn;
      state.clockStart = state.clockedIn
        ? new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
        : null;
      render();
      toast(state.clockedIn ? "Clocked in. Have a good one." : "Clocked out. Hours sent to Val.", "clock");
    },

    "worker-nav": function () { toast("Opening Maps", "truck"); },
    "worker-call": function () { toast("Calling Val", "device-mobile"); },
    "worker-photo": function () {
      db.photos.push("jobflow-site-" + (db.photos.length + 1));
      render();
      toast("Photo added to the job", "camera");
    },
    "worker-exit": function () { state.mode = "signin"; state.backNav = true; render(); },

    "digest-open": function () { state.mode = "owner"; state.tab = "home"; state.view = null; render(); },
    "digest-back": function () { state.mode = "signin"; state.backNav = true; render(); },

    "tour-start": function () { startTour(); },
    "tour-next": function () { tourNext(); },
    "tour-skip": function () { endTour(); }
  };

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var fn = actions[el.dataset.action];
    if (fn) fn(el.dataset.arg, el);
  });

  document.addEventListener("input", function (e) {
    var key = e.target.dataset.input;
    if (!key) return;
    if (key === "inv-amount") {
      sheetState.amount = e.target.value;
      document.getElementById("f-amount").classList.remove("invalid");
      updateDepPreview();
    }
    if (key === "exp-amount") {
      sheetState.amount = e.target.value;
      document.getElementById("f-exp-amount").classList.remove("invalid");
    }
    if (key === "inv-project") sheetState.projectId = e.target.value;
  });

  /* ---------- guided tour ---------- */

  var tour = { active: false, step: -1, busy: false };

  var TOUR_STEPS = [
    {
      caption: "JobFlow has two front doors. Owners sign in with Google. Crews punch a 4-digit PIN. You are about to see both.",
      go: function () { state.mode = "signin"; state.pin = ""; state.view = null; closeSheet(); render(); }
    },
    {
      caption: "The dashboard answers the only questions that matter: what came in, what is profit, who still owes you, and how much to hold back for taxes.",
      go: async function () {
        state.signingIn = true; render();
        await sleep(reducedMotion ? 50 : 650);
        state.signingIn = false; state.mode = "owner"; state.tab = "home"; render();
      }
    },
    {
      caption: "Invoicing is three taps. Pick the job, type the number, choose how much to collect up front.",
      go: async function () {
        state.tab = "invoices"; state.invoiceFilter = "all"; render();
        await sleep(reducedMotion ? 50 : 700);
        sheetNewInvoice("p2");
        await sleep(reducedMotion ? 50 : 500);
        var input = document.getElementById("inv-amount");
        if (input) { input.value = "6150"; sheetState.amount = "6150"; updateDepPreview(); }
      }
    },
    {
      caption: "Deposits are built in: half up front, the full amount, or invoice now and collect later. Cash flow stops being a surprise.",
      go: async function () {
        var btn = document.querySelector('[data-action="dep-mode"][data-arg="half"]');
        if (btn) actions["dep-mode"]("half", btn);
        await sleep(reducedMotion ? 50 : 400);
        actions["send-invoice"]();
      }
    },
    {
      caption: "When money lands, one tap records it and every number on the dashboard moves with it.",
      go: async function () {
        await sleep(reducedMotion ? 50 : 500);
        actions["record-payment"]("INV-1040");
        await sleep(reducedMotion ? 50 : 600);
        state.tab = "home"; render();
      }
    },
    {
      caption: "Expenses get snapped at the register: photo, category, job. Profit per job stays honest.",
      go: async function () { state.tab = "expenses"; render(); }
    },
    {
      caption: "Now the other door. Crew members get a stripped-down app with a PIN. No accounts, no email, no app-store friction.",
      go: async function () {
        state.mode = "pin"; state.pin = ""; render();
        await sleep(reducedMotion ? 100 : 700);
        for (var d of ["4", "5", "0", "9"]) {
          state.pin += d; render();
          await sleep(reducedMotion ? 30 : 260);
        }
        state.mode = "worker"; render();
      }
    },
    {
      caption: "Tasks, clock-in, and site photos. The crew checks things off, and the office sees progress without a single phone call.",
      go: async function () {
        await sleep(reducedMotion ? 50 : 500);
        actions["toggle-task"]("t3");
      }
    },
    {
      caption: "And every morning at 7, the whole business arrives as one text. No dashboard required.",
      go: async function () {
        state.mode = "digest"; render();
      }
    },
    {
      caption: "That is JobFlow. Everything you just watched is live. Poke around, send an invoice, break nothing.",
      go: async function () {
        state.mode = "signin"; state.pin = ""; render();
      }
    }
  ];

  function startTour() {
    tour.active = true;
    tour.step = -1;
    $tourLayer.hidden = false;
    tourNext();
  }

  async function tourNext() {
    if (tour.busy) return;
    tour.step += 1;
    if (tour.step >= TOUR_STEPS.length) { endTour(); return; }
    tour.busy = true;
    renderTourCard(true);
    try { await TOUR_STEPS[tour.step].go(); } catch (err) { /* keep tour alive */ }
    tour.busy = false;
    renderTourCard(false);
  }

  function renderTourCard(busy) {
    var last = tour.step === TOUR_STEPS.length - 1;
    $tourCard.innerHTML =
      '<div class="step">Tour &middot; ' + (tour.step + 1) + " of " + TOUR_STEPS.length + "</div>" +
      "<p>" + TOUR_STEPS[tour.step].caption + "</p>" +
      '<div class="tour-actions">' +
        '<button class="tour-next" data-action="tour-next"' + (busy ? " disabled" : "") + ">" + (last ? "Finish" : "Next") + "</button>" +
        '<button class="tour-skip" data-action="tour-skip">End tour</button>' +
      "</div>";
  }

  function endTour() {
    tour.active = false;
    $tourLayer.hidden = true;
    $tourCard.innerHTML = "";
  }

  /* ---------- navigation API (postMessage from the case study, ?go= deep links) ---------- */

  function handleNav(dest) {
    endTour();
    closeSheet();
    switch (dest) {
      case "reset":
      case "signin":
        state.mode = "signin"; state.pin = ""; state.view = null; render(); break;
      case "owner":
      case "home":
        state.mode = "owner"; state.tab = "home"; state.view = null; render(); break;
      case "projects":
      case "invoices":
      case "payments":
      case "expenses":
        state.mode = "owner"; state.tab = dest; state.view = null; render(); break;
      case "new-invoice":
        state.mode = "owner"; state.tab = "invoices"; state.view = null; render();
        sheetNewInvoice(null); break;
      case "worker":
        state.mode = "pin"; state.pin = ""; render(); break;
      case "digest":
        state.mode = "digest"; state.view = null; render(); break;
      case "tour":
        state.mode = "signin"; state.pin = ""; state.view = null; render();
        startTour(); break;
    }
  }

  window.addEventListener("message", function (e) {
    var msg = e.data;
    if (!msg || msg.type !== "jf-nav") return;
    handleNav(msg.dest);
  });

  /* ---------- boot ---------- */

  render();

  var go = new URLSearchParams(location.search).get("go");
  if (go) handleNav(go);
})();
