/* ===== TicketQuest — fake desktop OS: window manager + taskbar ===== */
/* Reálne okná: minimize / maximize / close, focus, taskbar s aplikáciami. */

const os = (() => {
  const wins = {};          // appId -> { el, body, minimized, maximized, rect }
  let zTop = 20;
  let focused = null;
  let host = null;

  const DEFAULT_RECT = {
    mail:      { left: 50,  top: 40,  width: 700, height: 470 },
    helpdesk:  { left: 110, top: 55,  width: 780, height: 520 },
    terminal:  { left: 160, top: 90,  width: 680, height: 440 },
    explorer:  { left: 200, top: 60,  width: 640, height: 440 },
    settings:  { left: 250, top: 70,  width: 620, height: 450 },
    library:   { left: 220, top: 50,  width: 660, height: 480 },
    taskmgr:   { left: 300, top: 80,  width: 560, height: 420 },
    notepad:   { left: 260, top: 90,  width: 540, height: 400 },
  };

  function setRect(el, rect) {
    el.style.left = rect.left + "px";
    el.style.top = rect.top + "px";
    el.style.width = rect.width + "px";
    el.style.height = rect.height + "px";
  }

  function makeWindow(id) {
    const app = APPS[id];
    const rect = DEFAULT_RECT[id] || { left: 140, top: 80, width: 560, height: 420 };
    const el = document.createElement("div");
    el.className = "appwin";
    el.dataset.app = id;
    setRect(el, rect);
    el.innerHTML = `
      <div class="appwin-titlebar">
        <span class="appwin-ico">${app.icon}</span>
        <span class="appwin-title">${app.title}</span>
        <div class="appwin-btns">
          <button class="appwin-btn" data-act="min" title="Minimize">─</button>
          <button class="appwin-btn" data-act="max" title="Maximize">▢</button>
          <button class="appwin-btn close" data-act="close" title="Close">✕</button>
        </div>
      </div>
      <div class="appwin-body"></div>`;
    host.appendChild(el);

    const body = el.querySelector(".appwin-body");
    app.mount(body);

    el.addEventListener("mousedown", () => focusApp(id));
    el.querySelector(".appwin-btns").addEventListener("click", (e) => {
      const b = e.target.closest(".appwin-btn");
      if (!b) return;
      SFX.click();
      if (b.dataset.act === "min") minimizeApp(id);
      if (b.dataset.act === "max") toggleMaxApp(id);
      if (b.dataset.act === "close") closeApp(id);
    });
    // dvojklik na titulok = maximize/minimize toggle (ako v Windows)
    el.querySelector(".appwin-titlebar").addEventListener("dblclick", (e) => {
      if (e.target.closest(".appwin-btn")) return;
      toggleMaxApp(id);
    });
    enableDrag(el, el.querySelector(".appwin-titlebar"));
    return { el, body, minimized: false, maximized: false, rect };
  }

  function enableDrag(el, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false, snapZone = null;
    let preview = null;
    const ensurePreview = () => {
      if (preview) return;
      preview = document.createElement("div");
      preview.id = "snap-preview";
      host.appendChild(preview);
    };
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".appwin-btn")) return;
      const w = wins[el.dataset.app];
      if (w?.maximized) return;
      // ťahanie od-snapnutého okna ho obnoví na pôvodnú veľkosť (ako Windows)
      if (w?.snapped) {
        setRect(el, w.rect);
        el.classList.remove("snapped");
        w.snapped = null;
        ox = w.rect.left; oy = w.rect.top;
      } else {
        ox = el.offsetLeft; oy = el.offsetTop;
      }
      dragging = true; snapZone = null;
      sx = e.clientX; sy = e.clientY;
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const r = host.getBoundingClientRect();
      el.style.left = Math.max(-40, Math.min(ox + e.clientX - sx, r.width - 80)) + "px";
      el.style.top = Math.max(0, Math.min(oy + e.clientY - sy, r.height - 40)) + "px";
      // snap zóny pri okrajoch (polovica obrazovky)
      const prev = snapZone;
      if (e.clientX - r.left < 14) snapZone = "left";
      else if (r.right - e.clientX < 14) snapZone = "right";
      else snapZone = null;
      if (snapZone) {
        ensurePreview();
        preview.style[snapZone === "left" ? "left" : "right"] = "0";
        preview.style[snapZone === "left" ? "right" : "left"] = "auto";
        preview.classList.remove("hidden");
      } else if (preview) preview.classList.add("hidden");
      if (prev !== snapZone) SFX.click();
    });
    window.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      if (preview) preview.classList.add("hidden");
      if (snapZone) snapApp(el.dataset.app, snapZone);
      snapZone = null;
    });
  }

  /* snap okna na ľavú/pravú polovicu (Windows Snap) */
  function snapApp(id, zone) {
    const w = wins[id];
    if (!w) return;
    if (!w.snapped) {
      w.rect = { left: w.el.offsetLeft, top: w.el.offsetTop, width: w.el.offsetWidth, height: w.el.offsetHeight };
    }
    w.snapped = zone;
    w.maximized = false;
    w.el.classList.remove("maximized");
    w.el.classList.add("snapped");
    w.el.style.top = "0px";
    w.el.style.height = "100%";
    w.el.style[zone === "left" ? "left" : "right"] = "0px";
    w.el.style[zone === "left" ? "right" : "left"] = "auto";
    w.el.style.width = "50%";
    updateTaskbar();
  }

  /* Show desktop — minimalizovať všetko / obnoviť predchádzajúci stav */
  function showDesktop() {
    const visible = Object.keys(wins).filter((id) => !wins[id].minimized);
    if (visible.length > 0) {
      notifRestore = visible;
      visible.forEach((id) => minimizeApp(id));
      SFX.click();
    } else if (notifRestore && notifRestore.length) {
      const ids = notifRestore;
      notifRestore = null;
      ids.filter((id) => wins[id]).forEach((id) => focusApp(id));
      SFX.click();
    }
  }

  function focusApp(id) {
    if (!wins[id]) return;
    focused = id;
    zTop++;
    wins[id].el.style.zIndex = zTop;
    wins[id].el.classList.remove("minimized");
    wins[id].minimized = false;
    Object.keys(wins).forEach((k) => { if (k !== id) wins[k].el.classList.remove("focused"); });
    wins[id].el.classList.add("focused");
    updateTaskbar();
  }

  function openApp(id) {
    const app = APPS[id];
    if (!app) return;
    if (app.overlay) { app.open(); return; }
    if (!host) host = document.getElementById("windows");
    if (wins[id] && wins[id].closed) {
      // znovuotvorenie zavreteho okna — obsah (zdielane DOM prvky) sa zachoval
      wins[id].closed = false;
      wins[id].el.style.display = "";
      focusApp(id);
      SFX.click();
      if (app.onOpen) app.onOpen();
      updateTaskbar();
      return;
    }
    if (!wins[id]) wins[id] = makeWindow(id);
    focusApp(id);
    SFX.click();
    if (app.onOpen) app.onOpen();
    updateTaskbar();
  }

  function minimizeApp(id) {
    if (!wins[id]) return;
    wins[id].minimized = true;
    wins[id].el.classList.add("minimized");
    if (focused === id) focused = null;
    updateTaskbar();
  }

  function toggleMaxApp(id) {
    if (!wins[id]) return;
    const w = wins[id];
    if (w.maximized || w.snapped) {
      // obnova pôvodnej veľkosti z maxu aj zo snapu
      w.maximized = false;
      w.snapped = null;
      w.el.classList.remove("maximized", "snapped");
      w.el.style.right = "";
      setRect(w.el, w.rect);
    } else {
      w.rect = {
        left: w.el.offsetLeft, top: w.el.offsetTop,
        width: w.el.offsetWidth, height: w.el.offsetHeight,
      };
      w.maximized = true;
      w.el.classList.add("maximized");
    }
    updateTaskbar();
  }

  function closeApp(id) {
    if (!wins[id]) return;
    // zaparkuj okno — app mount používa zdieľané DOM prvky (#mail-list, …),
    // takže reálne odstránenie by znefunkčnilo ďalšie otvorenie
    wins[id].closed = true;
    wins[id].el.style.display = "none";
    wins[id].el.classList.remove("focused");
    if (focused === id) focused = null;
    updateTaskbar();
    SFX.click();
  }

  function isOpen(id) {
    return !!wins[id];
  }

  function setTitle(id, text) {
    if (!wins[id]) return;
    const t = wins[id].el.querySelector(".appwin-title");
    if (t) t.textContent = text;
  }

  /* taskbar: tlačidlá otvorených okien */
  function updateTaskbar() {
    const box = document.getElementById("tb-windows");
    if (!box) return;
    box.innerHTML = "";
    for (const id of Object.keys(wins)) {
      const app = APPS[id];
      if (!app || wins[id].closed) continue;
      const b = document.createElement("button");
      b.className = "tb-win" +
        (focused === id && !wins[id].minimized ? " active" : "") +
        (wins[id].minimized ? " mini" : "");
      b.title = app.title;
      b.dataset.tip = app.title;
      b.innerHTML = `<span class="tb-win-ico">${app.icon}</span><span class="tb-win-label">${app.label}</span>`;
      b.onclick = () => {
        if (wins[id].minimized) focusApp(id);
        else if (focused === id) minimizeApp(id);
        else focusApp(id);
        SFX.click();
      };
      box.appendChild(b);
    }
  }

  /* ---------- start menu (Windows 11 style) ---------- */
  function toggleStartMenu() {
    let menu = document.getElementById("start-menu");
    if (menu) { menu.remove(); SFX.click(); return; }
    menu = document.createElement("div");
    menu.id = "start-menu";
    const rank = rankTitle();
    const pinned = Object.keys(APPS).map((id) =>
      `<button class="sm-app" data-app="${id}">
         <span class="sm-app-ico">${APPS[id].icon}</span><span>${APPS[id].label}</span>
       </button>`).join("");
    menu.innerHTML =
      `<div class="sm-search">🔍 <span>Search apps, tickets, files…</span></div>
       <div class="sm-section">Pinned</div>
       <div class="sm-pinned">${pinned}</div>
       <div class="sm-foot">
         <button class="sm-user">
           <span class="sm-avatar">${(state.player.name || "?").charAt(0).toUpperCase()}</span>
           <span><div class="sm-name">${escHtml(state.player.name) || "Intern"}</div>
           <div class="sm-rank">${rank} @ PIXL Corp</div></span>
         </button>
         <button class="sm-leave" id="sm-leave">🚶 Leave desk</button>
       </div>`;
    host.appendChild(menu);
    menu.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      menu.remove();
      if (b.id === "sm-leave") leave();
      else openApp(b.dataset.app);
    });
    SFX.click();
  }

  /* ---------- clock (fake shift time) ---------- */
  function tickClock() {
    const el = document.getElementById("tb-clock");
    if (!el || !state.stats.startedAt) return;
    const mins = Math.floor((Date.now() - state.stats.startedAt) / 60000);
    let h = 9 + Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h >= 12 && h < 24 ? "PM" : "AM";
    const h12 = ((h - 1) % 12) + 1;
    const now = new Date();
    const date = `${now.getDate()}. ${now.getMonth() + 1}. ${now.getFullYear()}`;
    el.innerHTML = `${h12}:${String(m).padStart(2, "0")} ${ampm}<br>${date}`;
  }

  /* ---------- boot / leave ---------- */
  function boot() {
    SFX.click();
    document.getElementById("office-view").classList.add("hidden");
    document.getElementById("desktop-view").classList.remove("hidden");
    if (!host) host = document.getElementById("windows");
    tickClock();

    if (!termEl.querySelector(".t-input-row")) {
      banner();
      newInputRow();
    }
    if (!state.deskSeen) {
      state.deskSeen = true;
      saveGame();
      openApp("helpdesk");
      setTimeout(() => tutorial.show(), 500);
    } else {
      openApp("mail");
    }
  }

  function leave() {
    SFX.click();
    document.getElementById("desktop-view").classList.add("hidden");
    document.getElementById("office-view").classList.remove("hidden");
    const menu = document.getElementById("start-menu");
    if (menu) menu.remove();
    office.draw();
  }

  /* ---------- wiring ---------- */
  function init() {
    document.getElementById("tb-clock").textContent = "9:00 AM";
    document.querySelectorAll("#taskbar .tb-btn[data-app]").forEach((b) => {
      b.addEventListener("click", () => {
        if (b.dataset.app === "start") toggleStartMenu();
        else openApp(b.dataset.app);
      });
    });
    document.querySelectorAll("#desktop-icons .dicon").forEach((d) => {
      d.setAttribute("role", "button");
      d.setAttribute("tabindex", "0");
      d.setAttribute("aria-label", `Open ${APPS[d.dataset.app]?.label || d.dataset.app}`);
      d.addEventListener("dblclick", () => openApp(d.dataset.app));
      d.addEventListener("click", () => openApp(d.dataset.app));
      d.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openApp(d.dataset.app); }
      });
    });
    document.getElementById("btn-leave").addEventListener("click", leave);
    const sitBtn = document.getElementById("btn-sitdown");
    if (sitBtn) sitBtn.addEventListener("click", () => { SFX.click(); boot(); });
    document.getElementById("tb-tickets").addEventListener("click", () => openApp("helpdesk"));
    // klik na plochu zavrie start menu (ako v reálnom OS)
    document.getElementById("desktop-view").addEventListener("mousedown", (e) => {
      if (e.target.closest(".dicon") || e.target.closest("#taskbar") || e.target.closest(".appwin")) return;
      const menu = document.getElementById("start-menu");
      if (menu) menu.remove();
    });
    setInterval(tickClock, 30000);
  }

  return { init, boot, leave, openApp, closeApp, minimizeApp, toggleMaxApp, updateTaskbar, setTitle, isOpen, showDesktop, snapApp };
})();
