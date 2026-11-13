/* ===== TicketQuest — desktop applications (fake OS apps) ===== */

/* flavor emails (not tickets) */
const FLAVOR_MAIL = [
  {
    from: "Zora <zora@pixlcorp.local>",
    subj: "Welcome to PIXL IT 🎉",
    body:
      "Hi! Before you touch anything: read the SOP Binder (Training app on the desktop).\n" +
      "Tickets arrive in the HelpDesk app. Fix them in the Terminal on SRV-DC01.\n" +
      "When you don't know something — that's normal. Look it up. That's the whole job.\n\n— Zora",
  },
  {
    from: "Mr. Pixel <pixel@pixlcorp.local>",
    subj: "(no subject)",
    body: "(empty email). Classic.",
  },
  {
    from: "IT Newsletter <noreply@pixlcorp.local>",
    subj: "This week in IT: the spooler strikes again",
    body:
      "Top 3 causes of 'the internet is broken':\n" +
      "1. It's not the internet.\n" +
      "2. It's a stopped service.\n" +
      "3. Someone unplugged the thing.\n" +
      "Stay curious. — IT Editorial Team",
  },
  {
    from: "Doris Pemberton <doris@pixlcorp.local>",
    subj: "Quick question (not urgent) (urgent)",
    body: "Hi! How do I attach a file to an email? Asking for a friend. The friend is me.",
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
    "2026-11-12 21:16  WARN   3 consecutive auth failures — service degraded",
  "day-one.docx":
    "(Binary .docx — Notepad shrugs. Some mysteries are for Microsoft Word only.)",
};

const apps = (() => {
  let seenInMail = new Set();

  function ticketMails() {
    return [...TICKETS, ...(state.dorisTickets || [])]
      .filter((t) => ticketVisible(t) && !state.resolved.includes(t.id) && !state.escalated.includes(t.id));
  }

  /* ---------- Mail ---------- */
  function renderMail() {
    const list = document.getElementById("mail-list");
    if (!list) return;
    list.innerHTML = "";

    FLAVOR_MAIL.forEach((m) => {
      const el = document.createElement("div");
      el.className = "mail-item flavor";
      el.innerHTML = `<div class="mi-head"><span class="mi-from">${m.from}</span></div>
        <div class="mi-subj">${m.subj}</div>`;
      el.onclick = () => {
        el.classList.add("open");
        npadShow(m.subj, `${m.from}\n\n${m.body}`);
      };
      list.appendChild(el);
    });

    const tickets = ticketMails();
    if (tickets.length) {
      const h = document.createElement("div");
      h.className = "mail-section";
      h.textContent = "🎫 Support queue (ticket mail)";
      list.appendChild(h);
    }
    tickets.forEach((t) => {
      const el = document.createElement("div");
      el.className = "mail-item ticket";
      el.innerHTML = `<div class="mi-head"><span class="mi-from">${t.from}</span>
        <span class="ticket-id">#${t.id}</span></div>
        <div class="mi-subj">${t.subject}</div>`;
      el.onclick = () => {
        seenInMail.add(t.id);
        updateBadges();
        SFX.click();
        os.openApp("helpdesk");
        showDetail(t.id);
      };
      list.appendChild(el);
    });

    if (!tickets.length) {
      const e = document.createElement("div");
      e.className = "mail-empty";
      e.textContent = "No ticket mail right now. Enjoy it. It won't last. 😌";
      list.appendChild(e);
    }
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

    // keep the open mail window in sync with arriving tickets
    if (document.getElementById("mail-list").parentElement.closest(".appwin")) {
      renderMail();
    }
  }

  /* ---------- Explorer (files) ---------- */
  let expCwd = "C:\\";
  function renderExplorer() {
    const body = document.getElementById("explorer-body");
    if (!body) return;
    body.innerHTML = "";

    const crumbs = document.createElement("div");
    crumbs.className = "exp-crumbs";
    crumbs.innerHTML = `<span class="exp-crumb">💻 C:\\</span>${expCwd !== "C:\\" ? ` ▸ <span class="exp-crumb">${expCwd}</span>` : ""}`;
    crumbs.querySelector(".exp-crumb").onclick = () => { expCwd = "C:\\"; renderExplorer(); };
    body.appendChild(crumbs);

    const grid = document.createElement("div");
    grid.className = "exp-grid";

    // parent dir
    if (expCwd !== "C:\\") {
      const up = document.createElement("div");
      up.className = "exp-item dir";
      up.innerHTML = `<div class="exp-glyph">↩️</div><span>..</span>`;
      up.onclick = () => { expCwd = "C:\\"; renderExplorer(); SFX.click(); };
      grid.appendChild(up);
    }

    for (const item of FS[expCwd] || []) {
      const child = expCwd === "C:\\" ? "C:\\" + item : expCwd + "\\" + item;
      const isDir = !!FS[child] || ["Users", "Windows", "Desktop", "Documents"].includes(item);
      const el = document.createElement("div");
      el.className = "exp-item " + (isDir ? "dir" : "file");
      el.innerHTML = `<div class="exp-glyph">${isDir ? "📁" : "📄"}</div><span>${item}</span>`;
      el.onclick = () => {
        SFX.click();
        if (isDir) {
          if (FS[child]) expCwd = child;
          else if (child === "C:\\Users") expCwd = "C:\\Users\\admin";
          else if (child === "C:\\Windows") {
            npadShow("C:\\Windows", "System32.\n\nHands off. 🙂");
            return;
          } else {
            npadShow(item, "(Access denied. Corporate policy says hello.)");
            return;
          }
          renderExplorer();
        } else {
          npadShow(item, FILE_TEXT[item] || "(empty file)");
        }
      };
      grid.appendChild(el);
    }
    body.appendChild(grid);
  }

  /* ---------- Settings ---------- */
  function renderSettings() {
    const b = document.getElementById("settings-body");
    b.innerHTML = `
      <div class="set-user">
        <div class="set-user-name">${state.player.name || "Player"}</div>
        <div class="set-user-role">${RANKS[rankIndex()].name} @ PIXL Corp</div>
      </div>
      <button class="set-row" id="set-chill">⏱ Chill Mode: <b>${state.chill ? "ON 🍃" : "OFF"}</b><span>SLA timers off — practice without pressure</span></button>
      <button class="set-row" id="set-stats">📊 Career stats<span>Tickets, SLA, notes, skills</span></button>
      <button class="set-row" id="set-cv">📄 Export CV (.txt)<span>A real file you can show someone</span></button>
      <button class="set-row" id="set-quiz">🎓 A+ certification<span>${state.quiz.aplus ? "Passed ✔" : "Unlocks after the Tier 1 review"}</span></button>
      <button class="set-row danger" id="set-reset">☠ Reset save<span>Wipes everything. Doris will not remember you.</span></button>`;

    b.querySelector("#set-chill").onclick = () => { toggleChill(); renderSettings(); };
    b.querySelector("#set-stats").onclick = () => statsOpen();
    b.querySelector("#set-cv").onclick = () => cvDownload();
    b.querySelector("#set-quiz").onclick = () => {
      if (state.quiz.aplus) { toast("🎓 You already passed the A+ exam. Show-off.", "t-ok"); return; }
      const eligible = state.rank >= 1 && state.reviewDone;
      if (eligible) quizOpen("aplus");
      else toast("🎓 The A+ exam unlocks after your Tier 1 performance review.", "t-warn");
    };
    b.querySelector("#set-reset").onclick = () => {
      if (confirm("Really delete your save? All tickets, XP and story progress will be gone.")) {
        localStorage.clear();
        location.reload();
      }
    };
  }

  /* ---------- the registry ---------- */
  const APPS = {
    mail: {
      icon: "✉️", label: "Mail", title: "✉️ Mail — PIXL Corp Exchange",
      mount(body) { body.appendChild(document.getElementById("mail-list")); },
      onOpen() { renderMail(); },
    },
    helpdesk: {
      icon: "🎫", label: "HelpDesk", title: "🎫 HelpDesk — Ticketing System",
      mount(body) { body.appendChild(document.getElementById("hd-content")); },
      onOpen() { renderTickets(); },
    },
    terminal: {
      icon: "▶_", label: "Terminal", title: "▶_ Terminal — SRV-DC01 (simulated)",
      mount(body) { body.appendChild(document.getElementById("terminal")); },
      onOpen() { if (inputEl) inputEl.focus(); },
    },
    explorer: {
      icon: "📁", label: "Files", title: "📁 File Explorer — SRV-DC01",
      mount(body) {
        const div = document.createElement("div");
        div.id = "explorer-body";
        body.appendChild(div);
        renderExplorer();
      },
    },
    training: {
      icon: "📚", label: "Training", title: "📚 Training",
      overlay: true,
      open() { binderOpen(); },
    },
    settings: {
      icon: "⚙️", label: "Settings", title: "⚙️ Settings",
      mount(body) {
        const div = document.createElement("div");
        div.id = "settings-body";
        body.appendChild(div);
        renderSettings();
      },
    },
  };

  return { APPS, renderMail, updateBadges, renderSettings, renderExplorer };
})();

/* ---------- notepad viewer ---------- */
function npadShow(title, text) {
  document.getElementById("npad-title").textContent = title;
  document.getElementById("npad-body").textContent = text;
  document.getElementById("npad-overlay").classList.remove("hidden");
  SFX.click();
}
