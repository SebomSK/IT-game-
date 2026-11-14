/* ===== TicketQuest — fake desktop OS: window manager + taskbar ===== */
/* Reálne okná: minimize / maximize / close, focus, taskbar s aplikáciami. */

const os = (() => {
  const wins = {};          // appId -> { el, body, minimized, maximized, rect }
  let zTop = 20;
  let focused = null;
  let host = null;
  let notifRestore = null;  // okná minimalizované cez Show desktop (privátne pre os.js)

  const DEFAULT_RECT = {
    mail:      { left: 50,  top: 40,  width: 700, height: 470 },
    helpdesk:  { left: 110, top: 55,  width: 780, height: 520 },
    terminal:  { left: 160, top: 90,  width: 680, height: 440 },
    explorer:  { left: 200, top: 60,  width: 640, height: 440 },
    settings:  { left: 250, top: 70,  width: 620, height: 450 },
    library:   { left: 220, top: 50,  width: 660, height: 480 },
    learn:     { left: 180, top: 50,  width: 680, height: 500 },
    taskmgr:   { left: 300, top: 80,  width: 560, height: 420 },
    notepad:   { left: 260, top: 90,  width: 540, height: 400 },
    soc:       { left: 170, top: 46,  width: 720, height: 540 },
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
    for (const dir of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
      const h = document.createElement("div");
      h.className = "appwin-rs rs-" + dir;
      h.dataset.dir = dir;
      el.appendChild(h);
    }
    enableResize(el);
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

  /* zmena veľkosti ťahaním za okraj alebo roh (8 úchytov) */
  const MIN_W = 320, MIN_H = 200;
  function enableResize(el) {
    el.addEventListener("pointerdown", (e) => {
      const h = e.target.closest(".appwin-rs");
      if (!h || e.button !== 0) return;
      const w = wins[el.dataset.app];
      if (!w || w.maximized) return;
      e.preventDefault();
      e.stopPropagation();
      focusApp(el.dataset.app);
      if (w.snapped) {                       // snapnuté okno sa pri zmene veľkosti "odsnapne"
        const g = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
        w.snapped = null;
        el.classList.remove("snapped");
        el.style.right = "";
        setRect(el, g);
      }
      const dir = h.dataset.dir;
      const r0 = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
      const sx = e.clientX, sy = e.clientY;
      const hb = host.getBoundingClientRect();
      try { h.setPointerCapture(e.pointerId); } catch (err) {}
      const move = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        let { left, top, width, height } = r0;
        if (dir.includes("e")) width = Math.min(Math.max(MIN_W, r0.width + dx), hb.width - r0.left);
        if (dir.includes("s")) height = Math.min(Math.max(MIN_H, r0.height + dy), hb.height - r0.top);
        if (dir.includes("w")) {
          const nl = Math.min(Math.max(0, r0.left + dx), r0.left + r0.width - MIN_W);
          width = r0.width + (r0.left - nl); left = nl;
        }
        if (dir.includes("n")) {
          const nt = Math.min(Math.max(0, r0.top + dy), r0.top + r0.height - MIN_H);
          height = r0.height + (r0.top - nt); top = nt;
        }
        setRect(el, { left, top, width, height });
      };
      const up = () => {
        h.removeEventListener("pointermove", move);
        h.removeEventListener("pointerup", up);
        h.removeEventListener("pointercancel", up);
        w.rect = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
      };
      h.addEventListener("pointermove", move);
      h.addEventListener("pointerup", up);
      h.addEventListener("pointercancel", up);
    });
  }

  /* mobil: okná pevných rozmerov sa nezmestia → automaticky maximalizovať */
  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  function applyMobileLayout() {
    for (const id of Object.keys(wins)) {
      const w = wins[id];
      if (isMobile() && !w.maximized) {
        if (w.snapped) { w.snapped = null; w.el.classList.remove("snapped"); w.el.style.right = ""; }
        w.rect = w.rect || { left: 50, top: 40, width: 560, height: 420 };
        w.maximized = true; w.autoMax = true;
        w.el.classList.add("maximized");
      } else if (!isMobile() && w.autoMax) {
        w.maximized = false; w.autoMax = false;
        w.el.classList.remove("maximized");
      }
    }
    updateTaskbar();
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

  const order = [];   // poradie okien podľa poslednej aktivity (pre Alt+Tab)
  function focusApp(id) {
    if (!wins[id]) return;
    focused = id;
    const oi = order.indexOf(id);
    if (oi >= 0) order.splice(oi, 1);
    order.unshift(id);
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
    if (!wins[id]) { wins[id] = makeWindow(id); if (isMobile()) applyMobileLayout(); }
    noteRecent({ type: "app", id });
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

  /* ---------- pripnuté aplikácie (localStorage) ---------- */
  let pinned = [];
  try { pinned = JSON.parse(localStorage.getItem("tq-pinned") || "[]").filter((id) => typeof id === "string"); } catch (e) {}
  function savePinned() { try { localStorage.setItem("tq-pinned", JSON.stringify(pinned)); } catch (e) {} }
  function togglePin(id) {
    const i = pinned.indexOf(id);
    if (i >= 0) pinned.splice(i, 1); else pinned.push(id);
    savePinned();
    updateTaskbar();
  }

  /* ---------- nedávne (aplikácie a súbory) ---------- */
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem("tq-recent") || "[]").filter((r) => r && typeof r.type === "string"); } catch (e) {}
  function noteRecent(item) {
    const key = item.type + ":" + (item.id || item.name);
    recent = recent.filter((r) => r.type + ":" + (r.id || r.name) !== key);
    recent.unshift({ type: item.type, id: item.id, name: item.name });
    recent = recent.slice(0, 6);
    try { localStorage.setItem("tq-recent", JSON.stringify(recent)); } catch (e) {}
  }

  /* taskbar: pripnuté + otvorené okná */
  function updateTaskbar() {
    const box = document.getElementById("tb-windows");
    if (!box) return;
    box.innerHTML = "";
    const ids = [...pinned.filter((id) => APPS[id]), ...Object.keys(wins).filter((id) => !pinned.includes(id))];
    for (const id of ids) {
      const app = APPS[id];
      if (!app) continue;
      const open = !!wins[id] && !wins[id].closed;
      if (!open && !pinned.includes(id)) continue;
      const b = document.createElement("button");
      b.className = "tb-win" +
        (open && focused === id && !wins[id].minimized ? " active" : "") +
        (open && wins[id].minimized ? " mini" : "") + (open ? "" : " pinned-idle");
      b.title = app.title;
      b.dataset.tip = app.title;
      b.dataset.app = id;
      b.innerHTML = `<span class="tb-win-ico">${app.icon}</span><span class="tb-win-label">${app.label}</span>`;
      b.onclick = () => {
        if (!open) openApp(id);
        else if (wins[id].minimized) focusApp(id);
        else if (focused === id) minimizeApp(id);
        else focusApp(id);
        SFX.click();
      };
      b.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY, [
          { label: "Open", act: () => openApp(id) },
          open ? { label: "Close window", act: () => closeApp(id) } : null,
          { label: pinned.includes(id) ? "Unpin from taskbar" : "Pin to taskbar", act: () => togglePin(id) },
        ]);
      });
      box.appendChild(b);
    }
  }

  /* ---------- kontextové menu (pravé tlačidlo) ---------- */
  const WALLPAPERS = ["Teal", "Midnight", "Sunset"];
  function getWall() { try { return Math.max(0, Math.min(WALLPAPERS.length - 1, parseInt(localStorage.getItem("tq-wall") || "0", 10) || 0)); } catch (e) { return 0; } }
  function applyWall() { const d = document.getElementById("desktop-view"); if (d) d.dataset.wall = String(getWall()); }
  function nextWall() {
    try { localStorage.setItem("tq-wall", String((getWall() + 1) % WALLPAPERS.length)); } catch (e) {}
    applyWall();
  }
  function closeContextMenu() { document.getElementById("ctx-menu")?.remove(); }
  function showContextMenu(x, y, items) {
    closeContextMenu();
    const menu = document.createElement("div");
    menu.id = "ctx-menu";
    menu.setAttribute("role", "menu");
    for (const it of items.filter(Boolean)) {
      if (it.sep) { const hr = document.createElement("div"); hr.className = "ctx-sep"; menu.appendChild(hr); continue; }
      const b = document.createElement("button");
      b.type = "button"; b.className = "ctx-item"; b.setAttribute("role", "menuitem");
      b.textContent = it.label;
      b.onclick = () => { closeContextMenu(); SFX.click(); it.act(); };
      menu.appendChild(b);
    }
    document.getElementById("desktop-view").appendChild(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = Math.max(4, Math.min(x, window.innerWidth - r.width - 4)) + "px";
    menu.style.top = Math.max(4, Math.min(y, window.innerHeight - r.height - 4)) + "px";
    menu.querySelector(".ctx-item")?.focus();
  }
  function refreshDesktop() {
    const icons = document.getElementById("desktop-icons");
    if (icons) { icons.classList.remove("refresh"); void icons.offsetWidth; icons.classList.add("refresh"); }
    if (typeof renderTickets === "function") renderTickets();
    tickClock();
  }
  function desktopMenu(x, y) {
    showContextMenu(x, y, [
      { label: "🔄 Refresh", act: refreshDesktop },
      { label: "🖼 Personalize — next wallpaper (" + WALLPAPERS[getWall()] + ")", act: nextWall },
      { label: "🖥 Show desktop", act: showDesktop },
      { sep: true },
      { label: "▶_ Open Terminal here", act: () => openApp("terminal") },
      { label: "⚙️ Display settings", act: () => openApp("settings") },
    ]);
  }
  function iconMenu(x, y, id) {
    showContextMenu(x, y, [
      { label: "Open", act: () => openApp(id) },
      { label: pinned.includes(id) ? "Unpin from taskbar" : "Pin to taskbar", act: () => togglePin(id) },
      { label: "Properties", act: () => notify({ icon: APPS[id].icon, title: APPS[id].label, body: APPS[id].title.replace(/^\S+\s/, "") + " — TicketQuest app", cls: "" }) },
    ]);
  }

  /* ---------- start menu (Windows 11 style) + vyhľadávanie ---------- */
  function allTickets() {
    return [...TICKETS, ...(state.dorisTickets || []), ...(state.grindTickets || [])]
      .filter((t) => t && ticketVisible(t) && !state.resolved.includes(t.id) && !state.escalated.includes(t.id));
  }
  function fsEntries() {
    const out = [];
    for (const dir of Object.keys(FS)) {
      for (const name of FS[dir]) {
        const full = dir.endsWith("\\") ? dir + name : dir + "\\" + name;
        out.push({ name, dir, full, isDir: !!FS[full] });
      }
    }
    return out;
  }
  function openFsEntry(e) {
    if (e.isDir) { expCwd = e.full; openApp("explorer"); if (typeof apps !== "undefined") apps.renderExplorer(); return; }
    if (e.name.endsWith(".book")) { openApp("library"); return; }
    noteRecent({ type: "file", name: e.name });
    npadShow(e.name, FILE_TEXT[e.name] || "(empty file)");
  }
  function searchAll(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const res = [];
    for (const id of Object.keys(APPS)) {
      const a = APPS[id];
      if (a.label.toLowerCase().includes(q) || a.title.toLowerCase().includes(q))
        res.push({ ico: a.icon, title: a.label, sub: "App", act: () => openApp(id) });
    }
    for (const t of allTickets()) {
      if (`#${t.id} ${t.subject} ${t.from}`.toLowerCase().includes(q))
        res.push({ ico: "🎫", title: `#${t.id} ${t.subject}`, sub: "Ticket · " + String(t.from).split("<")[0], act: () => { openApp("helpdesk"); showDetail(t.id); } });
    }
    for (const e of fsEntries()) {
      if (e.name.toLowerCase().includes(q))
        res.push({ ico: e.isDir ? "📁" : "📄", title: e.name, sub: "File · " + e.dir, act: () => openFsEntry(e) });
    }
    if (typeof LESSONS !== "undefined") {
      for (const k of Object.keys(LESSONS)) {
        const l = LESSONS[k];
        if ((l.title + " " + l.concept).toLowerCase().includes(q))
          res.push({ ico: "🎓", title: l.title, sub: "Learn · lesson", act: () => openApp("learn") });
      }
    }
    return res.slice(0, 8);
  }

  function closeStartMenu() { document.getElementById("start-menu")?.remove(); }

  function toggleStartMenu(focusSearch) {
    let menu = document.getElementById("start-menu");
    if (menu) {
      if (focusSearch) { menu.querySelector(".sm-search-input")?.focus(); return; }
      menu.remove(); SFX.click(); return;
    }
    closeContextMenu();
    menu = document.createElement("div");
    menu.id = "start-menu";
    const rank = rankTitle();
    const pinnedHtml = Object.keys(APPS).map((id) =>
      `<button class="sm-app" data-app="${id}">
         <span class="sm-app-ico">${APPS[id].icon}</span><span>${APPS[id].label}</span>
       </button>`).join("");
    const recentHtml = recent.length
      ? recent.map((r, i) => {
          const label = r.type === "app" ? (APPS[r.id] ? APPS[r.id].label : r.id) : r.name;
          const ico = r.type === "app" ? (APPS[r.id] ? APPS[r.id].icon : "▫") : "📄";
          return `<button class="sm-recent" data-i="${i}"><span>${ico}</span>${escHtml(label)}</button>`;
        }).join("")
      : `<div class="sm-empty">Nothing yet — open an app or a file.</div>`;
    menu.innerHTML =
      `<label class="sm-search">🔍
         <input class="sm-search-input" type="text" placeholder="Search apps, tickets, files, lessons…" autocomplete="off" spellcheck="false" aria-label="Search">
       </label>
       <div class="sm-results hidden" role="listbox"></div>
       <div class="sm-home">
         <div class="sm-section">Pinned</div>
         <div class="sm-pinned">${pinnedHtml}</div>
         <div class="sm-section">Recent</div>
         <div class="sm-recents">${recentHtml}</div>
       </div>
       <div class="sm-foot">
         <button class="sm-user">
           <span class="sm-avatar">${escHtml((state.player.name || "?").charAt(0).toUpperCase())}</span>
           <span><div class="sm-name">${escHtml(state.player.name) || "Intern"}</div>
           <div class="sm-rank">${rank} @ PIXL Corp</div></span>
         </button>
         <button class="sm-leave" id="sm-leave">🚶 Leave desk</button>
       </div>`;
    host.appendChild(menu);

    const input = menu.querySelector(".sm-search-input");
    const resBox = menu.querySelector(".sm-results");
    const home = menu.querySelector(".sm-home");
    let results = [], sel = 0;
    const paint = () => {
      resBox.innerHTML = results.length
        ? results.map((r, i) => `<button class="sm-res${i === sel ? " sel" : ""}" data-i="${i}" role="option">
            <span class="sm-res-ico">${r.ico}</span><span class="sm-res-main"><b>${escHtml(r.title)}</b><small>${escHtml(r.sub)}</small></span></button>`).join("")
        : `<div class="sm-empty">No results for “${escHtml(input.value)}”.</div>`;
    };
    input.addEventListener("input", () => {
      results = searchAll(input.value); sel = 0;
      const active = input.value.trim().length > 0;
      resBox.classList.toggle("hidden", !active);
      home.classList.toggle("hidden", active);
      if (active) paint();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeStartMenu(); e.stopPropagation(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (results.length) { sel = (sel + (e.key === "ArrowDown" ? 1 : results.length - 1)) % results.length; paint(); }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[sel]) { const r = results[sel]; closeStartMenu(); r.act(); }
      }
      e.stopPropagation();   // písanie nesmie spúšťať hotkeys ani terminál
    });
    menu.addEventListener("click", (e) => {
      const res = e.target.closest(".sm-res");
      if (res) { const r = results[parseInt(res.dataset.i, 10)]; closeStartMenu(); if (r) r.act(); return; }
      const rec = e.target.closest(".sm-recent");
      if (rec) {
        const r = recent[parseInt(rec.dataset.i, 10)];
        closeStartMenu();
        if (r && r.type === "app") openApp(r.id);
        else if (r) npadShow(r.name, FILE_TEXT[r.name] || "(empty file)");
        return;
      }
      const b = e.target.closest("button");
      if (!b || b.closest(".sm-search")) return;
      closeStartMenu();
      if (b.id === "sm-leave") leave();
      else if (b.dataset.app) openApp(b.dataset.app);
    });
    menu.querySelectorAll(".sm-app").forEach((b) => b.addEventListener("contextmenu", (e) => {
      e.preventDefault(); e.stopPropagation();
      iconMenu(e.clientX, e.clientY, b.dataset.app);
    }));
    SFX.click();
    if (focusSearch !== false) setTimeout(() => input.focus(), 30);
  }

  /* ---------- Alt+Tab prepínač okien ---------- */
  let switcher = null;   // { idx, ids }
  function switcherList() { return order.filter((id) => wins[id] && !wins[id].closed); }
  function showSwitcher(step) {
    const ids = switcherList();
    if (ids.length < 2) { if (ids.length === 1) focusApp(ids[0]); return; }
    if (!switcher) switcher = { ids, idx: 0 };
    switcher.idx = (switcher.idx + step + ids.length) % ids.length;
    let el = document.getElementById("alt-tab");
    if (!el) { el = document.createElement("div"); el.id = "alt-tab"; document.getElementById("desktop-view").appendChild(el); }
    el.innerHTML = switcher.ids.map((id, i) =>
      `<div class="at-item${i === switcher.idx ? " sel" : ""}"><span>${APPS[id].icon}</span><small>${escHtml(APPS[id].label)}</small></div>`).join("");
  }
  function commitSwitcher() {
    if (!switcher) return;
    const id = switcher.ids[switcher.idx];
    switcher = null;
    document.getElementById("alt-tab")?.remove();
    if (id && wins[id]) { focusApp(id); SFX.click(); }
  }

  /* ---------- klávesové skratky ---------- */
  function desktopVisible() { return !document.getElementById("desktop-view").classList.contains("hidden"); }
  function modalOpen() { return !!document.querySelector(".overlay:not(.hidden)"); }
  function onKeyDown(e) {
    if (!desktopVisible()) return;
    if (e.key === "Escape") {
      if (document.getElementById("ctx-menu")) { closeContextMenu(); return; }
      if (switcher) { switcher = null; document.getElementById("alt-tab")?.remove(); return; }
      if (document.getElementById("start-menu")) { closeStartMenu(); return; }
      const nc = document.getElementById("notif-center");
      if (nc && !nc.classList.contains("hidden")) { nc.classList.add("hidden"); }
      return;
    }
    if (modalOpen()) return;
    const k = e.key.toLowerCase();
    // Win+S / Ctrl+Alt+S → hľadanie; Win+D / Ctrl+Alt+D → Show desktop
    // (prehliadač nemusí doručiť Win/Alt+Tab kombinácie — preto aj spoľahlivé náhrady)
    if ((e.metaKey || (e.ctrlKey && e.altKey)) && k === "s") { e.preventDefault(); toggleStartMenu(true); return; }
    if ((e.metaKey || (e.ctrlKey && e.altKey)) && k === "d") { e.preventDefault(); showDesktop(); return; }
    // Alt+Tab (alebo spoľahlivejšie Alt+W / Ctrl+Alt+W) → prepínanie okien
    if ((e.altKey && (e.key === "Tab" || k === "w")) || (e.ctrlKey && e.altKey && k === "w")) {
      e.preventDefault();
      showSwitcher(e.shiftKey ? -1 : 1);
    }
  }
  function onKeyUp(e) {
    if (e.key === "Alt" || e.key === "Control") commitSwitcher();
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
        if (b.dataset.app === "start") toggleStartMenu(false);
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
    applyWall();
    const dv = document.getElementById("desktop-view");
    dv.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".appwin") || e.target.closest("#start-menu") || e.target.closest("#notif-center") || e.target.closest(".tb-win")) return;
      e.preventDefault();
      const icon = e.target.closest(".dicon");
      if (icon) iconMenu(e.clientX, e.clientY, icon.dataset.app);
      else if (!e.target.closest("#taskbar")) desktopMenu(e.clientX, e.clientY);
    });
    dv.addEventListener("mousedown", (e) => { if (!e.target.closest("#ctx-menu")) closeContextMenu(); });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", applyMobileLayout);
    window.addEventListener("blur", () => { switcher = null; document.getElementById("alt-tab")?.remove(); });
    document.getElementById("btn-leave").addEventListener("click", leave);
    const sitBtn = document.getElementById("btn-sitdown");
    if (sitBtn) sitBtn.addEventListener("click", () => { SFX.click(); boot(); });
    document.getElementById("tb-tickets").addEventListener("click", () => openApp("helpdesk"));
    // klik na plochu zavrie start menu (ako v reálnom OS)
    document.getElementById("desktop-view").addEventListener("mousedown", (e) => {
      if (e.target.closest(".dicon") || e.target.closest("#taskbar") || e.target.closest(".appwin") || e.target.closest("#start-menu")) return;
      const menu = document.getElementById("start-menu");
      if (menu) menu.remove();
    });
    setInterval(tickClock, 30000);
  }

  return { init, boot, leave, noteRecent, openApp, closeApp, minimizeApp, toggleMaxApp, updateTaskbar, setTitle, isOpen, showDesktop, snapApp };
})();
