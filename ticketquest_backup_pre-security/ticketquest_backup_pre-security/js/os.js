/* ===== TicketQuest — fake desktop OS: window manager + taskbar ===== */

const os = (() => {
  const wins = {};          // appId -> { el, body }
  let zTop = 20;
  let host = null;

  const DEFAULT_RECT = {
    mail:      { left: 60,  top: 50,  width: 440, height: 430 },
    helpdesk:  { left: 540, top: 70,  width: 560, height: 560 },
    terminal:  { left: 180, top: 110, width: 680, height: 440 },
    explorer:  { left: 200, top: 90,  width: 500, height: 400 },
    settings:  { left: 240, top: 90,  width: 480, height: 430 },
  };

  function makeWindow(id) {
    const app = APPS[id];
    const rect = DEFAULT_RECT[id] || { left: 120, top: 80, width: 520, height: 420 };
    const el = document.createElement("div");
    el.className = "appwin";
    el.dataset.app = id;
    el.style.left = rect.left + "px";
    el.style.top = rect.top + "px";
    el.style.width = rect.width + "px";
    el.style.height = rect.height + "px";
    el.innerHTML = `
      <div class="appwin-titlebar">
        <span class="appwin-title">${app.title}</span>
        <button class="appwin-close" title="Close">✕</button>
      </div>
      <div class="appwin-body"></div>`;
    host.appendChild(el);

    const body = el.querySelector(".appwin-body");
    app.mount(body);

    el.querySelector(".appwin-close").addEventListener("click", () => closeApp(id));
    el.addEventListener("mousedown", () => focusApp(id));
    enableDrag(el, el.querySelector(".appwin-titlebar"));
    return { el, body };
  }

  function enableDrag(el, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false;
    handle.addEventListener("mousedown", (e) => {
      if (e.target.classList.contains("appwin-close")) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = el.offsetLeft; oy = el.offsetTop;
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const r = host.getBoundingClientRect();
      el.style.left = Math.max(0, Math.min(ox + e.clientX - sx, r.width - 80)) + "px";
      el.style.top = Math.max(0, Math.min(oy + e.clientY - sy, r.height - 40)) + "px";
    });
    window.addEventListener("mouseup", () => { dragging = false; });
  }

  function focusApp(id) {
    if (!wins[id]) return;
    zTop++;
    wins[id].el.style.zIndex = zTop;
    wins[id].el.classList.add("focused");
    Object.keys(wins).forEach((k) => { if (k !== id) wins[k].el.classList.remove("focused"); });
    updateTaskbar();
  }

  function openApp(id) {
    const app = APPS[id];
    if (!app) return;
    if (app.overlay) { app.open(); return; }
    if (!host) host = document.getElementById("windows");
    if (!wins[id]) wins[id] = makeWindow(id);
    wins[id].el.classList.remove("hidden");
    focusApp(id);
    SFX.click();
    if (app.onOpen) app.onOpen();
  }

  function toggleApp(id) {
    if (wins[id] && !wins[id].el.classList.contains("hidden")) {
      wins[id].el.classList.add("hidden");
      updateTaskbar();
      SFX.click();
    } else {
      openApp(id);
    }
  }

  function closeApp(id) {
    if (!wins[id]) return;
    wins[id].el.classList.add("hidden");
    updateTaskbar();
    SFX.click();
  }

  function isOpen(id) {
    return !!wins[id] && !wins[id].el.classList.contains("hidden");
  }

  function updateTaskbar() {
    document.querySelectorAll("#taskbar .tb-btn[data-app]").forEach((b) => {
      const id = b.dataset.app;
      b.classList.toggle("tb-active", isOpen(id));
    });
  }

  /* ---------- start menu ---------- */
  function toggleStartMenu() {
    let menu = document.getElementById("start-menu");
    if (menu) { menu.remove(); SFX.click(); return; }
    menu = document.createElement("div");
    menu.id = "start-menu";
    menu.innerHTML =
      Object.keys(APPS)
        .map((id) => `<button class="sm-item" data-app="${id}">${APPS[id].icon} ${APPS[id].label}</button>`)
        .join("") +
      `<div class="sm-sep"></div>
       <button class="sm-item sm-leave" id="sm-leave">🚶 Leave desk</button>`;
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
    el.textContent = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
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
    office.drawNPCs();
  }

  /* ---------- wiring ---------- */
  function init() {
    document.getElementById("tb-clock").textContent = "9:00 AM";
    document.querySelectorAll("#taskbar .tb-btn[data-app]").forEach((b) => {
      b.addEventListener("click", () => {
        if (b.dataset.app === "start") toggleStartMenu();
        else toggleApp(b.dataset.app);
      });
    });
    document.querySelectorAll("#desktop-icons .dicon").forEach((d) => {
      d.addEventListener("dblclick", () => openApp(d.dataset.app));
      d.addEventListener("click", () => openApp(d.dataset.app));
    });
    document.getElementById("btn-leave").addEventListener("click", leave);
    setInterval(tickClock, 30000);
  }

  return { init, boot, leave, openApp, closeApp, toggleApp, updateTaskbar };
})();
