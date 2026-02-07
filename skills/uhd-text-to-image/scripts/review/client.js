/**
 * UHD Review — client-side logic.
 *
 * Injected into the page by template.ts.
 * Placeholders replaced at render time:
 *   __IMAGES__     → JSON array of image metadata
 *   __SELECTIONS__ → JSON map of existing selections
 */

(function () {
  var images = __IMAGES__;
  var existingSelections = __SELECTIONS__;
  var state = {};

  // ── Init ───────────────────────────────────────────────────

  images.forEach(function (img) {
    var ex = existingSelections[img.filename];
    state[img.filename] = {
      status: ex ? ex.status : null,
      newPrompt: ex && ex.newPrompt ? ex.newPrompt : img.prompt,
      numImages: ex && ex.numImages ? ex.numImages : 1,
    };
  });

  // ── DOM helper ─────────────────────────────────────────────

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ── Render grid ────────────────────────────────────────────

  function renderGrid() {
    var grid = document.getElementById("grid");
    while (grid.firstChild) grid.removeChild(grid.firstChild);

    images.forEach(function (img, idx) {
      var s = state[img.filename];

      // Card wrapper
      var card = el("div", "card " + (s.status || ""));
      card.id = "card-" + idx;

      // Image thumbnail
      var imgWrap = el("div", "card-img");
      imgWrap.addEventListener("click", function () {
        openLightbox("/images/" + encodeURIComponent(img.filename));
      });
      var imgEl = el("img");
      imgEl.src = "/images/" + encodeURIComponent(img.filename);
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
        info.appendChild(
          el("div", "card-dims", img.width + "x" + img.height)
        );
      card.appendChild(info);

      // Action buttons
      var actions = el("div", "card-actions");
      var btnK = el(
        "button",
        "btn-keep " + (s.status === "keep" ? "active-keep" : ""),
        "Keep"
      );
      btnK.addEventListener("click", function () {
        setStatus(img.filename, "keep", idx);
      });
      var btnR = el(
        "button",
        "btn-reject " + (s.status === "reject" ? "active-reject" : ""),
        "Reject"
      );
      btnR.addEventListener("click", function () {
        setStatus(img.filename, "reject", idx);
      });
      var btnG = el(
        "button",
        "btn-regen " + (s.status === "regenerate" ? "active-regen" : ""),
        "Regen"
      );
      btnG.addEventListener("click", function () {
        toggleRegen(img.filename, idx);
      });
      actions.appendChild(btnK);
      actions.appendChild(btnR);
      actions.appendChild(btnG);
      card.appendChild(actions);

      // Regen panel
      var panel = el(
        "div",
        "regen-panel " + (s.status === "regenerate" ? "open" : "")
      );
      panel.id = "regen-" + idx;

      panel.appendChild(el("label", null, "Modified prompt:"));
      var ta = document.createElement("textarea");
      ta.value = s.newPrompt || img.prompt;
      ta.addEventListener(
        "input",
        (function (fn) {
          return function () {
            state[fn].newPrompt = this.value;
          };
        })(img.filename)
      );
      panel.appendChild(ta);

      panel.appendChild(el("label", null, "Number of images:"));
      var sel = document.createElement("select");
      for (var n = 1; n <= 4; n++) {
        var opt = el("option", null, String(n));
        opt.value = n;
        if (s.numImages === n) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener(
        "change",
        (function (fn) {
          return function () {
            state[fn].numImages = parseInt(this.value);
          };
        })(img.filename)
      );
      panel.appendChild(sel);
      card.appendChild(panel);

      grid.appendChild(card);
    });

    updateCounts();
  }

  // ── State management ───────────────────────────────────────

  function setStatus(filename, status, idx) {
    state[filename].status =
      state[filename].status === status ? null : status;
    if (state[filename].status !== "regenerate") {
      var p = document.getElementById("regen-" + idx);
      if (p) p.classList.remove("open");
    }
    updateCard(filename, idx);
    updateCounts();
  }

  function toggleRegen(filename, idx) {
    var isRegen = state[filename].status === "regenerate";
    state[filename].status = isRegen ? null : "regenerate";
    document
      .getElementById("regen-" + idx)
      .classList[isRegen ? "remove" : "add"]("open");
    updateCard(filename, idx);
    updateCounts();
  }

  function updateCard(filename, idx) {
    var card = document.getElementById("card-" + idx);
    var s = state[filename];
    card.className = "card " + (s.status || "");
    var btns = card.querySelectorAll(".card-actions button");
    btns[0].className =
      "btn-keep " + (s.status === "keep" ? "active-keep" : "");
    btns[1].className =
      "btn-reject " + (s.status === "reject" ? "active-reject" : "");
    btns[2].className =
      "btn-regen " + (s.status === "regenerate" ? "active-regen" : "");
  }

  function updateCounts() {
    var k = 0,
      r = 0,
      g = 0,
      u = 0;
    Object.keys(state).forEach(function (key) {
      var s = state[key];
      if (s.status === "keep") k++;
      else if (s.status === "reject") r++;
      else if (s.status === "regenerate") g++;
      else u++;
    });
    document.getElementById("keepCount").textContent = "Keep: " + k;
    document.getElementById("rejectCount").textContent = "Reject: " + r;
    document.getElementById("regenCount").textContent = "Regen: " + g;
    document.getElementById("unsetCount").textContent = "Unset: " + u;
  }

  function buildSelections() {
    return images.map(function (img) {
      var s = state[img.filename];
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

  // ── Save & Close ───────────────────────────────────────────

  document.getElementById("saveBtn").addEventListener("click", function () {
    var btn = this;
    btn.disabled = true;
    btn.textContent = "Saving...";

    fetch("/api/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections: buildSelections() }),
    })
      .then(function () {
        btn.textContent = "Saved! Closing...";
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
        btn.textContent = "Save & Close";
        alert("Failed to save: " + e.message);
      });
  });

  // ── Boot ───────────────────────────────────────────────────

  renderGrid();
})();
