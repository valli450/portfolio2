/* Use-case exhibits: eight distinct staged demos in an overlay theater.
   Every interaction is constrained (buttons, not free text) so nothing
   pretends to be a live model. Timers are cleaned up on close. */

(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function money(n) {
    return "$" + n.toLocaleString("en-US", {
      minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2
    });
  }

  function ic(name) {
    return (typeof ICONS !== "undefined" && ICONS[name])
      ? '<svg class="icon" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>'
      : "";
  }

  /* ---------- overlay shell ---------- */

  let active = null;

  function openExhibit(id) {
    const ex = EXHIBITS[id];
    if (!ex || active) return;

    const timers = new Set();
    const ctx = {
      t(fn, ms) {
        const id = setTimeout(() => { timers.delete(id); fn(); }, reduced ? Math.min(ms, 80) : ms);
        timers.add(id);
      },
      money: money, el: el
    };

    const overlay = el("div", "ex-overlay");
    const panel = el("div", "ex-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", ex.title);

    const head = el("div", "ex-head");
    head.appendChild(el("span", "ex-biz", ex.biz));
    head.appendChild(el("span", "ex-title", ex.title));
    const closeBtn = el("button", "ex-close", "&#10005;");
    closeBtn.setAttribute("aria-label", "Close demo");
    head.appendChild(closeBtn);
    panel.appendChild(head);

    const stage = el("div", "ex-stage");
    panel.appendChild(stage);

    const foot = el("div", "ex-foot");
    foot.appendChild(el("span", null, "Staged demo of the deployed automation."));
    const replay = el("button", "ex-replay", "Replay");
    foot.appendChild(replay);
    panel.appendChild(foot);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const prevFocus = document.activeElement;
    closeBtn.focus();

    function close() {
      timers.forEach(clearTimeout);
      timers.clear();
      overlay.remove();
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      active = null;
      if (prevFocus && prevFocus.focus) prevFocus.focus();
    }
    function onKey(e) { if (e.key === "Escape") close(); }

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    document.addEventListener("keydown", onKey);
    replay.addEventListener("click", () => {
      timers.forEach(clearTimeout);
      timers.clear();
      stage.innerHTML = "";
      ex.render(stage, ctx);
    });

    active = id;
    ex.render(stage, ctx);
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-exhibit]");
    if (btn) openExhibit(btn.dataset.exhibit);
  });

  /* ---------- shared: SMS thread helpers ---------- */

  function smsThread(parent) {
    const box = el("div", "ex-sms");
    parent.appendChild(box);
    return {
      box: box,
      stamp(txt) { box.appendChild(el("div", "stamp", txt)); this.scroll(); },
      bubble(dir, txt, who) {
        const b = el("div", "ex-bubble " + dir + " ex-in",
          (who ? '<span class="who">' + who + "</span>" : "") + txt);
        box.appendChild(b);
        this.scroll();
        return b;
      },
      typing() {
        const t = el("div", "ex-bubble in ex-typing", "<i></i><i></i><i></i>");
        box.appendChild(t);
        this.scroll();
        return t;
      },
      quick(options, onPick) {
        const row = el("div", "ex-quick");
        options.forEach((opt) => {
          const b = el("button", null, opt);
          b.addEventListener("click", () => { row.remove(); onPick(opt); });
          row.appendChild(b);
        });
        box.appendChild(row);
        this.scroll();
      },
      scroll() {
        const st = box.closest(".ex-stage");
        if (st) st.scrollTop = st.scrollHeight;
      }
    };
  }

  /* ---------- exhibits ---------- */

  const EXHIBITS = {

    /* 1. dental: schedule board self-heals */
    dental: {
      biz: "Dental office",
      title: "The 2:30 just cancelled",
      render(stage, ctx) {
        const wrap = el("div", "dx-wrap");
        const cal = el("div", "dx-cal");
        cal.appendChild(el("div", "dx-cal-head", "Tuesday, hygiene chair 2"));
        const slots = [
          { t: "1:30", p: "Ana Petrossian", s: "Cleaning" },
          { t: "2:30", p: "Marta Silva", s: "Crown prep", key: true },
          { t: "3:30", p: "Devon Wright", s: "Recall exam" },
          { t: "4:30", p: "Priya Raman", s: "Cleaning" }
        ];
        let keySlot;
        slots.forEach((s) => {
          const row = el("div", "dx-slot",
            '<span class="t">' + s.t + '</span><span><span class="p">' + s.p + '</span><span class="s">' + s.s + "</span></span>");
          if (s.key) {
            keySlot = row;
            const btn = el("button", "dx-cancel", "Cancel the 2:30");
            btn.addEventListener("click", () => run(btn));
            row.appendChild(btn);
          }
          cal.appendChild(row);
        });
        wrap.appendChild(cal);
        const right = el("div", "dx-threads");
        right.appendChild(el("div", "dx-idle", "Cancel the 2:30 and watch the recall list catch it."));
        wrap.appendChild(right);
        stage.appendChild(wrap);

        function thread(name, outTxt) {
          const t = el("div", "dx-thread ex-in",
            '<div class="who"><span>' + name + "</span></div>");
          const sms = smsThread(t);
          right.appendChild(t);
          sms.bubble("out", outTxt);
          return { root: t, sms: sms, mark(cls, label) {
            t.querySelector(".who").appendChild(el("em", cls, label));
          } };
        }

        function run(btn) {
          btn.remove();
          right.innerHTML = "";
          keySlot.classList.add("open");
          keySlot.querySelector(".p").textContent = "OPEN";
          keySlot.querySelector(".s").textContent = "Marta Silva cancelled";
          const ask = "Hi, it's Harborview Dental. A 2:30 opening came up today. Want it for your overdue cleaning? Reply YES to take it.";

          ctx.t(() => right.appendChild(el("div", "dx-idle ex-in", "Agent is texting the recall list, oldest overdue first...")), 300);
          ctx.t(() => {
            right.innerHTML = "";
            const t1 = thread("Rita Kagan, 8 mo overdue", ask);
            ctx.t(() => { t1.sms.bubble("in", "Can't today, I'm at work. Book me next week?"); t1.mark("no", "Declined, rebooked"); }, 1400);
          }, 900);
          ctx.t(() => {
            const t2 = thread("Jules Moreau, 7 mo overdue", ask);
            ctx.t(() => t2.mark("no", "No reply in 4 min"), 1500);
          }, 3200);
          ctx.t(() => {
            const t3 = thread("Sam Okafor, 6 mo overdue", ask);
            ctx.t(() => { t3.sms.bubble("in", "YES. See you at 2:30."); t3.mark("yes", "Confirmed"); }, 1300);
          }, 5600);
          ctx.t(() => {
            keySlot.classList.remove("open");
            keySlot.classList.add("filled-new");
            keySlot.querySelector(".p").textContent = "Sam Okafor";
            keySlot.querySelector(".s").textContent = "Recall exam, confirmed by text";
            stage.appendChild(el("div", "ex-stat", "Chair refilled in 11 minutes. The front desk never picked up a phone."));
          }, 7400);
        }
      }
    },

    /* 2. restaurant: playable missed-call text-back */
    restaurant: {
      biz: "Restaurant",
      title: "You are the customer now",
      render(stage, ctx) {
        const sms = smsThread(stage);
        sms.stamp("Friday, 6:42 pm. You call Little Anchor Pizza. The kitchen is slammed.");
        const ring = sms.bubble("in", "Calling Little Anchor Pizza...", "Your phone");
        ctx.t(() => {
          ring.innerHTML = '<span class="who">Your phone</span>Call ended. No answer after 6 rings.';
          const ty = sms.typing();
          ctx.t(() => {
            ty.remove();
            sms.bubble("in", "Hey, this is Little Anchor. Sorry we missed you, Friday rush. Are you after a table or takeout?", "Little Anchor Pizza");
            sms.quick(["A table for 6", "Takeout"], (pick) => {
              sms.bubble("out", pick);
              const ty2 = sms.typing();
              ctx.t(() => {
                ty2.remove();
                if (pick === "Takeout") {
                  sms.bubble("in", "Easy. Text your order and a pickup time, we'll have it ready.", "Little Anchor Pizza");
                  stage.appendChild(el("div", "ex-stat", "The missed call still became an order. Nobody at the restaurant touched a phone."));
                  return;
                }
                sms.bubble("in", "Can do. Tonight or tomorrow?", "Little Anchor Pizza");
                sms.quick(["Tonight, 7:30", "Tomorrow"], (when) => {
                  sms.bubble("out", when);
                  const ty3 = sms.typing();
                  ctx.t(() => {
                    ty3.remove();
                    sms.bubble("in", "Done. Table for 6 " + (when === "Tomorrow" ? "tomorrow at 7:30" : "tonight at 7:30") + ", under this number. Reply C anytime to cancel.", "Little Anchor Pizza");
                    sms.stamp("Host stand, same second:");
                    sms.bubble("in", "NEW RESERVATION &middot; Party of 6 &middot; 7:30 &middot; came in via text-back", "Host tablet");
                    stage.appendChild(el("div", "ex-stat", "A dropped call became a party of six. The agent booked it while the kitchen kept cooking."));
                  }, 1100);
                });
              }, 1100);
            });
          }, 1300);
        }, 2200);
      }
    },

    /* 3. landscaping: photos become an estimate */
    landscape: {
      biz: "Landscaping",
      title: "Three photos become a quote",
      render(stage, ctx) {
        stage.appendChild(el("p", null, "A homeowner in Weymouth texts three photos of the yard. Send them through."));
        const photos = el("div", "qx-photos");
        const shots = [
          { file: "IMG_2041.jpg", label: "front beds" },
          { file: "IMG_2042.jpg", label: "hedge line" },
          { file: "IMG_2043.jpg", label: "west slope" }
        ];
        const notes = [
          "front beds, roughly 110 linear ft, edging gone soft",
          "hedge line about 60 ft, one season overgrown",
          "west side slopes to the fence, mulch will need staking"
        ];
        let sent = 0;
        const notesBox = el("div", "qx-notes");
        shots.forEach((shot, i) => {
          const b = el("button", null,
            ic("camera") + "<b>" + shot.file + "</b><small>" + shot.label + '</small><span class="send-tag">Tap to send</span>');
          b.addEventListener("click", () => {
            if (b.classList.contains("sent")) return;
            b.classList.add("sent");
            b.querySelector(".send-tag").textContent = "Sent";
            notesBox.appendChild(el("div", "ex-in", notes[i]));
            sent += 1;
            if (sent === 3) ctx.t(buildDoc, 900);
          });
          photos.appendChild(b);
        });
        stage.appendChild(photos);
        stage.appendChild(notesBox);
        stage.style.marginTop = "";

        function buildDoc() {
          const doc = el("div", "qx-doc ex-in");
          doc.appendChild(el("h4", null, "Estimate draft, 14 Cedar Ln"));
          doc.appendChild(el("div", "sub", "Assembled from the photos, priced from your rate sheet"));
          stage.appendChild(doc);
          const lines = [
            ["Spring cleanup and haul-away", 340],
            ["Bed edging, 110 ft", 385],
            ["Mulch install, 12 yd, slope staking", 1140],
            ["Hedge trim, 60 ft", 260]
          ];
          let total = 0;
          lines.forEach((ln, i) => {
            ctx.t(() => {
              total += ln[1];
              doc.appendChild(el("div", "qx-line ex-in", "<span>" + ln[0] + "</span><b>" + money(ln[1]) + "</b>"));
              if (i === lines.length - 1) {
                doc.appendChild(el("div", "qx-line total", "<span>Total</span><b>" + money(total) + "</b>"));
                const approve = el("button", "ex-btn", "Approve and send");
                approve.style.marginTop = "14px";
                approve.addEventListener("click", () => {
                  approve.remove();
                  stage.appendChild(el("div", "ex-stat", "Quote sent 4 minutes after the photos arrived. The owner tapped one button from the truck."));
                });
                doc.appendChild(approve);
              }
            }, 500 + i * 550);
          });
        }
      }
    },

    /* 4. liquor: allocation clock */
    bottledrop: {
      biz: "Liquor store",
      title: "Six bottles, zero shelf time",
      render(stage, ctx) {
        stage.appendChild(el("p", null, "Tuesday, 11:04 am. The distributor drops six bottles of Blanton's, the kind of allocation that used to sit behind the counter for whoever asked."));
        const top = el("div", "kx-top");
        const countWrap = el("div");
        const count = el("div", "kx-count", "6");
        countWrap.appendChild(count);
        countWrap.appendChild(el("div", "lbl", "bottles left"));
        top.appendChild(countWrap);
        const go = el("button", "ex-btn", "Send the drop alert");
        top.appendChild(go);
        stage.appendChild(top);
        const feed = el("div", "kx-feed");
        stage.appendChild(feed);

        const claims = [
          ["11:07", "Dmitri B. replies: HOLD ONE. Coming at lunch."],
          ["11:09", "Lauren C. replies: one for me, paying by card on file."],
          ["11:16", "Marcus T. replies: still have any? one please."],
          ["11:22", "Aya N. replies: hold one, be there by 5."],
          ["11:31", "Chris D. replies: ONE. do not sell my bottle."],
          ["11:45", "Priya V. replies: taking the last one if it's real."]
        ];

        go.addEventListener("click", () => {
          go.remove();
          line("11:04", "sys", "Alert queued to the rare-bottle text list: 214 subscribers.");
          line("11:05", "sys", "Sent. First come, one per customer, card on file holds it.");
          let left = 6;
          claims.forEach((c, i) => {
            ctx.t(() => {
              line(c[0], "claim", c[1]);
              left -= 1;
              count.textContent = String(left);
              if (left === 0) {
                count.classList.add("zero");
                ctx.t(() => {
                  line("11:45", "sold", "Sold out. 41 minutes, zero hours on the shelf.");
                  stage.appendChild(el("div", "ex-stat", "The list did the selling. The counter never got asked “got any Blanton's?” even once."));
                }, 600);
              }
            }, 700 + i * 950);
          });
        });

        function line(t, cls, msg) {
          feed.appendChild(el("div", "kx-line " + cls + " ex-in", '<span class="t">' + t + '</span><span class="m">' + msg + "</span>"));
        }
      }
    },

    /* 5. auto shop: review triage inbox */
    autoshop: {
      biz: "Auto shop",
      title: "Three reviews, one judgment call",
      render(stage, ctx) {
        stage.appendChild(el("p", null, "Overnight, three Google reviews landed. Open each one."));
        const list = el("div", "rx-list");
        stage.appendChild(list);
        let handled = 0;

        const reviews = [
          {
            stars: 5, who: "Marcus T.",
            txt: "Brakes done same day, price matched the quote to the dollar. These guys are my shop now.",
            tone: "Warm thanks, invite him back",
            reply: "“Thanks Marcus. Quote matching the invoice is the whole point. See you at the next oil change, it's on the calendar.”"
          },
          {
            stars: 3, who: "Dana R.",
            txt: "Work was fine but I sat there 40 minutes past my appointment time with no update.",
            tone: "Own the wait, offer priority",
            reply: "“Dana, you're right and we hate that too. Next visit comes with a priority bay and a text the minute your car is on the lift.”"
          },
          {
            stars: 1, who: "Gary V.",
            txt: "Charged me $140 for a diagnostic I NEVER approved. Calling my card company. Avoid this place!!",
            escalate: true
          }
        ];

        reviews.forEach((r) => {
          const stars = "★".repeat(r.stars) + "<i>" + "★".repeat(5 - r.stars) + "</i>";
          const card = el("button", "rx-card",
            '<span class="stars">' + stars + '</span><span class="who">' + r.who + '</span><div class="txt">' + r.txt + "</div>");
          card.addEventListener("click", () => {
            if (card.dataset.done) return;
            card.dataset.done = "1";
            const res = el("div", "rx-result ex-in");
            card.appendChild(res);
            if (!r.escalate) {
              res.appendChild(el("span", "rx-tone", r.tone));
              const reply = el("div", "rx-reply", "");
              res.appendChild(reply);
              typeIn(reply, r.reply, () => {
                res.appendChild(el("div", "rx-posted", "Posted to Google, " + (r.stars === 5 ? "34" : "51") + " seconds after triage"));
                done();
              });
            } else {
              res.appendChild(el("span", "rx-tone warn", "Refund dispute detected, no auto-reply"));
              ctx.t(() => {
                res.appendChild(el("div", "rx-escalate ex-in",
                  "<b>Routed to the owner's phone</b>" +
                  "Gary V., $140 diagnostic dispute. Suggested script: call him, pull the signed intake form, offer the refund if the signature is not there. Reviews like this get deleted by customers after a good call, not a good comment."));
                done();
              }, 900);
            }
          });
          list.appendChild(card);
        });

        function done() {
          handled += 1;
          if (handled === 3) {
            stage.appendChild(el("div", "ex-stat", "Two replies posted by the agent. One judgment call sent to a human. Knowing the difference is the product."));
          }
        }

        function typeIn(node, text, then) {
          if (reduced) { node.textContent = text; then(); return; }
          let i = 0;
          (function step() {
            i = Math.min(text.length, i + 3);
            node.textContent = text.slice(0, i);
            if (i < text.length) ctx.t(step, 24);
            else then();
          })();
        }
      }
    },

    /* 6. cleaning: the aging wall */
    cleaning: {
      biz: "Cleaning company",
      title: "Friday, the chase runs itself",
      render(stage, ctx) {
        stage.appendChild(el("p", null, "Eighteen recurring accounts. Green is paid, amber is 15 to 30 days out, red is older. Run the Friday chase."));
        const legend = el("div", "wx-legend",
          '<span class="g">Current</span><span class="a">15-30 days</span><span class="r">30+ days</span>');
        stage.appendChild(legend);

        const units = [
          "Maple 2B", "Harbor St", "Elm Duplex", "Otis Law", "Beal House", "Rt 53 Dental",
          "Cedar 14", "Quincy Ave", "Snug Harbor", "Pond Unit 3", "Bright Smiles", "Nantasket",
          "Webb Park", "Union Loft", "Hilltop", "Ferry 9", "Standish", "Cove Cafe"
        ];
        const state = units.map((u, i) => ({
          name: u,
          owed: [0, 0, 0, 240, 0, 0, 380, 0, 190, 0, 520, 260, 0, 0, 610, 0, 0, 2110][i],
          cls: [0, 0, 0, 240, 0, 0, 380, 0, 190, 0, 520, 260, 0, 0, 610, 0, 0, 2110][i] === 0 ? "g"
            : i === 17 ? "r" : (i === 10 || i === 14 ? "r" : "a")
        }));

        const grid = el("div", "wx-grid");
        const tiles = state.map((s) => {
          const t = el("div", "wx-tile " + s.cls, s.name + (s.owed ? "<small>" + money(s.owed) + "</small>" : "<small>paid</small>"));
          grid.appendChild(t);
          return t;
        });
        stage.appendChild(grid);

        const bar = el("div", "wx-bar");
        const day = el("span", "day", "");
        const sum = el("span", "sum", "");
        bar.appendChild(day);
        const go = el("button", "ex-btn", "Run the Friday chase");
        bar.appendChild(go);
        bar.appendChild(sum);
        stage.appendChild(bar);

        go.addEventListener("click", () => {
          go.remove();
          let collected = 0;
          const overdue = state.map((s, i) => ({ s: s, i: i })).filter(x => x.s.owed > 0);
          const stubborn = 17;

          const script = [];
          script.push([300, () => day.textContent = "Fri: polite nudges go out"]);
          overdue.forEach((x) => script.push([200, () => tiles[x.i].classList.add("nudge")]));
          script.push([1400, () => {
            day.textContent = "Mon: payments start landing";
            overdue.forEach(x => tiles[x.i].classList.remove("nudge"));
          }]);
          const payOrder = overdue.filter(x => x.i !== stubborn);
          payOrder.forEach((x, k) => script.push([800, () => {
            tiles[x.i].className = "wx-tile g";
            tiles[x.i].innerHTML = x.s.name + "<small>paid</small>";
            collected += x.s.owed;
            sum.textContent = money(collected) + " in";
          }]));
          script.push([900, () => { day.textContent = "Wed: nudge 2, then 3, for the holdout"; tiles[stubborn].classList.add("nudge"); }]);
          script.push([1300, () => {
            tiles[stubborn].classList.remove("nudge");
            tiles[stubborn].classList.add("flag");
            tiles[stubborn].innerHTML = state[stubborn].name + "<small>call the owner</small>";
            day.textContent = "Fri again: one left";
            stage.appendChild(el("div", "ex-stat", money(collected) + " collected without a single awkward phone call. One 45-day account escalated to a human, with the full history attached."));
          }]);

          let acc = 0;
          script.forEach((step) => { acc += step[0]; ctx.t(step[1], acc); });
        });
      }
    },

    /* 7. bakery: the fan-out */
    bakery: {
      biz: "Bakery",
      title: "One text, four channels",
      render(stage, ctx) {
        stage.appendChild(el("p", null, "The owner texts the agent one message on the way in. Pick which one."));
        const picks = el("div", "fx-picks");
        stage.appendChild(picks);

        const options = [
          { msg: "lemon tarts today, small batch, out at 7", item: "Lemon tarts", detail: "small batch, fresh at 7 am" },
          { msg: "sourdough drop saturday, reserve at the counter", item: "Sourdough drop", detail: "Saturday, reserve at the counter" },
          { msg: "cinnamon knots back by popular demand", item: "Cinnamon knots", detail: "back by popular demand" }
        ];

        options.forEach((o) => {
          const b = el("button", null,
            '<span class="fx-attach">' + ic("camera") + "</span><span>&ldquo;" + o.msg + '&rdquo;</span>');
          b.addEventListener("click", () => fanOut(o));
          picks.appendChild(b);
        });

        function fanOut(o) {
          picks.remove();
          const sms = smsThread(stage);
          sms.bubble("out", o.msg + " [photo]", "Owner, 6:41 am");
          const out = el("div", "fx-out");
          stage.appendChild(out);
          const img = '<div class="fx-photo">' + ic("camera") + "<span>owner's photo, auto-cropped square</span></div>";
          const cards = [
            ["fx-ig", "Instagram", img + o.item + ", " + o.detail + ". Gone when they're gone." +
              '<span class="fx-tags">#southshore #bakery #' + o.item.toLowerCase().replace(/[^a-z]/g, "") + "</span>"],
            ["fx-fb", "Facebook", o.item + ", fresh today: " + o.detail + ". First come, first served at the counter."],
            ["fx-gb", "Google Business", "Update: " + o.item + " available today. " + o.detail + ". Open 7 am to 3 pm."],
            ["fx-web", "Website specials board", "<b>" + o.item + "</b><br>" + o.detail]
          ];
          cards.forEach((c, i) => {
            ctx.t(() => {
              out.appendChild(el("div", "fx-card " + c[0] + " ex-in", '<span class="ch">' + c[1] + "</span>" + c[2]));
              if (i === cards.length - 1) {
                stage.appendChild(el("div", "ex-stat", "One text became four posts, each written for its channel. An hour of marketing now costs eleven words."));
              }
            }, 500 + i * 650);
          });
        }
      }
    },

    /* 8. contractor: run the day by text */
    digest: {
      biz: "Contractor",
      title: "The office is a phone number",
      render(stage, ctx) {
        const sms = smsThread(stage);
        sms.stamp("Tuesday, 7:00 am");
        sms.bubble("in",
          "Morning. <b>Money:</b> $23,250 in this month, 2 invoices open ($3,675). <b>Crew:</b> bathroom remodel 40% done, on schedule. <b>Today:</b> 3 jobs, rain risk on the Deerfield roof after 2. Reply 1 to chase the open invoices, 2 for the schedule.",
          "JobFlow digest");
        offer();

        function offer() {
          sms.quick(["1", "2"], (pick) => {
            sms.bubble("out", pick);
            const ty = sms.typing();
            if (pick === "1") {
              ctx.t(() => {
                ty.remove();
                sms.bubble("in", "Friendly reminders sent to Marek Kowalski ($2,100, due the 25th) and Luz Ferreira ($1,575, two weeks late). Ferreira gets the firmer template.", "JobFlow digest");
                sms.stamp("9:14 am");
                sms.bubble("in", "Payment received: $1,575 from Luz Ferreira, Zelle. One invoice left open.", "JobFlow digest");
                stage.appendChild(el("div", "ex-stat", "The overdue invoice got chased and paid before the second coffee. Total owner effort: one character."));
              }, 1200);
            } else {
              ctx.t(() => {
                ty.remove();
                sms.bubble("in", "8:00 Kowalski bathroom, tile day. 10:30 Ferreira panel walk-through. 1:00 Deerfield roof, move underlayment before the rain window. Diego and Alex confirmed on site.", "JobFlow digest");
                offer();
              }, 1200);
            }
          });
        }
      }
    }
  };
})();
