/**
 * UHD Review — client-side logic (multi-session).
 *
 * Injected into the page by template.ts.
 * Placeholders replaced at render time:
 *   __SESSIONS_DATA__ → JSON array of session objects
 *   __MODE__          → "single" or "multi"
 */

(function () {
  var sessions = __SESSIONS_DATA__;
  var mode = __MODE__;

  // state[sessionId][filename] = { status, newPrompt, numImages }
  var state = {};

  // ── Init ───────────────────────────────────────────────────

  sessions.forEach(function (session) {
    state[session.id] = {};
    session.images.forEach(function (img) {
      var ex = session.selections[img.filename];
      state[session.id][img.filename] = {
        status: ex ? ex.status : null,
        newPrompt: ex && ex.newPrompt ? ex.newPrompt : img.prompt,
        numImages: ex && ex.numImages ? ex.numImages : 1,
      };
    });
  });

  // ── Filter bar setup ───────────────────────────────────────

  var activeFilter = "all";
  var filterBar = document.getElementById("filterBar");

  if (mode === "single") {
    filterBar.classList.add("hidden");
  }

  var filterBtns = filterBar.querySelectorAll(".filter-btn");
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filterBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      activeFilter = btn.getAttribute("data-filter");
      applyFilter();
    });
  });

  function applyFilter() {
    var blocks = document.querySelectorAll(".session-block");
    blocks.forEach(function (block) {
      var status = block.getAttribute("data-status");
      if (activeFilter === "all" || status === activeFilter) {
        block.classList.remove("hidden");
      } else {
        block.classList.add("hidden");
      }
    });
  }

  // ── DOM helper ─────────────────────────────────────────────

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function imageSrc(sessionId, filename) {
    return "/sessions/" + encodeURIComponent(sessionId) + "/images/" + encodeURIComponent(filename);
  }

  // ── Render ─────────────────────────────────────────────────

  function render() {
    var container = document.getElementById("sessionsContainer");
    while (container.firstChild) container.removeChild(container.firstChild);

    sessions.forEach(function (session, si) {
      var block = el("div", "session-block");
      block.setAttribute("data-status", session.status);
      block.setAttribute("data-session", session.id);

      // Session header (hidden in single mode)
      if (mode === "multi") {
        var header = el("div", "session-header");
        header.addEventListener("click", function (e) {
          if (e.target.tagName === "BUTTON") return;
          block.classList.toggle("collapsed");
        });

        var toggle = el("span", "session-toggle", "\u25BC");
        header.appendChild(toggle);

        header.appendChild(el("span", "session-id", session.id));
        header.appendChild(el("span", "status-badge " + session.status, session.status));

        var stats = el("span", "session-stats");
        var imgCount = el("span", null, session.images.length + " imgs");
        var costSpan = el("span", null, "$" + session.totalCost.toFixed(2));
        stats.appendChild(imgCount);
        stats.appendChild(costSpan);
        header.appendChild(stats);

        var actions = el("div", "session-actions");

        var btnKeepAll = el("button", "btn-keep-all", "Keep All");
        btnKeepAll.addEventListener("click", function (e) {
          e.stopPropagation();
          bulkSetSession(session.id, "keep");
        });
        actions.appendChild(btnKeepAll);

        var btnRejectAll = el("button", "btn-reject-all", "Reject All");
        btnRejectAll.addEventListener("click", function (e) {
          e.stopPropagation();
          bulkSetSession(session.id, "reject");
        });
        actions.appendChild(btnRejectAll);

        var btnFinalize = el("button", "btn-finalize", "Finalize");
        btnFinalize.addEventListener("click", function (e) {
          e.stopPropagation();
          finalizeSession(session.id);
        });
        actions.appendChild(btnFinalize);

        header.appendChild(actions);
        block.appendChild(header);
      }

      // Session body with grid
      var body = el("div", "session-body");
      var grid = el("div", "grid");

      session.images.forEach(function (img, idx) {
        var cardId = "card-" + si + "-" + idx;
        var regenId = "regen-" + si + "-" + idx;
        var s = state[session.id][img.filename];

        var card = el("div", "card " + (s.status || ""));
        card.id = cardId;

        // Image thumbnail
        var imgWrap = el("div", "card-img");
        imgWrap.addEventListener("click", function () {
          openLightbox(imageSrc(session.id, img.filename));
        });
        var imgEl = el("img");
        imgEl.src = imageSrc(session.id, img.filename);
        imgEl.alt = img.filename;
        imgEl.loading = "lazy";
        imgWrap.appendChild(imgEl);
        imgWrap.appendChild(el("span", "badge " + img.model, img.model));
        if (img.round > 0)
          imgWrap.appendChild(el("span", "round-badge", "Round " + img.round));
        card.appendChild(imgWrap);

        // Info
        var info = el("div", "card-info");
        info.appendChild(el("div", "card-filename", img.filename));
        info.appendChild(el("div", "card-prompt", img.prompt));
        if (img.width)
          info.appendChild(el("div", "card-dims", img.width + "x" + img.height));
        card.appendChild(info);

        // Action buttons
        var actionsDiv = el("div", "card-actions");
        var btnK = el(
          "button",
          "btn-keep " + (s.status === "keep" ? "active-keep" : ""),
          "Keep"
        );
        btnK.addEventListener("click", function () {
          setStatus(session.id, img.filename, "keep", cardId, regenId);
        });
        var btnR = el(
          "button",
          "btn-reject " + (s.status === "reject" ? "active-reject" : ""),
          "Reject"
        );
        btnR.addEventListener("click", function () {
          setStatus(session.id, img.filename, "reject", cardId, regenId);
        });
        var btnG = el(
          "button",
          "btn-regen " + (s.status === "regenerate" ? "active-regen" : ""),
          "Regen"
        );
        btnG.addEventListener("click", function () {
          toggleRegen(session.id, img.filename, cardId, regenId);
        });
        actionsDiv.appendChild(btnK);
        actionsDiv.appendChild(btnR);
        actionsDiv.appendChild(btnG);
        card.appendChild(actionsDiv);

        // Regen panel
        var panel = el(
          "div",
          "regen-panel " + (s.status === "regenerate" ? "open" : "")
        );
        panel.id = regenId;

        panel.appendChild(el("label", null, "Modified prompt:"));
        var ta = document.createElement("textarea");
        ta.value = s.newPrompt || img.prompt;
        ta.addEventListener(
          "input",
          (function (sid, fn) {
            return function () {
              state[sid][fn].newPrompt = this.value;
            };
          })(session.id, img.filename)
        );
        panel.appendChild(ta);

        panel.appendChild(el("label", null, "Number of images:"));
        var sel = document.createElement("select");
        for (var n = 1; n <= 4; n++) {
          var opt = el("option", null, String(n));
          opt.value = String(n);
          if (s.numImages === n) opt.selected = true;
          sel.appendChild(opt);
        }
        sel.addEventListener(
          "change",
          (function (sid, fn) {
            return function () {
              state[sid][fn].numImages = parseInt(this.value);
            };
          })(session.id, img.filename)
        );
        panel.appendChild(sel);
        card.appendChild(panel);

        grid.appendChild(card);
      });

      body.appendChild(grid);
      block.appendChild(body);
      container.appendChild(block);
    });

    updateCounts();
  }

  // ── State management ───────────────────────────────────────

  function setStatus(sessionId, filename, status, cardId, regenId) {
    var s = state[sessionId][filename];
    s.status = s.status === status ? null : status;
    if (s.status !== "regenerate") {
      var p = document.getElementById(regenId);
      if (p) p.classList.remove("open");
    }
    updateCard(sessionId, filename, cardId);
    updateCounts();
  }

  function toggleRegen(sessionId, filename, cardId, regenId) {
    var s = state[sessionId][filename];
    var isRegen = s.status === "regenerate";
    s.status = isRegen ? null : "regenerate";
    document.getElementById(regenId).classList[isRegen ? "remove" : "add"]("open");
    updateCard(sessionId, filename, cardId);
    updateCounts();
  }

  function updateCard(sessionId, filename, cardId) {
    var card = document.getElementById(cardId);
    var s = state[sessionId][filename];
    card.className = "card " + (s.status || "");
    var btns = card.querySelectorAll(".card-actions button");
    btns[0].className = "btn-keep " + (s.status === "keep" ? "active-keep" : "");
    btns[1].className = "btn-reject " + (s.status === "reject" ? "active-reject" : "");
    btns[2].className = "btn-regen " + (s.status === "regenerate" ? "active-regen" : "");
  }

  function bulkSetSession(sessionId, status) {
    var sessionState = state[sessionId];
    Object.keys(sessionState).forEach(function (filename) {
      sessionState[filename].status = status;
    });
    // Re-render to reflect changes
    render();
  }

  function updateCounts() {
    var k = 0, r = 0, g = 0, u = 0;
    Object.keys(state).forEach(function (sid) {
      var sessionState = state[sid];
      Object.keys(sessionState).forEach(function (filename) {
        var s = sessionState[filename];
        if (s.status === "keep") k++;
        else if (s.status === "reject") r++;
        else if (s.status === "regenerate") g++;
        else u++;
      });
    });
    document.getElementById("keepCount").textContent = "Keep: " + k;
    document.getElementById("rejectCount").textContent = "Reject: " + r;
    document.getElementById("regenCount").textContent = "Regen: " + g;
    document.getElementById("unsetCount").textContent = "Unset: " + u;
  }

  function buildSessionSelections(sessionId) {
    var session = null;
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === sessionId) { session = sessions[i]; break; }
    }
    if (!session) return [];

    return session.images.map(function (img) {
      var s = state[sessionId][img.filename];
      var entry = { filename: img.filename, status: s.status || "keep" };
      if (s.status === "regenerate") {
        entry.newPrompt = s.newPrompt;
        entry.numImages = s.numImages || 1;
      }
      return entry;
    });
  }

  // ── Lightbox ───────────────────────────────────────────────

  function openLightbox(src) {
    document.getElementById("lightboxImg").src = src;
    document.getElementById("lightbox").classList.add("open");
  }

  document.getElementById("lightbox").addEventListener("click", function () {
    this.classList.remove("open");
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape")
      document.getElementById("lightbox").classList.remove("open");
  });

  // ── Save All ───────────────────────────────────────────────

  function saveAll() {
    var promises = sessions.map(function (session) {
      var selections = buildSessionSelections(session.id);
      return fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.id, selections: selections }),
      }).then(function (resp) {
        return resp.json();
      });
    });
    return Promise.all(promises);
  }

  document.getElementById("saveAllBtn").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = "Saving...";

    saveAll()
      .then(function () {
        btn.textContent = "Saved!";
        setTimeout(function () {
          btn.disabled = false;
          btn.textContent = "Save All";
        }, 1500);
      })
      .catch(function (e) {
        btn.disabled = false;
        btn.textContent = "Save All";
        alert("Failed to save: " + e.message);
      });
  });

  // ── Done (Save All + shut down) ────────────────────────────

  document.getElementById("doneBtn").addEventListener("click", function () {
    var btn = this;
    var saveBtn = document.getElementById("saveAllBtn");
    btn.disabled = true;
    saveBtn.disabled = true;
    btn.textContent = "Saving...";

    saveAll()
      .then(function () {
        btn.textContent = "Closing...";
        return fetch("/api/done", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      })
      .then(function () {
        setTimeout(function () {
          document.body.textContent = "";
          var msg = document.createElement("div");
          msg.style.cssText =
            "display:flex;align-items:center;justify-content:center;" +
            "height:100vh;color:#888;font-family:sans-serif;font-size:18px";
          msg.textContent = "Review saved. You can close this tab.";
          document.body.appendChild(msg);
        }, 300);
      })
      .catch(function (e) {
        btn.disabled = false;
        saveBtn.disabled = false;
        btn.textContent = "Done";
        alert("Failed to save: " + e.message);
      });
  });

  // ── Finalize ───────────────────────────────────────────────

  function finalizeSession(sessionId) {
    if (!confirm("Finalize session " + sessionId + "?\nThis will copy kept images to the current directory.")) {
      return;
    }

    // Save first, then finalize
    var selections = buildSessionSelections(sessionId);
    fetch("/api/selections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId, selections: selections }),
    })
      .then(function () {
        return fetch("/api/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionId }),
        });
      })
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        if (data.ok) {
          alert("Finalized " + (data.copied || 0) + " image(s).");
          // Update session status in local data
          for (var i = 0; i < sessions.length; i++) {
            if (sessions[i].id === sessionId) {
              sessions[i].status = "finalized";
              break;
            }
          }
          render();
        } else {
          alert("Finalize failed: " + (data.error || "Unknown error"));
        }
      })
      .catch(function (e) {
        alert("Finalize failed: " + e.message);
      });
  }

  // ── Boot ───────────────────────────────────────────────────

  render();
})();
