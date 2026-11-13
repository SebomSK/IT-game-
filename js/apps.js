/* ===== TicketQuest â€” desktop applications (realistic fake OS apps) ===== */

/* flavor emails (not tickets) */
const FLAVOR_MAIL = [
  {
    from: "Zora <zora@pixlcorp.local>",
    subj: "Welcome to PIXL IT ðŸŽ‰",
    body:
      "Hi! Before you touch anything: read the SOP Binder (Training app on the desktop).\n" +
      "Tickets arrive in the HelpDesk app. Fix them in the Terminal on SRV-DC01.\n" +
      "When you don't know something â€” that's normal. Look it up. That's the whole job.\n\nâ€” Zora",
    time: "9:02 AM",
  },
  {
    from: "Mr. Pixel <pixel@pixlcorp.local>",
    subj: "(no subject)",
    body: "(empty email). Classic.",
    time: "9:07 AM",
  },
  {
    from: "IT Newsletter <noreply@pixlcorp.local>",
    subj: "This week in IT: the spooler strikes again",
    body:
      "Top 3 causes of 'the internet is broken':\n" +
      "1. It's not the internet.\n" +
      "2. It's a stopped service.\n" +
      "3. Someone unplugged the thing.\n" +
      "Stay curious. â€” IT Editorial Team",
    time: "8:30 AM",
  },
  {
    from: "Doris Pemberton <doris@pixlcorp.local>",
    subj: "Quick question (not urgent) (urgent)",
    body: "Hi! How do I attach a file to an email? Asking for a friend. The friend is me.",
    time: "9:11 AM",
  },
];

const FILE_TEXT = {
  "todo.txt":
    "[TODO]\n - fix the coffee machine, 2nd floor (IT priority!)\n - DEFEAT THE BRUTE-FORCER\n - ask Zora what 'keeper.ps1' is. carefully.",
  "week1.txt": "Week 1 at PIXL Corp: survived. Victory: the spooler.",
  "password-sop.txt":
    "SOP: Always reset passwords, NEVER send the old one. Minimum 8 characters.\nAlso: nobody has EVER seen the old password. Ever.",
  "vpn.log":
    "2026-11-12 21:14  ERROR  RADIUS timeout: IAS not responding (10.0.0.1:1812)\n" +
    "2026-11-12 21:15  ERROR  RADIUS timeout: IAS not responding (10.0.0.1:1812)\n" +
    "2026-11-12 21:16  WARN   3 consecutive auth failures â€” service degraded",
  "keeper-trace.log":
    "--- keeper-trace.log ---\n" +
    "Every night at 23:00 an unnamed scheduled task runs keeper.ps1.\n" +
    "The full story unfolds in the Task Manager app — click the keeper.ps1 row. 👀",
  "day-one.docx":
    "(Binary .docx â€” Notepad shrugs. Some mysteries are for Microsoft Word only.)",
};

/* globÃ¡lny filter HelpDesk queue (All / New / Mine / Done) */
let hdFilter = "all";

const apps = (() => {
  let seenInMail = new Set();
  let selectedMail = null; // {type:'flavor',i} | {type:'ticket',id}

  function ticketMails() {
    return [...TICKETS, ...(state.dorisTickets || []), ...(state.grindTickets || [])]
      .filter((t) => ticketVisible(t) && !state.resolved.includes(t.id) && !state.escalated.includes(t.id));
  }

  /* ================= MAIL â€” Outlook-style (3 panes) ================= */
  function renderMail() {
    const list = document.getElementById("mail-list");
    if (!list) return;
    list.className = "outlook";
    list.innerHTML = "";

    /* --- folder rail --- */
    const rail = document.createElement("div");
    rail.className = "ol-rail";
    const unread = ticketMails().filter((t) => !seenInMail.has(t.id)).length;
    rail.innerHTML =
      `<div class="ol-account"><div class="ol-ava">${(state.player.name || "I").charAt(0).toUpperCase()}</div>
         <div><div class="ol-name">${escHtml(state.player.name) || "Intern"}</div><div class="ol-mail">you@pixlcorp.local</div></div>
       </div>
       <div class="ol-folder active">ðŸ“¥ <span>Inbox</span><b>${ticketMails().length}</b></div>
       <div class="ol-folder">ðŸš© <span>Flagged</span><b>0</b></div>
       <div class="ol-folder">ðŸ“¤ <span>Sent</span><b>0</b></div>
       <div class="ol-folder">ðŸ—‚ <span>Archive</span><b>0</b></div>
       <div class="ol-folder">ðŸ—‘ <span>Deleted</span><b>${Math.min(state.resolved.length, 99)}</b></div>`;
    list.appendChild(rail);

    /* --- message list --- */
    const msgList = document.createElement("div");
    msgList.className = "ol-list";
    msgList.innerHTML = `<div class="ol-list-head">ðŸ“¥ Inbox â€” ${ticketMails().length} unread tickets</div>`;

    const selKey = selectedMail ? selectedMail.type + ":" + (selectedMail.id ?? selectedMail.i) : null;

    FLAVOR_MAIL.forEach((m, i) => {
      const key = "flavor:" + i;
      const el = document.createElement("div");
      el.className = "ol-item flavor" + (selKey === key ? " sel" : "");
      el.innerHTML = `<div class="ol-ava mini">${m.from.charAt(0).toUpperCase()}</div>
        <div class="ol-item-main">
          <div class="ol-row1"><span class="ol-from">${m.from.split("<")[0].trim()}</span><span class="ol-time">${m.time}</span></div>
          <div class="ol-subj">${m.subj}</div>
          <div class="ol-snip">${m.body.slice(0, 64)}â€¦</div>
        </div>`;
      el.onclick = () => { selectedMail = { type: "flavor", i }; SFX.click(); renderMail(); };
      msgList.appendChild(el);
    });

    ticketMails().forEach((t) => {
      const key = "ticket:" + t.id;
      const el = document.createElement("div");
      el.className = "ol-item ticket" + (selKey === key ? " sel" : "");
      el.innerHTML = `<div class="ol-ava mini prio-${t.priority.toLowerCase()}">ðŸŽ«</div>
        <div class="ol-item-main">
          <div class="ol-row1"><span class="ol-from">${t.from.split("<")[0].split(",")[0].trim()}</span><span class="ol-time">#${t.id}</span></div>
          <div class="ol-subj">${t.subject}</div>
          <div class="ol-snip">${t.body.slice(0, 64)}â€¦</div>
        </div>`;
      el.onclick = () => { selectedMail = { type: "ticket", id: t.id }; seenInMail.add(t.id); SFX.click(); renderMail(); updateBadges(); };
      msgList.appendChild(el);
    });
    list.appendChild(msgList);

    /* --- reading pane --- */
    const read = document.createElement("div");
    read.className = "ol-read";
    const sel = selectedMail;
    if (sel && sel.type === "flavor") {
      const m = FLAVOR_MAIL[sel.i];
      read.innerHTML = `<div class="ol-read-head">
          <div class="ol-read-subj">${m.subj}</div>
          <div class="ol-read-meta"><b>${m.from}</b> Â· ${m.time}</div>
        </div><div class="ol-read-body">${escHtml(m.body)}</div>`;
    } else if (sel && sel.type === "ticket") {
      const t = findTicket(sel.id);
      if (t && ticketMails().some((x) => x.id === t.id)) {
        const done = state.resolved.includes(t.id) || state.escalated.includes(t.id);
        const taken = state.taken.includes(t.id);
        read.innerHTML = `<div class="ol-read-head">
            <div class="ol-read-subj">ðŸŽ« #${t.id} â€” ${t.subject}</div>
            <div class="ol-read-meta"><b>${t.from}</b> Â· <span class="prio ${t.priority.toLowerCase()}">${t.priority}</span>${t.slaMin ? ` Â· SLA ${t.slaMin} min` : ""}</div>
          </div>
          <div class="ol-read-body">${escHtml(t.body.replaceAll("{PLAYER}", state.player.name || ""))}</div>
          <div class="ol-read-actions">
            <button id="ol-open" class="btn-primary">Open in HelpDesk â†’</button>
            ${done ? `<span class="ol-done">âœ” handled</span>` : taken ? `<span class="ol-done">âœ‹ assigned to you</span>` : ""}
          </div>`;
        read.querySelector("#ol-open").onclick = () => {
          SFX.click();
          os.openApp("helpdesk");
          showDetail(t.id);
        };
      } else {
        selectedMail = null;
      }
    }
    if (!read.innerHTML) {
      read.innerHTML = `<div class="ol-empty">
        <div class="ol-empty-ico">ðŸ“­</div>
        <div>Select a message to read it here.</div>
        <div class="ol-empty-sub">Ticket mail lands in this inbox â€” handle it in the HelpDesk app.</div>
      </div>`;
    }
    list.appendChild(read);
  }

  function updateBadges() {
    const unseen = ticketMails().filter((t) => !seenInMail.has(t.id)).length;
    const mb = document.getElementById("mail-badge");
    mb.classList.toggle("hidden", unseen === 0);
    mb.textContent = unseen;

    const hd = document.getElementById("hd-badge");
    const pending = ticketMails().filter((t) => !state.taken.includes(t.id)).length;
    hd.classList.toggle("hidden", pending === 0);
    hd.textContent = pending;

    const tp = document.getElementById("tb-tickets");
    if (tp) {
      const open = ticketMails().length;
      tp.textContent = open > 0 ? `ðŸŽ« TICKETS Â· ${open}` : "ðŸŽ« ALL DONE";
    }

    // keep the open mail window in sync with arriving tickets
    if (document.getElementById("mail-list").closest(".appwin")) {
      renderMail();
    }
  }

  /* ================= EXPLORER â€” Windows-style ================= */
  const EXP_NAV = [
    { ico: "ðŸ ", label: "Home", path: "C:\\" },
    { ico: "ðŸ“", label: "Books", path: "C:\\Books" },
    { ico: "ðŸ“", label: "Reports", path: "C:\\Reports" },
    { ico: "ðŸ“", label: "IT-SOP", path: "C:\\IT-SOP" },
    { ico: "ðŸ“", label: "Logs", path: "C:\\Logs" },
    { ico: "ðŸ‘¤", label: "My files", path: "C:\\Users\\admin" },
  ];

  function renderExplorer() {
    const body = document.getElementById("explorer-body");
    if (!body) return;
    body.innerHTML = "";

    /* --- tab strip (Win11) --- */
    const tabs = document.createElement("div");
    tabs.className = "exp-tabs";
    expTabs.forEach((t, i) => {
      const tab = document.createElement("div");
      tab.className = "exp-tab" + (i === expActive ? " active" : "");
      tab.innerHTML = `<span>ðŸ“</span><span class="exp-tab-name">${expTabName(t.path)}</span>` +
        `<button class="exp-tab-x" title="Close tab">âœ•</button>`;
      tab.addEventListener("click", (e) => {
        if (e.target.closest(".exp-tab-x")) {
          SFX.click();
          if (expTabs.length > 1) {
            expTabs.splice(i, 1);
            expActive = Math.min(expActive, expTabs.length - 1);
            expCwd = expTabs[expActive].path;
            renderExplorer();
          }
          return;
        }
        expActive = i;
        expCwd = t.path;
        SFX.click();
        renderExplorer();
      });
      tabs.appendChild(tab);
    });
    const newTab = document.createElement("button");
    newTab.className = "exp-tab-new";
    newTab.title = "New tab";
    newTab.textContent = "+";
    newTab.onclick = () => {
      SFX.click();
      expTabs.push({ path: expCwd });
      expActive = expTabs.length - 1;
      renderExplorer();
    };
    tabs.appendChild(newTab);
    body.appendChild(tabs);

    /* --- nav + grid (pod tabmi) --- */
    const content = document.createElement("div");
    content.style.display = "grid";
    content.style.gridTemplateColumns = "168px 1fr";
    content.style.height = "calc(100% - 40px)";
    content.style.overflow = "hidden";

    const side = document.createElement("div");
    side.className = "exp-side";
    side.innerHTML = `<div class="exp-side-head">ðŸ—‚ Quick access</div>`;
    for (const n of EXP_NAV) {
      const item = document.createElement("button");
      item.className = "exp-nav" + (expCwd === n.path ? " active" : "");
      item.innerHTML = `<span>${n.ico}</span> ${n.label}`;
      item.onclick = () => { expCwd = n.path; SFX.click(); renderExplorer(); };
      side.appendChild(item);
    }
    side.insertAdjacentHTML("beforeend",
      `<div class="exp-side-head">ðŸ’¾ This PC</div>
       <button class="exp-nav dim"><span>ðŸ’¿</span> C: (System)</button>
       <button class="exp-nav dim"><span>ðŸ’¾</span> D: (Data)</button>`);
    content.appendChild(side);

    const main = document.createElement("div");
    main.className = "exp-main";
    const crumbs = document.createElement("div");
    crumbs.className = "exp-toolbar";
    crumbs.innerHTML = `<span class="exp-crumb">ðŸ’» C:\</span>${expCwd !== "C:\\" ? ` â–¸ <span class="exp-crumb">${expCwd.replace("C:\\", "")}</span>` : ""}
      <span class="exp-count">${(FS[expCwd] || []).length} items</span>`;
    crumbs.querySelector(".exp-crumb").onclick = () => { expCwd = "C:\\"; expTabs[expActive] = { path: expCwd }; renderExplorer(); SFX.click(); };
    main.appendChild(crumbs);

    const grid = document.createElement("div");
    grid.className = "exp-grid";
    if (expCwd !== "C:\\") {
      const up = document.createElement("div");
      up.className = "exp-item dir";
      up.innerHTML = `<div class="exp-glyph">â†©ï¸</div><span>..</span>`;
      up.onclick = () => { expCwd = "C:\\"; expTabs[expActive] = { path: expCwd }; renderExplorer(); SFX.click(); };
      grid.appendChild(up);
    }

    for (const item of FS[expCwd] || []) {
      const child = expCwd === "C:\\" ? "C:\\" + item : expCwd + "\\" + item;
      const isDir = !!FS[child] || ["Users", "Windows", "Desktop", "Documents"].includes(item);
      const el = document.createElement("div");
      el.className = "exp-item " + (isDir ? "dir" : "file");
      el.innerHTML = `<div class="exp-glyph">${isDir ? "ðŸ“" : item.endsWith(".book") ? "ðŸ“˜" : "ðŸ“„"}</div><span>${item}</span>`;
      el.onclick = () => {
        SFX.click();
        if (isDir) {
          if (FS[child]) expCwd = child;
          else if (child === "C:\\Users") expCwd = "C:\\Users\\admin";
          else if (child === "C:\\Windows") {
            npadShow("C:\\Windows", "System32.\n\nHands off. ðŸ™‚");
            return;
          } else {
            npadShow(item, "(Access denied. Corporate policy says hello.)");
            return;
          }
          expTabs[expActive] = { path: expCwd };
          renderExplorer();
        } else {
          if (item.endsWith(".book")) { openLibrary(item); return; }
          npadShow(item, FILE_TEXT[item] || "(empty file)");
        }
      };
      grid.appendChild(el);
    }
    main.appendChild(grid);
    content.appendChild(main);
    body.appendChild(content);
  }

  /* tab helpers */
  const expTabs = [{ path: "C:\\" }];
  let expActive = 0;
  function expTabName(path) {
    if (path === "C:\\") return "This PC";
    return path.split("\\").filter(Boolean).pop() || path;
  }

  /* ================= SETTINGS â€” Windows-Settings style ================= */
  function renderSettings() {
    const b = document.getElementById("settings-body");
    if (!b) return;
    b.innerHTML = `
      <div class="set-side">
        <div class="set-user">
          <div class="set-ava">${(state.player.name || "I").charAt(0).toUpperCase()}</div>
          <div class="set-user-name">${escHtml(state.player.name) || "Player"}</div>
          <div class="set-user-role">${rankTitle()} @ PIXL Corp</div>
        </div>
        <button class="set-nav active" data-pane="system">ðŸ–¥ <span>System</span></button>
        <button class="set-nav" data-pane="account">ðŸ‘¤ <span>Account</span></button>
        <button class="set-nav" data-pane="about">â„¹ <span>About</span></button>
      </div>
      <div class="set-main" id="set-pane"></div>`;

    const pane = b.querySelector("#set-pane");
    const active = b.querySelector(".set-nav.active")?.dataset.pane || "system";

    if (active === "system") {
      pane.innerHTML = `
        <h3 class="set-title">System</h3>
        <button class="set-row" id="set-chill">â± Chill Mode: <b>${state.chill ? "ON ðŸƒ" : "OFF"}</b><span>SLA timers off â€” practice without pressure</span></button>
        <button class="set-row" id="set-stats">ðŸ“Š Career stats<span>Tickets, SLA, notes, skills</span></button>
        <button class="set-row" id="set-cv">ðŸ“„ Export CV (.txt)<span>A real file you can show someone</span></button>
        <button class="set-row" id="set-export">ðŸ’¾ Export save (.json)<span>Backup your career to a file</span></button>
        <button class="set-row" id="set-import">ðŸ“‚ Import save<span>Load a ticketquest-save.json backup</span></button>
        <button class="set-row" id="set-quiz">ðŸŽ“ A+ certification<span>${state.quiz.aplus ? "Passed âœ”" : "Unlocks after the Tier 1 review"}</span></button>
        <button class="set-row danger" id="set-reset">â˜  Reset save<span>Wipes everything. Doris will not remember you.</span></button>
        <input type="file" id="set-import-file" accept=".json,application/json" class="hidden">`;
      pane.querySelector("#set-chill").onclick = () => { toggleChill(); renderSettings(); };
      pane.querySelector("#set-stats").onclick = () => statsOpen();
      pane.querySelector("#set-cv").onclick = () => cvDownload();
      pane.querySelector("#set-export").onclick = () => saveExport();
      const fileInput = pane.querySelector("#set-import-file");
      pane.querySelector("#set-import").onclick = () => {
        fileInput.onchange = () => {
          if (fileInput.files && fileInput.files[0]) saveImport(fileInput.files[0]);
        };
        fileInput.click();
      };
      pane.querySelector("#set-quiz").onclick = () => {
        if (state.quiz.aplus) { toast("ðŸŽ“ You already passed the A+ exam. Show-off.", "t-ok"); return; }
        const eligible = state.rank >= 1 && state.reviewDone;
        if (eligible) quizOpen("aplus");
        else toast("ðŸŽ“ The A+ exam unlocks after your Tier 1 performance review.", "t-warn");
      };
      pane.querySelector("#set-reset").onclick = () => {
        if (confirm("Really delete your save? All tickets, XP and story progress will be gone.")) {
          localStorage.clear();
          location.reload();
        }
      };
    } else if (active === "account") {
      pane.innerHTML = `
        <h3 class="set-title">Your account</h3>
        <div class="set-row static"><div>ðŸ‘¤ Name</div><span>${escHtml(state.player.name) || "â€”"}</span></div>
        <div class="set-row static"><div>ðŸ”‘ Login</div><span>${escHtml(state.player.login || "â€”")}@PIXLCORP</span></div>
        <div class="set-row static"><div>ðŸ’¼ Position</div><span>${rankTitle()}</span></div>
        <div class="set-row static"><div>ðŸ’° Salary</div><span>${RANKS[rankIndex()].salary > 0 ? "$" + RANKS[rankIndex()].salary + "/mo" : "intern (unpaid)"}</span></div>
        <div class="set-row static"><div>â­ XP</div><span>${state.xp} XP</span></div>`;
    } else {
      pane.innerHTML = `
        <h3 class="set-title">About this PC</h3>
        <div class="set-row static"><div>ðŸ–¥ Device name</div><span>WKS-IT-3F</span></div>
        <div class="set-row static"><div>ðŸ§  OS</div><span>TicketOS 3.0 (simulated)</span></div>
        <div class="set-row static"><div>ðŸ—„ Domain</div><span>pixlcorp.local</span></div>
        <div class="set-row static"><div>ðŸŒ Internet</div><span>Not required â€” everything runs offline</span></div>
        <div class="set-row static"><div>ðŸ’¾ Save</div><span>Automatic Â· localStorage</span></div>
        <div class="set-row static"><div>ðŸŽ® Version</div><span>TicketQuest v0.4</span></div>`;
    }

    b.querySelectorAll(".set-nav").forEach((n) => {
      n.onclick = () => {
        SFX.click();
        b.querySelectorAll(".set-nav").forEach((x) => x.classList.remove("active"));
        n.classList.add("active");
        renderSettings();
      };
    });
  }

  /* ================= TASK MANAGER ================= */
  const FAKE_PROCS = [
    ["explorer.exe", () => 0.3 + Math.random() * 1.2],
    ["outlook.exe", () => 60 + Math.random() * 120],
    ["teams.exe", () => 480 + Math.random() * 600],   // classic
    ["spoolsv.exe", () => Math.random() < .3 ? 88 : 2 + Math.random() * 6],
    ["coffee_machine.exe", () => 95 + Math.random() * 4],
    ["ticket_daemon.exe", () => 4 + Math.random() * 14],
    ["doris_helper.exe", () => Math.random() * 2],
    ["keeper.ps1", () => Math.random() < .08 ? 66.6 : 0.1],  // ðŸ‘€
  ];

  let tmInterval = null;
  function renderTaskmgr() {
    const body = document.getElementById("taskmgr-body");
    if (!body) return;
    const s = careerStats();
    const cpuTotal = Math.min(99, 8 + s.resolvedCount * 0.2 + Math.random() * 10);
    let rows = "";
    for (const [name, cpu] of FAKE_PROCS) {
      const c = cpu();
      rows += `<tr class="${name === "keeper.ps1" ? "tm-suspicious tm-keeper" : ""}">
        <td>${name}</td><td>${c.toFixed(1)}%</td>
        <td>${(20 + c * 3.7 + Math.random() * 30).toFixed(0)} MB</td>
        <td>${c > 80 ? "âš  High" : "Running"}</td></tr>`;
    }
    body.innerHTML = `
      <div class="tm-head">
        <div class="tm-cell"><div class="tm-big">${cpuTotal.toFixed(0)}%</div><div>CPU Â· SRV-DC01 load</div></div>
        <div class="tm-cell"><div class="tm-big">${s.resolvedCount}</div><div>tickets resolved</div></div>
        <div class="tm-cell"><div class="tm-big">${state.xp}</div><div>XP earned</div></div>
        <div class="tm-cell"><div class="tm-big">${rankTitle().split(" ")[0]}</div><div>current rank</div></div>
      </div>
      <table class="tm-table">
        <thead><tr><th>Process</th><th>CPU</th><th>Memory</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="tm-foot">ðŸ’¡ keeper.ps1 shows up sometimes. Nobody added it. <b>Click the keeper.ps1 row</b> to investigate. Or don't. Definitely don't.</div>`;

    const keeperRow = body.querySelector(".tm-keeper");
    if (keeperRow) {
      keeperRow.style.cursor = "pointer";
      keeperRow.title = "Something is off hereâ€¦ click to investigate";
      keeperRow.onclick = () => { if (typeof keeperClue === "function") keeperClue(); };
    }
  }

  /* ================= registry ================= */
  const APPS = {
    mail: {
      icon: "âœ‰ï¸", label: "Mail", title: "âœ‰ï¸ Mail â€” PIXL Corp Exchange",
      mount(body) { body.appendChild(document.getElementById("mail-list")); },
      onOpen() { renderMail(); },
    },
    helpdesk: {
      icon: "ðŸŽ«", label: "HelpDesk", title: "ðŸŽ« HelpDesk â€” Ticketing System",
      mount(body) { body.appendChild(document.getElementById("hd-content")); },
      onOpen() { renderTickets(); },
    },
    terminal: {
      icon: "â–¶_", label: "Terminal", title: "â–¶_ Terminal â€” SRV-DC01 (simulated)",
      mount(body) { body.appendChild(document.getElementById("terminal")); },
      onOpen() { if (inputEl) inputEl.focus(); },
    },
    explorer: {
      icon: "ðŸ“", label: "Files", title: "ðŸ“ File Explorer â€” SRV-DC01",
      mount(body) {
        const div = document.createElement("div");
        div.id = "explorer-body";
        body.appendChild(div);
        renderExplorer();
      },
    },
    training: {
      icon: "ðŸ“š", label: "Training", title: "ðŸ“š Training â€” SOP Binder",
      overlay: true,
      open() { binderOpen(); },
    },
    library: {
      icon: "ðŸ“–", label: "Library", title: "ðŸ“– IT Library â€” C:\\Books",
      mount(body) {
        const div = document.createElement("div");
        div.id = "library-body";
        body.appendChild(div);
        libraryRender();
      },
    },
    taskmgr: {
      icon: "ðŸ“Š", label: "Task Manager", title: "ðŸ“Š Task Manager â€” pixlcorp.local",
      mount(body) {
        const div = document.createElement("div");
        div.id = "taskmgr-body";
        body.appendChild(div);
        renderTaskmgr();
        if (!tmInterval) tmInterval = setInterval(() => {
          const el = document.getElementById("taskmgr-body");
          if (el && el.closest(".appwin")) renderTaskmgr();
        }, 4000);
      },
    },
    notepad: {
      icon: "ðŸ“„", label: "Notepad", title: "ðŸ“„ Notepad",
      mount(body) {
        const pre = document.createElement("pre");
        pre.id = "npad-text";
        pre.className = "npad-body";
        body.appendChild(pre);
      },
    },
    settings: {
      icon: "âš™ï¸", label: "Settings", title: "âš™ï¸ Settings",
      mount(body) {
        const div = document.createElement("div");
        div.id = "settings-body";
        body.appendChild(div);
        renderSettings();
      },
    },
  };

  return { APPS, renderMail, updateBadges, renderSettings, renderExplorer, renderTaskmgr };
})();

/* globÃ¡lny alias â€” os.js a ÄalÅ¡ie moduly ÄÃ­tajÃº APPS priamo */
var APPS = apps.APPS;

let expCwd = "C:\\";

/* ---------- notepad viewer (teraz ako okno, nie overlay) ---------- */
function npadShow(title, text) {
  os.openApp("notepad");
  os.setTitle("notepad", "ðŸ“„ " + title + " â€” Notepad");
  const pre = document.getElementById("npad-text");
  if (pre) pre.textContent = text;
  SFX.click();
}
