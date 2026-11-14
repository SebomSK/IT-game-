/* ===== TicketQuest — SOP Binder / Training Portal (curriculum) ===== */

/* The book = phases → chapters. A chapter is complete when its tickets are done. */
const CURRICULUM = [
  {
    phase: "PHASE 0 — How tickets work",
    chapters: [
      {
        title: "The life cycle of a ticket",
        content: [
          "A ticket isn't just a 'request'. It has a life cycle:",
          "1. NEW → someone reported a problem",
          "2. ASSIGNED → you took it (assign to me)",
          "3. IN PROGRESS → you're working on it in the terminal",
          "4. RESOLVED → resolve + a NOTE of what you did",
          "",
          "A professional never closes a ticket without a resolution note.",
          "In the game: click the ticket → TAKE → solve in the terminal → resolve.",
        ],
        tickets: [],
      },
    ],
  },
  {
    phase: "PHASE 0.5 — First aid for accounts (Intern)",
    chapters: [
      {
        title: "Unlock a locked account",
        content: [
          "An account locks after X failed logons (e.g. a forgotten password).",
          "",
          "Server procedure:",
          "  net user doris          → check status (Account active: No = locked)",
          "  net user doris /active:yes → unlock it",
          "",
          "Real-world practice: never close a ticket without a password reset —",
          "the user doesn't remember the old one (and even if so, 'nobody has seen it').",
        ],
        tickets: [1042],
      },
      {
        title: "Reset a user password",
        content: [
          "Password reset = basic helpdesk hygiene.",
          "",
          "  net user doris Welcome2026!   → sets the new password",
          "",
          "Rules from real life:",
          "  · minimum length (8+ characters here)",
          "  · NEVER send the OLD password — only the new one",
          "  · temporary password + 'change it at first logon'",
          "",
          "Bonus knowledge: locked account + reset = about 40% of all T1 tickets.",
        ],
        tickets: [1042],
      },
      {
        title: "Windows services (e.g. printing)",
        content: [
          "Many 'it doesn't work' issues are just stopped services.",
          "",
          "  get-service spooler      → service status",
          "  start-service spooler    → start it",
          "",
          "Print Spooler = printing. If it's down, printers are 'dead' —",
          "and 9 out of 10 people blame the printer. You know better. 😉",
        ],
        tickets: [1043],
      },
      {
        title: "Networking: DHCP, APIPA and ping",
        content: [
          "IP starts with 169.254.x.x? That's APIPA — the PC didn't get an address from DHCP.",
          "",
          "  ipconfig        → look at the configuration",
          "  ipconfig /renew → ask for a new address",
          "  ping 8.8.8.8    → verify connectivity",
          "",
          "Reality: 80% of 'the internet is down' is a local problem, not the internet.",
        ],
        tickets: [1045],
      },
      {
        title: "Security logs and brute-force",
        content: [
          "Event 4625 = failed logon. Thirty of them in an hour from one IP = brute-force.",
          "",
          "  eventlog security        → read the log",
          "  block-ip 10.0.13.66      → block the attacker in the firewall",
          "",
          "In the SOC world this is called TRIAGE: see → read → decide → document.",
        ],
        tickets: [1044],
      },
    ],
  },
  {
    phase: "PHASE 1 — Helpdesk Tier 1 (on-the-job course)",
    chapters: [
      {
        title: "Employee onboarding",
        content: [
          "A new person joining = account + groups + workstation.",
          "",
          "  net user petra.nova Start123! /add       → create the account",
          "  net group Marketing petra.nova /add      → add to the group",
          "",
          "Groups > individual permissions. Always. (More in the icacls chapter.)",
        ],
        tickets: [1101],
      },
      {
        title: "NTFS permissions (icacls)",
        content: [
          "'Access denied' on a shared drive = permissions, not a 'broken disk'.",
          "",
          "  icacls D:\\Shares\\Finance                 → view the ACL",
          "  icacls D:\\Shares\\Finance /grant marek:R  → grant Read",
          "",
          "Permissions: R = read, M = read+write, F = full control.",
          "Never grant F when R is enough. Principle of least privilege!",
        ],
        tickets: [1102],
      },
      {
        title: "Mailboxes and quotas",
        content: [
          "Mailbox full = mail stops. T1 handles it with the quota.",
          "",
          "  get-mailbox marek     → status (used / quota)",
          "  set-mailbox marek 100 → raise the quota",
          "",
          "Reality: before raising the quota, think — maybe they should really",
          "clean the mailbox. But business is waiting, so... raise it. 😅",
        ],
        tickets: [1103],
      },
      {
        title: "VPN and RADIUS",
        content: [
          "VPN timeout in the log? Try the service, not 'restart the internet'.",
          "",
          "  type C:\\Logs\\vpn.log   → read the errors (RADIUS timeout)",
          "  get-service ias        → IAS = the RADIUS service",
          "  start-service ias      → start it",
          "",
          "Lesson: the log always tells you more than the user. Logs don't lie.",
        ],
        tickets: [1104],
      },
      {
        title: "Offboarding (a safe departure)",
        content: [
          "A departing employee = 3 steps, and you can't skip any of them:",
          "",
          "  net user pavel /active:no               → disable the account",
          "  robocopy C:\\Users\\pavel D:\\Departed\\pavel /E  → back up the data",
          "  net group Helpdesk pavel /remove        → remove from groups",
          "",
          "Forgetting to disable the account = security incident #1 at companies.",
        ],
        tickets: [1105],
      },
      {
        title: "PC build & domain (WDS)",
        content: [
          "A new workstation doesn't come out of the box ready:",
          "",
          "  wds-deploy WKS-114    → deploy the image via WDS",
          "  add-computer WKS-114  → join the domain",
          "",
          "Domain = the PC knows the server and can log in with a company account.",
        ],
        tickets: [1106],
      },
      {
        title: "Phone diagnostics (the soft skill)",
        content: [
          "Users never tell you everything at once. 'The PC doesn't work' says nothing.",
          "",
          "Good questions narrow the problem down:",
          "  · 'What exactly happens when you press power?'",
          "  · 'Do you hear the fans? Is the screen black or dark-gray?'",
          "  · 'Did anything change before it broke?'",
          "",
          "Bad questions ('did you restart it?') make you look lazy and waste time.",
          "Diagnosis is 90% of the job. The fix is the easy part.",
        ],
        tickets: [1107],
      },
    ],
  },
  {
    phase: "PHASE 2 — Desktop Support T2 (coming soon...)",
    chapters: [
      {
        title: "🔒 PowerShell & automation",
        content: ["This chapter unlocks in Phase 2 of the game's development."],
        tickets: [],
        locked: true,
      },
      {
        title: "🔒 Linux — PIX Labs",
        content: ["This chapter unlocks in Phase 3 of the game's development."],
        tickets: [],
        locked: true,
      },
      {
        title: "🔒 SOC — SIEM and phishing",
        content: ["This chapter unlocks in Phase 3 of the game's development."],
        tickets: [],
        locked: true,
      },
    ],
  },
];

/* binder state (book download) */
function binderInit() {
  if (!state.binder) state.binder = { downloaded: false };
}

function binderChapterDone(ch) {
  if (!ch.tickets || ch.tickets.length === 0) return false;
  return ch.tickets.every((id) => state.resolved.includes(id) || state.escalated.includes(id));
}

function binderChapterProgress(ch) {
  if (!ch.tickets || ch.tickets.length === 0) return null;
  const done = ch.tickets.filter((id) => state.resolved.includes(id) || state.escalated.includes(id)).length;
  return { done, total: ch.tickets.length };
}

/* binder UI */
function binderOpen() {
  binderInit();
  const overlay = document.getElementById("binder-overlay");
  const body = document.getElementById("binder-body");
  const dl = document.getElementById("binder-download");

  if (!state.binder.downloaded) {
    body.classList.add("hidden");
    dl.classList.remove("hidden");
  } else {
    dl.classList.add("hidden");
    body.classList.remove("hidden");
    binderRenderChapters();
  }
  overlay.classList.remove("hidden");
}

function binderDownload() {
  state.binder.downloaded = true;
  saveGame();
  binderOpen();
  if (typeof termPrint === "function" && termEl) {
    termPrint("[TRAINING] SOP book downloaded from the intranet. 📚", "t-ok");
  }
}

function binderRenderChapters() {
  const body = document.getElementById("binder-body");
  body.innerHTML = "";
  for (const phase of CURRICULUM) {
    const ph = document.createElement("div");
    ph.className = "binder-phase";
    ph.textContent = phase.phase;
    body.appendChild(ph);
    for (const ch of phase.chapters) {
      const el = document.createElement("div");
      const done = binderChapterDone(ch);
      const prog = binderChapterProgress(ch);
      const lock = ch.locked;
      el.className = "binder-ch" + (done ? " done" : "") + (lock ? " locked" : "");
      el.innerHTML = `
        <span class="binder-check">${lock ? "🔒" : done ? "✅" : "⬜"}</span>
        <span class="binder-title">${ch.title}</span>
        ${prog && !done ? `<span class="binder-prog">${prog.done}/${prog.total} tickets</span>` : ""}`;
      el.onclick = () => binderShowChapter(ch);
      body.appendChild(el);
    }
  }
}

function binderShowChapter(ch) {
  if (ch.locked) return;
  const body = document.getElementById("binder-body");
  const reader = document.createElement("div");
  reader.className = "binder-reader";
  reader.innerHTML = `
    <div class="binder-reader-title">${ch.title}</div>
    ${ch.content.map((l) => `<div class="binder-line">${l.replace(/</g, "&lt;")}</div>`).join("")}
    <div class="binder-extras"></div>
    <button class="btn-secondary binder-back">← BACK TO CONTENTS</button>`;
  reader.querySelector(".binder-back").onclick = binderOpen;
  /* kvíz + replay sa odomknú po dokončení kapitoly (chapters.js) */
  const extra = typeof chapterExtras === "function" ? chapterExtras(ch) : null;
  if (extra) {
    const box = reader.querySelector(".binder-extras");
    if (binderChapterDone(ch)) {
      const best = (state.chapterQuiz && state.chapterQuiz[extra.key]) || 0;
      box.innerHTML = `<button class="btn-primary binder-cq">🎓 Chapter check (3 questions)${best ? ` — best ${best}/3` : ""}</button>` +
        (extra.replay ? ` <button class="btn-secondary binder-replay">🔁 Replay lab — same skill, different fault</button>` : "");
      box.querySelector(".binder-cq").onclick = () => chapterQuizOpen(ch, () => binderShowChapter(ch));
      const rp = box.querySelector(".binder-replay");
      if (rp) rp.onclick = () => chapterReplayRun(ch);
    } else {
      box.innerHTML = `<div class="binder-locked-note">🔒 Finish this chapter's ticket to unlock the chapter check and the replay lab.</div>`;
    }
  }
  body.innerHTML = "";
  body.appendChild(reader);
}
