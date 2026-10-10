/* ============================================================
   CRAYON NOVA — app.js
   Vanilla JS. No dependencies. Progressive: without JS the
   site still renders and reads correctly.
   ============================================================ */
(() => {
  "use strict";

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* the box — single source of truth, shared by roll + lab palette */
  const CRAYONS = [
    { name: "Plasma Pink",    hex: "#ff5da2", key: "1" },
    { name: "Cyber Lime",     hex: "#b4ff3d", key: "2" },
    { name: "Comet Yellow",   hex: "#ffe14d", key: "3" },
    { name: "Holo Teal",      hex: "#2de1c2", key: "4" },
    { name: "Nova Grape",     hex: "#a78bfa", key: "5" },
    { name: "Comet Blue",     hex: "#5f8cff", key: "6" },
    { name: "Solar Rust",     hex: "#ff7847", key: "7" },
    { name: "Sunset Amber",   hex: "#f2a541", key: "8" },
    { name: "Razz Signal",    hex: "#ff2e63", key: "9" },
    { name: "Bio Moss",       hex: "#57a773", key: "0" },
    { name: "Mars Clay",      hex: "#c97b5a", key: "-" },
    { name: "Asteroid Grey",  hex: "#8a93b2", key: "=" },
    { name: "Cosmic Slate",   hex: "#5a6488", key: "" },
    { name: "Nebula Ink",     hex: "#2b3260", key: "" },
    { name: "Event Horizon",  hex: "#171b2e", key: "" },
    { name: "Holo Pearl",     hex: "#e9e2ff", key: "" },
    { name: "Paper Cream",    hex: "#efe6cf", key: "" },
    { name: "Static White",   hex: "#f2f4ff", key: "" },
  ];
  const LS_ACCENT = "crayon-nova:accent";
  const LS_SHEET  = "crayon-nova:sheet";
  const HEX_RE = /^#[0-9a-f]{6}$/i;

  /* ---------- toast ---------- */
  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
  }

  /* ---------- site-wide accent ---------- */
  // Some crayons are nearly black (Event Horizon). As a background for dark
  // button text they'd fail contrast, so lift anything too dark before use.
  function channelLum(hex) {
    const ch = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  }
  function lift(hex, f) {
    const mix = i => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - f) + 255 * f);
    return "#" + [mix(1), mix(3), mix(5)].map(v => v.toString(16).padStart(2, "0")).join("");
  }
  function usableAccent(hex) {
    let out = hex;
    let guard = 0;
    while (channelLum(out) < 0.24 && guard++ < 8) out = lift(out, 0.18);
    return out;
  }
  function currentAccent() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    return HEX_RE.test(v) ? v.toLowerCase() : "#ff5da2";
  }

  function applyAccent(hex, persist) {
    if (!HEX_RE.test(hex)) return;
    hex = hex.toLowerCase();
    const applied = usableAccent(hex);
    document.documentElement.style.setProperty("--accent", applied);
    if (persist) {
      try { localStorage.setItem(LS_ACCENT, hex); } catch (e) { /* private mode */ }
    }
    syncRollPanel(hex);
    document.dispatchEvent(new CustomEvent("accent-change", { detail: { hex: applied } }));
  }

  function syncRollPanel(hex) {
    const name = $("#roll-name"), hexEl = $("#roll-hex"), applied = $("#roll-applied"), chip = $("#roll-chip");
    const crayon = CRAYONS.find(c => c.hex === hex);
    if (name) name.textContent = crayon ? crayon.name : "Custom Shade";
    if (hexEl) hexEl.textContent = hex.toUpperCase();
    if (chip) chip.style.setProperty("--c", usableAccent(hex));
    if (applied) applied.textContent = crayon ? crayon.name + " is driving the site" : "";
  }

  function initAccent() {
    let saved = null;
    try { saved = localStorage.getItem(LS_ACCENT); } catch (e) { /* noop */ }
    if (saved && HEX_RE.test(saved)) applyAccent(saved, false);
  }

  /* ---------- clipboard ---------- */
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function initCopyButtons() {
    $$(".copy").forEach(btn => {
      btn.addEventListener("click", () => {
        const hex = (btn.dataset.hex || "");
        if (!hex) return;
        copyText(hex).then(ok => {
          if (!ok) { toast("Copy failed — hex is " + hex.toUpperCase()); return; }
          toast("Copied " + hex.toUpperCase());
          btn.classList.add("done");
          btn.textContent = "Copied";
          setTimeout(() => { btn.classList.remove("done"); btn.textContent = "Copy hex"; }, 1500);
        });
      });
    });
  }

  /* ---------- mobile nav ---------- */
  function initNav() {
    const toggle = $(".nav-toggle");
    if (!toggle) return;
    const close = () => {
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    document.addEventListener("click", e => {
      if (!document.body.classList.contains("nav-open")) return;
      if (!e.target.closest(".nav-inner")) close();
    });
    $$("#nav-links a").forEach(a => a.addEventListener("click", close));
  }

  /* ---------- scroll reveal ---------- */
  function initReveal() {
    const items = $$(".reveal");
    if (!items.length) return;
    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(el => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(el => io.observe(el));
  }

  /* ---------- roll a crayon ---------- */
  function initRoll() {
    const btn = $("#roll-btn"), reset = $("#roll-reset");
    if (!btn) return;
    let lastPick = null;
    btn.addEventListener("click", () => {
      let next;
      do { next = CRAYONS[Math.floor(Math.random() * CRAYONS.length)]; }
      while (CRAYONS.length > 1 && next.hex === lastPick);
      lastPick = next.hex;
      applyAccent(next.hex, true);
      toast(next.name + " — applied site-wide");
      const applied = $("#roll-applied");
      if (applied) applied.textContent = "Saved. Reload — it stays.";
    });
    if (reset) reset.addEventListener("click", () => {
      try { localStorage.removeItem(LS_ACCENT); } catch (e) { /* noop */ }
      lastPick = "#ff5da2";
      applyAccent("#ff5da2", false);
      toast("Reset to Plasma Pink");
    });
  }

  /* ---------- colors page: filter + shuffle ---------- */
  function initFilters() {
    const chips = $$(".chip[data-filter]");
    const cards = $$("#palette .swatch");
    const count = $("#count");
    if (!chips.length || !cards.length) return;

    const apply = filter => {
      let shown = 0;
      cards.forEach(card => {
        const match = filter === "all" || card.dataset.family === filter;
        card.hidden = !match;
        if (match) shown++;
      });
      if (count) count.textContent = "Showing " + shown + " of " + cards.length;
    };

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => {
          const active = c === chip;
          c.classList.toggle("is-active", active);
          c.setAttribute("aria-pressed", String(active));
        });
        apply(chip.dataset.filter);
      });
    });

    const shuffle = $("#shuffle-btn");
    if (shuffle) shuffle.addEventListener("click", () => {
      const grid = $("#palette");
      cards.slice().sort(() => Math.random() - 0.5).forEach(card => grid.appendChild(card));
      toast("Box shuffled");
    });
  }

  /* ---------- doodle club form ---------- */
  function initClubForm() {
    const form = $("#club-form"), note = $("#form-note"), input = $("#club-email");
    if (!form) return;
    form.addEventListener("submit", e => {
      e.preventDefault();
      const value = (input.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        note.style.color = "var(--c-rust)";
        note.textContent = "That address won't survive re-entry. Try a real one.";
        input.focus();
        return;
      }
      note.style.color = "var(--c-teal)";
      note.textContent = "Nice try — this demo has no backend. Go draw something in the Sketch Lab instead.";
      form.reset();
    });
  }

  /* ---------- footer year ---------- */
  function initYear() {
    const y = new Date().getFullYear();
    $$(".yr").forEach(el => { el.textContent = String(y); });
  }

  /* ============================================================
     CRAYON ENGINE — shared by the hero pad and the full lab.
     One implementation, two personalities.
     ============================================================ */
  function createEngine(canvas, opts) {
    const o = Object.assign({
      color: "#ff5da2",
      size: 8,
      tool: "crayon",
      persist: false,       // autosave sheet to localStorage
      storageKey: null,
      cursorRing: false,    // live nib indicator
      paper: "#f7f3e8",
      text: "",             // stamp text state
      textSize: 32,
      textTilt: -3,
      sticker: "star",
    }, opts || {});

    const ctx = canvas.getContext("2d");
    const PAPER = o.paper;
    const UNDO_MAX = 24;
    const REDO_MAX = 24;

    let drawing = false;
    let last = null;
    let color = o.color;
    let size = o.size;
    let tool = o.tool;
    let undoStack = [];
    let redoStack = [];
    let queue = [];
    let rafId = null;
    let saveTimer = null;
    let ring = null;
    let primed = false;   // has this canvas ever been painted?

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    /* ---- paper & grain ---- */
    function paintPaper() {
      const w = canvas.width / dpr();
      const h = canvas.height / dpr();
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, w + 2, h + 2);
      for (let i = 0; i < 2600; i++) {          // dark flecks
        ctx.fillStyle = "rgba(43,50,96," + (Math.random() * 0.05).toFixed(3) + ")";
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.3, 1.3);
      }
      for (let i = 0; i < 1200; i++) {          // light specks
        ctx.fillStyle = "rgba(255,255,255," + (Math.random() * 0.4).toFixed(3) + ")";
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
    }

    /* ---- history ---- */
    function snapshot() {
      try { return ctx.getImageData(0, 0, canvas.width, canvas.height); }
      catch (e) { return null; }
    }
    function blit(img) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.putImageData(img, 0, 0);
      ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    }
    function pushUndo() {
      const s = snapshot();
      if (!s) return;
      undoStack.push(s);
      if (undoStack.length > UNDO_MAX) undoStack.shift();
      redoStack.length = 0;
    }
    function undo() {
      const s = undoStack.pop();
      if (!s) return false;
      const cur = snapshot();
      if (cur) { redoStack.push(cur); if (redoStack.length > REDO_MAX) redoStack.shift(); }
      blit(s);
      scheduleSave();
      return true;
    }
    function redo() {
      const s = redoStack.pop();
      if (!s) return false;
      const cur = snapshot();
      if (cur) { undoStack.push(cur); if (undoStack.length > UNDO_MAX) undoStack.shift(); }
      blit(s);
      scheduleSave();
      return true;
    }

    /* ---- persistence ---- */
    function scheduleSave() {
      if (!o.persist) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(saveSheet, 600);
    }
    function saveSheet() {
      if (!o.persist || !o.storageKey) return;
      try {
        localStorage.setItem(o.storageKey, canvas.toDataURL("image/jpeg", 0.85));
      } catch (e) { /* quota or private mode — drawing just won't persist */ }
    }
    function restoreSheet() {
      if (!o.persist || !o.storageKey) return;
      let data = null;
      try { data = localStorage.getItem(o.storageKey); } catch (e) { /* noop */ }
      if (!data || data.length > 1.8e6) return;
      const img = new Image();
      img.onload = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
        undoStack.length = 0;
        redoStack.length = 0;
      };
      img.src = data;
    }

    /* ---- sizing: preserve artwork across resizes (fonts, rotate) ---- */
    function sizeCanvas(force) {
      const r = canvas.getBoundingClientRect();
      if (r.width < 2) return;                    // hidden: don't collapse to 1px
      const d = dpr();
      const w = Math.round(r.width * d);
      const h = Math.round(r.height * d);
      // Same geometry (font swap, reflow): keep ink AND history untouched.
      if (!force && canvas.width === w && canvas.height === h) return;
      // NB: a canvas that was never painted defaults to 300x150 transparent.
      // That is NOT artwork — preserving it would stamp a hole in fresh paper.
      const old = primed ? snapshot() : null;
      canvas.width = w;
      canvas.height = h;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      paintPaper();
      if (old) blit(old);                        // keep the drawing, clip if shrunk
      primed = true;
      undoStack.length = 0;                      // geometry changed: history invalid
      redoStack.length = 0;
    }

    /* ---- wax physics ---- */
    function pressureOf(e) {
      if (e.pointerType === "pen" && e.pressure > 0) return e.pressure;
      return 0.5;                                // mouse/touch: neutral
    }
    function crayonSegment(a, b, pressure) {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist < 0.5) return;
      const speed = Math.min(dist / 42, 1);      // fast = thin, like real wax
      const w = Math.max(1.1, size * (0.45 + pressure * 0.9) * (1 - speed * 0.4));
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let pass = 0; pass < 4; pass++) {     // jittered passes = crayon tooth
        ctx.strokeStyle = color;
        ctx.lineWidth = w * (0.55 + Math.random() * 0.65);
        ctx.globalAlpha = 0.5 + Math.random() * 0.35;
        ctx.beginPath();
        ctx.moveTo(a.x + (Math.random() - 0.5) * w, a.y + (Math.random() - 0.5) * w);
        const segs = Math.max(2, Math.ceil(dist / 6));
        for (let i = 1; i <= segs; i++) {
          const t = i / segs;
          ctx.lineTo(
            a.x + (b.x - a.x) * t + (Math.random() - 0.5) * w * 0.8,
            a.y + (b.y - a.y) * t + (Math.random() - 0.5) * w * 0.8
          );
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;                     // wax speckle
      const flecks = Math.ceil(dist / 2);
      for (let i = 0; i < flecks; i++) {
        const t = Math.random();
        ctx.fillStyle = Math.random() < 0.85 ? color : "rgba(60,52,40,0.6)";
        ctx.fillRect(
          a.x + (b.x - a.x) * t + (Math.random() - 0.5) * w * 1.7,
          a.y + (b.y - a.y) * t + (Math.random() - 0.5) * w * 1.7,
          1, 1
        );
      }
      ctx.globalAlpha = 1;
    }
    function markerSegment(a, b, pressure) {
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = color;
      ctx.lineWidth = size * 2.6 * (0.6 + pressure * 0.8);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function eraseSegment(a, b) {
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = size * 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    function strokeSeg(a, b, pressure) {
      if (tool === "marker") markerSegment(a, b, pressure);
      else if (tool === "eraser") eraseSegment(a, b);
      else crayonSegment(a, b, pressure);
    }

    /* ---- stamps: text & stickers ---- */
    const STICKERS = {
      star: "M32 6 L39 24 L58 26 L44 38 L48 57 L32 46 L16 57 L20 38 L6 26 L25 24 Z",
      heart: "M32 54 C 10 38, 8 22, 20 14 C 28 9, 32 16, 32 20 C 32 16, 36 9, 44 14 C 56 22, 54 38, 32 54 Z",
      arrow: "M8 54 C 26 52, 42 38, 50 10|M36 10 L52 10 L52 26",
      bolt: "M36 4 L14 36 L30 36 L26 60 L50 26 L34 26 Z",
      moon: "M40 6 A 26 26 0 1 0 40 58 A 22 22 0 1 1 40 6 Z",
      spiral: "M32 32 C 32 27, 41 27, 41 34 C 41 43, 25 43, 25 32 C 25 19, 45 17, 47 34 C 49 51, 23 57, 15 41",
    };
    const stickerCache = new Map();
    function stickerImage(shape, hex) {
      const key = shape + "|" + hex;
      if (stickerCache.has(key)) return stickerCache.get(key);
      const img = new Image();
      const paths = (STICKERS[shape] || STICKERS.star).split("|")
        .map(d => '<path d="' + d + '"/>').join("");
      img.src = "data:image/svg+xml," + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="' + hex +
        '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>"
      );
      stickerCache.set(key, img);
      return img;
    }

    /* multi-pass jittered fillText — the crayon tooth, applied to type */
    function stampText(p) {
      const str = (o.text || "").trim();
      if (!str) { toast("Type something in the text box first"); return; }
      pushUndo();
      const px = o.textSize;
      const rad = (o.textTilt * Math.PI) / 180;
      const font = px + "px Caveat, cursive";
      const paint = () => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rad);
        ctx.font = font;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (let pass = 0; pass < 5; pass++) {
          ctx.globalAlpha = 0.45 + Math.random() * 0.35;
          ctx.fillStyle = pass % 2 && Math.random() < 0.2 ? "rgba(60,52,40,0.55)" : color;
          ctx.fillText(str, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4);
        }
        ctx.restore();
        scheduleSave();
      };
      // make sure the handwriting font is actually there before stamping
      if (document.fonts && document.fonts.load) {
        document.fonts.load(font, str).then(paint).catch(paint);
      } else {
        paint();
      }
    }

    function stampSticker(p) {
      const shape = o.sticker || "star";
      pushUndo();
      const img = stickerImage(shape, color);
      const box = Math.max(48, size * 9);
      const rot = (Math.random() - 0.5) * 0.28; // ±8° — hand-placed feel
      const paint = () => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.9;
        ctx.drawImage(img, -box / 2, -box / 2, box, box);
        ctx.restore();
        scheduleSave();
      };
      if (img.complete && img.naturalWidth) paint();
      else { img.onload = paint; img.onerror = () => toast("Sticker failed to render"); }
    }

    /* ---- input: pointer events + rAF coalescing ---- */
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function flush() {
      rafId = null;
      let pressure = 0.5;
      while (queue.length) {
        const item = queue.shift();
        pressure = item.p;
        strokeSeg(last, item.pt, pressure);
        last = item.pt;
      }
      updateRing(last);
    }
    function updateRing(p) {
      if (!ring || !p) return;
      ring.style.transform = "translate(" + (p.x - size) + "px," + (p.y - size) + "px)";
    }

    canvas.addEventListener("pointerdown", e => {
      e.preventDefault();
      const p = pos(e);
      if (tool === "text") { stampText(p); return; }
      if (tool === "sticker") { stampSticker(p); return; }
      pushUndo();
      drawing = true;
      queue.length = 0;
      last = p;
      strokeSeg({ x: p.x + 0.01, y: p.y + 0.01 }, p, pressureOf(e)); // tap = dot
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      if (ring) { ring.style.opacity = "1"; updateRing(p); }
      scheduleSave();
    });
    canvas.addEventListener("pointermove", e => {
      if (!drawing) {
        if (ring && e.pointerType !== "touch") { ring.style.opacity = "1"; updateRing(pos(e)); }
        return;
      }
      e.preventDefault();
      let points = [];
      if (typeof e.getCoalescedEvents === "function") {
        try { points = Array.from(e.getCoalescedEvents()); } catch (err) { points = [e]; }
      }
      if (!points.length) points = [e];
      const p = pressureOf(e);
      for (const ev of points) queue.push({ pt: pos(ev), p });
      if (!rafId) rafId = requestAnimationFrame(flush);
    });
    const stop = () => { drawing = false; if (ring && !reduced) ring.style.opacity = "0"; };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    canvas.addEventListener("pointerleave", () => { if (ring) ring.style.opacity = "0"; });

    /* ---- cursor ring ---- */
    function buildRing() {
      if (!o.cursorRing) return null;
      const host = canvas.parentElement;
      if (!host) return null;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      const el = document.createElement("div");
      el.className = "cursor-ring";
      el.setAttribute("aria-hidden", "true");
      host.appendChild(el);
      return el;
    }
    function styleRing() {
      if (!ring) return;
      ring.style.width = ring.style.height = Math.max(14, size * 2) + "px";
      ring.style.background = tool === "eraser" ? "rgba(247,243,232,.25)" : hexToRgba(color, 0.35);
      ring.style.borderColor = tool === "eraser" ? "rgba(247,243,232,.9)" : color;
    }
    function hexToRgba(hex, a) {
      const n = parseInt(hex.slice(1), 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }

    /* ---- lifecycle ---- */
    let resizeRaf = null;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(sizeCanvas);
    };
    if ("ResizeObserver" in window) new ResizeObserver(onResize).observe(canvas);
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
    window.addEventListener("pagehide", saveSheet);

    ring = buildRing();
    sizeCanvas(true);
    restoreSheet();
    styleRing();

    /* ---- public controls ---- */
    return {
      setColor(hex) { if (HEX_RE.test(hex)) { color = hex.toLowerCase(); styleRing(); } },
      setSize(px) { size = px; styleRing(); },
      setTool(t) { tool = t; styleRing(); },
      setText(str) { o.text = String(str || "").slice(0, 60); },
      setTextSize(px) { o.textSize = Math.max(8, Math.min(160, px | 0)); },
      setTextTilt(deg) { o.textTilt = Math.max(-45, Math.min(45, deg | 0)); },
      setSticker(shape) { if (STICKERS[shape]) o.sticker = shape; },
      undo, redo,
      clear() {
        pushUndo();
        paintPaper();
        try { if (o.storageKey) localStorage.removeItem(o.storageKey); } catch (e) { /* noop */ }
      },
      exportPNG() { return canvas.toDataURL("image/png"); },
      hasHistory() { return undoStack.length > 0; },
    };
  }

  /* ============================================================
     HERO PAD — the "try it right now" doodle in the hero
     ============================================================ */
  function initHeroPad() {
    const canvas = $("#hero-pad");
    if (!canvas) return;
    const engine = createEngine(canvas, {
      color: currentAccent(),
      size: 7,
      tool: "crayon",
      cursorRing: true,
    });
    // hero pad draws in the site accent — follow accent changes
    document.addEventListener("accent-change", e => engine.setColor(e.detail.hex));
    const clearBtn = $("#hero-clear");
    if (clearBtn) clearBtn.addEventListener("click", () => { engine.clear(); });
  }

  /* ============================================================
     SKETCH LAB — full engine + toolbar
     ============================================================ */
  function initLab() {
    const canvas = $("#lab");
    if (!canvas) return;
    const engine = createEngine(canvas, {
      color: "#ff5da2",
      size: 8,
      tool: "crayon",
      persist: true,
      storageKey: LS_SHEET,
      cursorRing: true,
    });

    /* tools + conditional stamp panels */
    const textPanel = $("#text-panel"), stickerPanel = $("#sticker-panel");
    function selectTool(btn) {
      engine.setTool(btn.dataset.tool);
      $$("[data-tool]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
      const t = btn.dataset.tool;
      if (textPanel) textPanel.hidden = t !== "text";
      if (stickerPanel) stickerPanel.hidden = t !== "sticker";
    }
    $$("[data-tool]").forEach(btn => btn.addEventListener("click", () => selectTool(btn)));

    /* nib sizes */
    $$("[data-size]").forEach(btn => btn.addEventListener("click", () => {
      engine.setSize(parseInt(btn.dataset.size, 10) || 8);
      $$("[data-size]").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
    }));

    /* palette */
    function pickColor(dot) {
      engine.setColor(dot.dataset.color);
      $$(".dot").forEach(d => d.setAttribute("aria-pressed", String(d === dot)));
    }
    $$(".dot").forEach(dot => dot.addEventListener("click", () => pickColor(dot)));

    /* text stamps */
    const textInput = $("#text-input"), textSize = $("#text-size"), textTilt = $("#text-tilt");
    const textSizeOut = $("#text-size-out"), textTiltOut = $("#text-tilt-out");
    if (textInput) textInput.addEventListener("input", () => engine.setText(textInput.value));
    if (textSize) textSize.addEventListener("input", () => {
      engine.setTextSize(parseInt(textSize.value, 10) || 32);
      if (textSizeOut) textSizeOut.textContent = textSize.value;
    });
    if (textTilt) textTilt.addEventListener("input", () => {
      engine.setTextTilt(parseInt(textTilt.value, 10) || 0);
      if (textTiltOut) textTiltOut.textContent = textTilt.value;
    });

    /* sticker stamps */
    function pickSticker(btn) {
      engine.setSticker(btn.dataset.sticker);
      $$(".sticker-btn").forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
    }
    $$(".sticker-btn").forEach(btn => btn.addEventListener("click", () => pickSticker(btn)));

    /* actions */
    const undoBtn = $("#undo"), redoBtn = $("#redo"), clearBtn = $("#clear"), dl = $("#download"), focusBtn = $("#focus-btn");
    if (undoBtn) undoBtn.addEventListener("click", () => { if (!engine.undo()) toast("Nothing to undo"); });
    if (redoBtn) redoBtn.addEventListener("click", () => { if (!engine.redo()) toast("Nothing to redo"); });

    let clearArmed = false, clearTimer = null;
    if (clearBtn) {
      const disarm = () => { clearArmed = false; clearBtn.textContent = "Clear"; clearTimeout(clearTimer); };
      clearBtn.addEventListener("click", () => {
        if (!clearArmed) {
          clearArmed = true;
          clearBtn.textContent = "Really wipe it?";
          clearTimer = setTimeout(disarm, 2500);
          return;
        }
        engine.clear();
        disarm();
        toast("Fresh sheet");
      });
    }

    if (dl) dl.addEventListener("click", () => {
      try {
        const a = document.createElement("a");
        a.download = "crayon-nova-" + Date.now() + ".png";
        a.href = engine.exportPNG();
        a.click();
        toast("PNG exported");
      } catch (err) {
        toast("Export failed — " + err.message);
      }
    });

    /* focus mode */
    if (focusBtn) {
      const setFocus = on => {
        document.body.classList.toggle("lab-focus", on);
        focusBtn.setAttribute("aria-pressed", String(on));
        focusBtn.textContent = on ? "Exit focus" : "Focus mode";
        onResizeCanvas();
      };
      const onResizeCanvas = () => window.dispatchEvent(new Event("resize"));
      focusBtn.addEventListener("click", () => setFocus(!document.body.classList.contains("lab-focus")));
      document.addEventListener("keydown", e => {
        if (e.key === "Escape" && document.body.classList.contains("lab-focus")) setFocus(false);
      });
    }

    /* keyboard: 1-0/-/= pick crayons, c/m/e tools, ctrl+z / ctrl+shift+z history */
    document.addEventListener("keydown", e => {
      const t = e.target;
      if (t instanceof Element && t.closest("input, textarea, select")) return;

      const dot = $$(".dot").find(d => d.dataset.key && d.dataset.key === e.key);
      if (dot) { pickColor(dot); return; }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) { if (!engine.redo()) toast("Nothing to redo"); }
        else { if (!engine.undo()) toast("Nothing to undo"); }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "e" || k === "c" || k === "m" || k === "t" || k === "s") {
        const map = { e: "eraser", c: "crayon", m: "marker", t: "text", s: "sticker" };
        const target = $$("[data-tool]").find(b => b.dataset.tool === map[k]);
        if (target) target.click();
      }
    });
  }

  /* ---------- boot ---------- */
  function init() {
    initAccent();
    initNav();
    initReveal();
    initCopyButtons();
    initRoll();
    initFilters();
    initClubForm();
    initHeroPad();
    initLab();
    initYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
