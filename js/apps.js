/* ===== TicketQuest — desktop applications (realistic fake OS apps) ===== */

/* flavor emails (not tickets) */
const FLAVOR_MAIL = [
  {
    from: "Zora <zora@pixlcorp.local>",
    subj: "Welcome to PIXL IT 🎉",
    body:
      "Hi! Before you touch anything: read the SOP Binder (Training app on the desktop).\n" +
      "Tickets arrive in the HelpDesk app. Fix them in the Terminal on SRV-DC01.\n" +
      "When you don't know something — that's normal. Look it up. That's the whole job.\n\n— Zora",
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
      "Stay curious. — IT Editorial Team",
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
    "2026-11-12 21:16  WARN   3 consecutive auth failures — service degraded",
  "keeper-trace.log":
    "--- keeper-trace.log ---\n" +
    "Every night at 23:00 an unnamed scheduled task runs keeper.ps1.\n" +
    "The full story unfolds in the Task Manager app — click the keeper.ps1 row. 👀",
  "day-one.docx":
    "(Binary .docx — Notepad shrugs. Some mysteries are for Microsoft Word only.)",
};

/* globálny filter HelpDesk queue (All / New / Mine / Done) */
let hdFilter = "all";

const apps = (() => {
  let seenInMail = new Set();
  let selectedMail = null; // položka z mailItems()

  function ticketMails() {
    return [...TICKETS, ...(state.dorisTickets || []), ...(state.grindTickets || [])]
      .filter((t) => ticketVisible(t) && !state.resolved.includes(t.id) && !state.escalated.includes(t.id));
  }

  /* ================= MAIL — Outlook-style (3 panes) ================= */
  /* bezpečnostný tréning v schránke: nahlás phishing alebo nechaj legit mail.
     Správne rozhodnutie = XP + dôvera, zlé = poučenie (nie trest). */
  const SEC_MAIL = [
    { id: "s1", minRank: 0, from: "IT Support <it-helpdesk@pixlcorp-support.com>", subj: "Your mailbox will be DELETED in 24 hours", time: "8:41 AM",
      body: "Dear user,\n\nYour mailbox has exceeded its quota. To avoid permanent deletion you must verify your password within 24 hours.\n\nIT Support Team",
      link: "Verify mailbox now", target: "http://pixlcorp-mail-verify.top/login", phish: true,
      why: "Phishing. Red flags: look-alike external domain (pixlcorp-support.com is not pixlcorp.local), urgency plus a threat, it asks for your password, and the link goes to a .top domain. Real IT never asks for your password." },
    { id: "s2", minRank: 0, from: "Zora <zora@pixlcorp.local>", subj: "Team lunch on Friday?", time: "9:20 AM",
      body: "Hi team, pizza on Friday at 12:30 in the kitchen. Reply if you're in. No pineapple discussions.\n\n— Zora", phish: false,
      why: "Legitimate. Internal sender on the real domain, no links, no attachments, no request for credentials, no pressure. Not every email is an attack — reporting everything also wastes the SOC's time." },
    { id: "s3", minRank: 1, from: "Jane White <jana@pixlcorp.local>", replyTo: "jane.white.accounting@gmail.com", subj: "Invoice 8841 — please open today", time: "10:05 AM",
      body: "Hi, please see the attached invoice and confirm the payment details today.\n\nThanks, Jane", attach: "Invoice_8841.pdf.exe", phish: true,
      why: "Phishing (likely a compromised or spoofed account). Red flags: the attachment ends in .pdf.exe (double extension = it's a program), the Reply-To points to a personal Gmail address, and the tone is generic and urgent." },
    { id: "s4", minRank: 1, from: "Zora <zora@pixlcorp.local>", subj: "Benefits portal opens Monday", time: "10:40 AM",
      body: "Reminder: the benefits portal opens Monday. As always, open it from the intranet start page — I'm deliberately not putting a link in this mail.\n\n— Zora", phish: false,
      why: "Legitimate. Internal sender, and the mail even tells you to use the bookmarked intranet page instead of a link — exactly the safe behaviour you want to teach users." },
    { id: "s5", minRank: 2, from: "Mr. Pixel <m.pixel.ceo@outlook.com>", subj: "Urgent & confidential — wire transfer", time: "11:12 AM",
      body: "I'm in a meeting and can't talk. I need you to process a payment of 18,400 EUR to a new supplier today. Do not discuss this with anyone. I will explain later.\n\nSent from my phone", phish: true,
      why: "Phishing (CEO fraud / BEC). Red flags: the boss writing from a free Outlook address, secrecy, urgency, a new payee, and 'can't talk'. Always verify payment requests through a second channel, e.g. a call to a known number." },
    { id: "s6", minRank: 2, from: "HR Portal <hr-noreply@pixlcorp.local>", subj: "Re-enroll your MFA — scan within 1 hour", time: "11:50 AM",
      body: "Our MFA system was upgraded. Scan the QR code below with your phone camera within 1 hour or your account will be locked.\n\n[ QR CODE ]", link: "[ QR code image ]", target: "https://pixlcorp-mfa-update.xyz/enroll", phish: true,
      why: "Phishing ('quishing'). Red flags: a QR code hides the destination URL (it opens a .xyz site), a one-hour deadline, and a threat of lockout. MFA changes are done by IT in person or via the official portal." },
    { id: "s7", minRank: 3, from: "Mail Gateway <noreply@pixlcorp.local>", subj: "Weekly quarantine digest: 3 messages blocked", time: "1:15 PM",
      body: "This week the gateway quarantined 3 messages (2 spam, 1 malware). No action is required. Details are in the SOC dashboard.", phish: false,
      why: "Legitimate. An automated internal digest with no links, no attachments and no action requested. Recognising normal noise is a core SOC skill." },
  ];

  function decidePhish(sec, saysPhish) {
    if (!state.mail.phish) state.mail.phish = {};
    if (state.mail.phish[sec.id]) return;
    const right = saysPhish === sec.phish;
    state.mail.phish[sec.id] = right ? "right" : "wrong";
    saveGame();
    if (typeof learn !== "undefined") learn.markSeen({ kind: "phishmail" });   // odomkne lekciu v Learn app
    if (right) { awardXp(15, "correct call on a suspicious email"); repAdd(2); SFX.ding(); }
    else {
      repAdd(-3); SFX.err();
      toast(sec.phish ? "🎣 That was phishing. Read why below — everyone misses one." : "🛡 That one was legitimate. Over-reporting costs the SOC time.", "t-warn");
    }
  }

  /* doplní čítaciu tablu bezpečnostného mailu: Reply-To, príloha, cieľ odkazu, rozhodnutie / verdikt */
  function decorateSec(read, sel) {
    const s = sel.sec;
    const rb = read.querySelector("#ol-reply"); if (rb) rb.remove();     // na phisher-a sa neodpisuje
    if (!state.mail.phish) state.mail.phish = {};
    const meta = [];
    if (s.replyTo) meta.push(`Reply-To: <b class="ol-warnmeta">${escHtml(s.replyTo)}</b>`);
    if (s.attach) meta.push(`📎 <b>${escHtml(s.attach)}</b>`);
    let html = "";
    if (meta.length) html += `<div class="ol-meta2">${meta.join(" · ")}</div>`;
    if (s.link) html += `<div class="ol-link"><span class="lnk-txt">${escHtml(s.link)}</span><small>hover: ${escHtml(s.target)}</small></div>`;
    const decided = state.mail.phish[s.id];
    if (!decided) {
      html += `<div class="ol-read-actions ol-decide"><button class="btn-call" data-decide="phish">🎣 Report as phishing</button><button class="btn-primary" data-decide="safe">✔ Looks legitimate</button></div>
        <div class="ol-hint">Think like the SOC: check the real sender domain, the link target, urgency and what is being asked of you.</div>`;
    } else {
      html += `<div class="ol-verdict ${decided}"><b>${decided === "right" ? "✔ Correct call" : "✘ Not quite"}</b><div>${escHtml(s.why)}</div>
        <button class="ol-act" data-open-learn="1">📘 Real-world lesson</button></div>`;
    }
    read.querySelector(".ol-read-body").insertAdjacentHTML("afterend", html);
    read.querySelectorAll("[data-decide]").forEach((b) => {
      b.onclick = () => { decidePhish(s, b.dataset.decide === "phish"); renderMail(); updateBadges(); };
    });
    const lb = read.querySelector("[data-open-learn]");
    if (lb) lb.onclick = () => { SFX.click(); os.openApp("learn"); };
  }

  let mailFolder = "inbox";   // inbox | flagged | sent | archive | deleted
  let replying = false;

  const mailSet = (k) => { if (!state.mail) state.mail = { flagged: [], archived: [], replied: [], replies: {}, read: [] }; return state.mail[k]; };
  const has = (k, key) => mailSet(k).includes(key);
  function toggleIn(k, key) {
    const arr = mailSet(k);
    const i = arr.indexOf(key);
    if (i >= 0) arr.splice(i, 1); else arr.push(key);
    saveGame();
  }

  /* všetky správy ako jednotný zoznam položiek */
  function mailItems() {
    const items = FLAVOR_MAIL.map((m, i) => ({
      key: "flavor:" + i, type: "flavor", i, from: m.from, subj: m.subj, body: m.body, time: m.time, name: m.from.split("<")[0].trim(),
    }));
    for (const t of ticketMails()) {
      if (!t || typeof t !== "object") continue;
      items.push({
        key: "ticket:" + t.id, type: "ticket", id: t.id, t,
        from: String(t.from ?? "Unknown sender"), name: String(t.from ?? "Unknown sender").split("<")[0].split(",")[0].trim(),
        subj: String(t.subject ?? ""), body: String(t.body ?? "").replaceAll("{PLAYER}", state.player.name || ""),
        time: "#" + (Number.isSafeInteger(t.id) ? t.id : "?"),
      });
    }
    const extra = state.mail && Array.isArray(state.mail.extra) ? state.mail.extra : [];
    for (const x of extra) {
      items.push({ key: "extra:" + x.id, type: "extra", from: x.from, subj: x.subj, body: x.body, time: x.time, name: String(x.from).split("<")[0].trim() });
    }
    for (const sc of SEC_MAIL) {
      if (sc.minRank > (state.rank || 0)) continue;
      items.push({ key: "sec:" + sc.id, type: "sec", sec: sc, from: sc.from, subj: sc.subj, body: sc.body, time: sc.time, name: sc.from.split("<")[0].trim() });
    }
    return items;
  }
  function sentItems() {
    return mailSet("replied").map((key) => {
      const [type, id] = key.split(":");
      let subj = "(reply)", to = "";
      if (type === "flavor" && FLAVOR_MAIL[+id]) { subj = "Re: " + FLAVOR_MAIL[+id].subj; to = FLAVOR_MAIL[+id].from.split("<")[0].trim(); }
      if (type === "extra" || type === "sec") { const it = mailItems().find((i) => i.key === key); if (it) { subj = "Re: " + it.subj; to = it.name; } }
      if (type === "ticket") { const t = findTicket(+id); if (t) { subj = "Re: #" + t.id + " " + t.subject; to = String(t.from).split("<")[0].split(",")[0].trim(); } }
      return { key: "sent:" + key, type: "sent", from: "You", name: "To: " + (to || "—"), subj, body: state.mail.replies[key] || "", time: "sent" };
    });
  }
  function folderItems() {
    const all = mailItems();
    if (mailFolder === "inbox") return all.filter((m) => !has("archived", m.key));
    if (mailFolder === "flagged") return all.filter((m) => has("flagged", m.key));
    if (mailFolder === "archive") return all.filter((m) => has("archived", m.key));
    if (mailFolder === "sent") return sentItems();
    return [];
  }
  const FOLDERS = [["inbox", "📥", "Inbox"], ["flagged", "🚩", "Flagged"], ["sent", "📤", "Sent"], ["archive", "🗂", "Archive"], ["deleted", "🗑", "Deleted"]];
  function folderCount(f) {
    const all = mailItems();
    if (f === "inbox") return all.filter((m) => !has("archived", m.key)).length;
    if (f === "flagged") return all.filter((m) => has("flagged", m.key)).length;
    if (f === "archive") return all.filter((m) => has("archived", m.key)).length;
    if (f === "sent") return mailSet("replied").length;
    return Math.min(state.resolved.length, 99);
  }

  function sendReply(item, text) {
    const g = typeof learn !== "undefined" ? learn.gradeReply(text) : { xp: 0, checks: [], leak: false, score: 0 };
    mailSet("replied").push(item.key);
    state.mail.replies[item.key] = String(text).slice(0, 600);
    if (g.xp > 0) { state.xp += g.xp; if (typeof renderTopbar === "function") renderTopbar(); }
    saveGame();
    SFX.ding();
    return g;
  }

  function renderMail() {
    const list = document.getElementById("mail-list");
    if (!list) return;
    const keepDraft = list.querySelector(".ol-reply-text")?.value;
    list.className = "outlook";
    list.innerHTML = "";

    /* --- folder rail --- */
    const rail = document.createElement("div");
    rail.className = "ol-rail";
    rail.innerHTML =
      `<div class="ol-account"><div class="ol-ava">${escHtml((state.player.name || "I").charAt(0).toUpperCase())}</div>
         <div><div class="ol-name">${escHtml(state.player.name) || "Intern"}</div><div class="ol-mail">you@pixlcorp.local</div></div>
       </div>` +
      FOLDERS.map(([id, ico, label]) =>
        `<div class="ol-folder${mailFolder === id ? " active" : ""}" data-folder="${id}" role="button" tabindex="0">${ico} <span>${label}</span><b>${folderCount(id)}</b></div>`).join("");
    rail.querySelectorAll(".ol-folder").forEach((f) => {
      const go = () => { mailFolder = f.dataset.folder; selectedMail = null; replying = false; SFX.click(); renderMail(); };
      f.onclick = go;
      f.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
    });
    list.appendChild(rail);

    /* --- message list --- */
    const items = folderItems();
    const msgList = document.createElement("div");
    msgList.className = "ol-list";
    const fname = FOLDERS.find((f) => f[0] === mailFolder);
    msgList.innerHTML = `<div class="ol-list-head">${fname[1]} ${fname[2]} — ${items.length}</div>`;
    const selKey = selectedMail ? selectedMail.key : null;
    if (!items.length) {
      msgList.insertAdjacentHTML("beforeend", `<div class="ol-empty-folder">${mailFolder === "deleted" ? "Resolved tickets are cleaned up automatically." : "Nothing here yet."}</div>`);
    }
    for (const m of items) {
      const el = document.createElement("div");
      const prio = m.type === "ticket" && ["HIGH", "NORMAL", "CRITICAL"].includes(m.t.priority) ? m.t.priority.toLowerCase() : "normal";
      const unread = (m.type === "ticket" && !seenInMail.has(m.id)) || ((m.type === "extra" || m.type === "sec") && !seenInMail.has(m.key));
      el.className = `ol-item ${m.type === "ticket" ? "ticket" : "flavor"}${selKey === m.key ? " sel" : ""}${unread ? " unread" : ""}`;
      el.innerHTML = `<div class="ol-ava mini${m.type === "ticket" ? " prio-" + prio : ""}">${m.type === "ticket" ? "🎫" : escHtml(m.name.charAt(0).toUpperCase())}</div>
        <div class="ol-item-main">
          <div class="ol-row1"><span class="ol-from">${has("flagged", m.key) ? "🚩 " : ""}${escHtml(m.name)}</span><span class="ol-time">${escHtml(m.time)}</span></div>
          <div class="ol-subj">${escHtml(m.subj)}</div>
          <div class="ol-snip">${escHtml(m.body.slice(0, 64))}…</div>
        </div>`;
      el.onclick = () => {
        selectedMail = m; replying = false;
        if (m.type === "ticket") seenInMail.add(m.id);
        else if (m.type === "extra" || m.type === "sec") seenInMail.add(m.key);
        SFX.click(); renderMail(); updateBadges();
      };
      msgList.appendChild(el);
    }
    list.appendChild(msgList);

    /* --- reading pane --- */
    const read = document.createElement("div");
    read.className = "ol-read";
    const sel = selectedMail && items.find((m) => m.key === selectedMail.key);
    if (sel) {
      const isTicket = sel.type === "ticket";
      const done = isTicket && (state.resolved.includes(sel.id) || state.escalated.includes(sel.id));
      const taken = isTicket && state.taken.includes(sel.id);
      const replied = has("replied", sel.key);
      const prio = isTicket && ["HIGH", "NORMAL", "CRITICAL"].includes(sel.t.priority) ? sel.t.priority : "NORMAL";
      const canAct = sel.type !== "sent";
      read.innerHTML = `<div class="ol-read-head">
          <div class="ol-read-subj">${isTicket ? "🎫 #" + escHtml(sel.id) + " — " : ""}${escHtml(sel.subj)}</div>
          <div class="ol-read-meta"><b>${escHtml(sel.from)}</b> · ${isTicket ? `<span class="prio ${prio.toLowerCase()}">${prio}</span>${Number.isFinite(sel.t.slaMin) && sel.t.slaMin > 0 ? ` · SLA ${sel.t.slaMin} min` : ""}` : escHtml(sel.time)}</div>
        </div>
        <div class="ol-read-body">${escHtml(sel.body)}</div>
        <div class="ol-read-actions">
          ${isTicket ? `<button id="ol-open" class="btn-primary">Open in HelpDesk →</button>` : ""}
          ${canAct ? `<button id="ol-reply" class="btn-secondary"${replied ? " disabled" : ""}>${replied ? "↩ Replied ✔" : "↩ Reply"}</button>
          <button id="ol-flag" class="btn-secondary">${has("flagged", sel.key) ? "🚩 Unflag" : "🚩 Flag"}</button>
          <button id="ol-arch" class="btn-secondary">${has("archived", sel.key) ? "📥 Move to Inbox" : "🗂 Archive"}</button>` : ""}
          ${done ? `<span class="ol-done">✔ handled</span>` : taken ? `<span class="ol-done">✋ assigned to you</span>` : ""}
        </div>
        <div class="ol-compose${replying ? "" : " hidden"}">
          <div class="ol-compose-tip">💡 A good reply: <b>greeting</b> · <b>what you did</b> · <b>what the user should do next</b>. Never write a password in an e-mail.</div>
          <textarea class="ol-reply-text" rows="5" placeholder="Hi ${escHtml(sel.name.split(" ")[0])}, I've checked the account and ... Please try again and let me know if it still fails."></textarea>
          <div class="ol-compose-row"><button id="ol-send" class="btn-primary">Send</button><button id="ol-cancel" class="btn-secondary">Cancel</button></div>
          <div class="ol-feedback" aria-live="polite"></div>
        </div>`;
      if (sel.type === "sec") decorateSec(read, sel);
      if (isTicket) read.querySelector("#ol-open").onclick = () => { SFX.click(); os.openApp("helpdesk"); showDetail(sel.id); };
      if (canAct) {
        read.querySelector("#ol-flag").onclick = () => { toggleIn("flagged", sel.key); SFX.click(); renderMail(); };
        read.querySelector("#ol-arch").onclick = () => { toggleIn("archived", sel.key); SFX.click(); selectedMail = null; renderMail(); };
        const replyBtn = read.querySelector("#ol-reply");
        if (replyBtn) replyBtn.onclick = () => { replying = true; SFX.click(); renderMail(); setTimeout(() => document.querySelector("#mail-list .ol-reply-text")?.focus(), 20); };
      }
      const box = read.querySelector(".ol-compose");
      const ta = read.querySelector(".ol-reply-text");
      if (keepDraft && replying) ta.value = keepDraft;
      read.querySelector("#ol-cancel").onclick = () => { replying = false; renderMail(); };
      read.querySelector("#ol-send").onclick = () => {
        if (ta.value.trim().length < 10) { box.querySelector(".ol-feedback").textContent = "Write at least a short message."; return; }
        const g = sendReply(sel, ta.value);
        const fb = box.querySelector(".ol-feedback");
        fb.innerHTML = g.checks.map((c) => `<div>${c.ok ? "✔" : "✘"} ${escHtml(c.label)}</div>`).join("") +
          (g.leak ? `<div class="ol-warn">⚠ Looks like you put a password in the e-mail. In real IT that is a security incident — send it by phone or a one-time link and force a change at next logon. 0 XP.</div>`
                  : `<div class="ol-gain">+${g.xp} XP for communication</div>`);
        box.querySelector("#ol-send").disabled = true;
        box.querySelector("#ol-cancel").textContent = "Close";
        const rb2 = read.querySelector("#ol-reply"); if (rb2) rb2.disabled = true;
      };
    } else {
      selectedMail = null;
      read.innerHTML = `<div class="ol-empty">
        <div class="ol-empty-ico">📭</div>
        <div>Select a message to read it here.</div>
        <div class="ol-empty-sub">Reply to users, flag what matters, archive what is done — like a real inbox.</div>
      </div>`;
    }
    list.appendChild(read);
  }

  function updateBadges() {
    const unseen = ticketMails().filter((t) => !seenInMail.has(t.id)).length +
      mailItems().filter((m) => (m.type === "extra" || m.type === "sec") && !seenInMail.has(m.key)).length;
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
      tp.textContent = open > 0 ? `🎫 TICKETS · ${open}` : "🎫 ALL DONE";
    }

    // keep the open mail window in sync with arriving tickets
    if (document.getElementById("mail-list").closest(".appwin") && !replying) {
      renderMail();
    }
  }

  /* ================= EXPLORER — Windows-style ================= */
  const EXP_NAV = [
    { ico: "🏠", label: "Home", path: "C:\\" },
    { ico: "📁", label: "Books", path: "C:\\Books" },
    { ico: "📁", label: "Reports", path: "C:\\Reports" },
    { ico: "📁", label: "IT-SOP", path: "C:\\IT-SOP" },
    { ico: "📁", label: "Logs", path: "C:\\Logs" },
    { ico: "👤", label: "My files", path: "C:\\Users\\admin" },
  ];
  const isRoot = (p) => /^[A-Z]:\\$/.test(p);
  const parentOf = (p) => { if (isRoot(p)) return p; const i = p.lastIndexOf("\\"); return i <= 2 ? p.slice(0, 3) : p.slice(0, i); };

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
      tab.innerHTML = `<span>📁</span><span class="exp-tab-name">${expTabName(t.path)}</span>` +
        `<button class="exp-tab-x" title="Close tab">✕</button>`;
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
    side.innerHTML = `<div class="exp-side-head">🗂 Quick access</div>`;
    for (const n of EXP_NAV) {
      const item = document.createElement("button");
      item.className = "exp-nav" + (expCwd === n.path ? " active" : "");
      item.innerHTML = `<span>${n.ico}</span> ${n.label}`;
      item.onclick = () => { expCwd = n.path; SFX.click(); renderExplorer(); };
      side.appendChild(item);
    }
    side.insertAdjacentHTML("beforeend",
      `<div class="exp-side-head">💾 This PC</div>
       <button class="exp-nav${expCwd.startsWith("C:") && isRoot(expCwd) ? " active" : ""}" data-drive="C:\\"><span>💿</span> C: (System)</button>
       <button class="exp-nav${expCwd.startsWith("D:") && isRoot(expCwd) ? " active" : ""}" data-drive="D:\\"><span>💾</span> D: (Data · logs &amp; evidence)</button>`);
    side.querySelectorAll("[data-drive]").forEach((b) => {
      b.onclick = () => { expCwd = b.dataset.drive; expTabs[expActive] = { path: expCwd }; SFX.click(); renderExplorer(); };
    });
    content.appendChild(side);

    const main = document.createElement("div");
    main.className = "exp-main";
    const crumbs = document.createElement("div");
    crumbs.className = "exp-toolbar";
    const drive = expCwd.slice(0, 3);
    crumbs.innerHTML = `<span class="exp-crumb">💻 ${drive}</span>${!isRoot(expCwd) ? ` ▸ <span class="exp-crumb">${escHtml(expCwd.slice(3))}</span>` : ""}
      <span class="exp-count">${(FS[expCwd] || []).length} items</span>`;
    crumbs.querySelector(".exp-crumb").onclick = () => { expCwd = drive; expTabs[expActive] = { path: expCwd }; renderExplorer(); SFX.click(); };
    main.appendChild(crumbs);

    const grid = document.createElement("div");
    grid.className = "exp-grid";
    if (!isRoot(expCwd)) {
      const up = document.createElement("div");
      up.className = "exp-item dir";
      up.innerHTML = `<div class="exp-glyph">↩️</div><span>..</span>`;
      up.onclick = () => { expCwd = parentOf(expCwd); expTabs[expActive] = { path: expCwd }; renderExplorer(); SFX.click(); };
      grid.appendChild(up);
    }

    for (const item of FS[expCwd] || []) {
      const child = isRoot(expCwd) ? expCwd + item : expCwd + "\\" + item;
      const isDir = !!FS[child] || ["Users", "Windows", "Desktop", "Documents"].includes(item);
      const el = document.createElement("div");
      el.className = "exp-item " + (isDir ? "dir" : "file");
      el.innerHTML = `<div class="exp-glyph">${isDir ? "📁" : item.endsWith(".book") ? "📘" : "📄"}</div><span>${item}</span>`;
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
    if (isRoot(path)) return path;
    return path.split("\\").filter(Boolean).pop() || path;
  }

  /* ================= SETTINGS — Windows-Settings style ================= */
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
        <button class="set-nav active" data-pane="system">🖥 <span>System</span></button>
        <button class="set-nav" data-pane="account">👤 <span>Account</span></button>
        <button class="set-nav" data-pane="about">ℹ <span>About</span></button>
      </div>
      <div class="set-main" id="set-pane"></div>`;

    const pane = b.querySelector("#set-pane");
    const active = b.querySelector(".set-nav.active")?.dataset.pane || "system";

    if (active === "system") {
      pane.innerHTML = `
        <h3 class="set-title">System</h3>
        <button class="set-row" id="set-chill">⏱ Chill Mode: <b>${state.chill ? "ON 🍃" : "OFF"}</b><span>SLA timers off — practice without pressure</span></button>
        <div class="set-row static set-vol"><div>🔊 Volume</div><input id="set-volume" class="vol-slider" type="range" min="0" max="100" step="5" value="${Math.round(SFX.getVolume() * 100)}" aria-label="Volume"></div>
        <button class="set-row" id="set-stats">📊 Career stats<span>Tickets, SLA, notes, skills</span></button>
        <button class="set-row" id="set-cv">📄 Export CV (.txt)<span>A real file you can show someone</span></button>
        <button class="set-row" id="set-export">💾 Export save (.json)<span>Backup your career to a file</span></button>
        <button class="set-row" id="set-import">📂 Import save<span>Load a ticketquest-save.json backup</span></button>
        <button class="set-row" id="set-quiz">🎓 A+ certification<span>${state.quiz.aplus ? "Passed ✔" : "Unlocks after the Tier 1 review"}</span></button>
        <button class="set-row danger" id="set-reset">☠ Reset save<span>Wipes everything. Doris will not remember you.</span></button>
        <input type="file" id="set-import-file" accept=".json,application/json" class="hidden">`;
      pane.querySelector("#set-chill").onclick = () => { toggleChill(); renderSettings(); };
      pane.querySelector("#set-volume").oninput = (e) => SFX.setVolume(e.target.value / 100);
      pane.querySelector("#set-volume").onchange = () => SFX.click();
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
        if (state.quiz.aplus) { toast("🎓 You already passed the A+ exam. Show-off.", "t-ok"); return; }
        const eligible = state.rank >= 1 && state.reviewDone;
        if (eligible) quizOpen("aplus");
        else toast("🎓 The A+ exam unlocks after your Tier 1 performance review.", "t-warn");
      };
      pane.querySelector("#set-reset").onclick = () => {
        if (confirm("Really delete your save? All tickets, XP and story progress will be gone.")) {
          localStorage.removeItem(SAVE_KEY);
          location.reload();
        }
      };
    } else if (active === "account") {
      pane.innerHTML = `
        <h3 class="set-title">Your account</h3>
        <div class="set-row static"><div>👤 Name</div><span>${escHtml(state.player.name) || "—"}</span></div>
        <div class="set-row static"><div>🔑 Login</div><span>${escHtml(state.player.login || "—")}@PIXLCORP</span></div>
        <div class="set-row static"><div>💼 Position</div><span>${rankTitle()}</span></div>
        <div class="set-row static"><div>💰 Salary</div><span>${RANKS[rankIndex()].salary > 0 ? "$" + RANKS[rankIndex()].salary + "/mo" : "intern (unpaid)"}</span></div>
        <div class="set-row static"><div>⭐ XP</div><span>${state.xp} XP</span></div>`;
    } else {
      pane.innerHTML = `
        <h3 class="set-title">About this PC</h3>
        <div class="set-row static"><div>🖥 Device name</div><span>WKS-IT-3F</span></div>
        <div class="set-row static"><div>🧠 OS</div><span>TicketOS 3.0 (simulated)</span></div>
        <div class="set-row static"><div>🗄 Domain</div><span>pixlcorp.local</span></div>
        <div class="set-row static"><div>🌐 Internet</div><span>Not required — everything runs offline</span></div>
        <div class="set-row static"><div>💾 Save</div><span>Automatic · localStorage</span></div>
        <div class="set-row static"><div>🎮 Version</div><span>TicketQuest v0.4</span></div>`;
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
    ["keeper.ps1", () => Math.random() < .08 ? 66.6 : 0.1],  // 👀
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
        <td>${c > 80 ? "⚠ High" : "Running"}</td></tr>`;
    }
    body.innerHTML = `
      <div class="tm-head">
        <div class="tm-cell"><div class="tm-big">${cpuTotal.toFixed(0)}%</div><div>CPU · SRV-DC01 load</div></div>
        <div class="tm-cell"><div class="tm-big">${s.resolvedCount}</div><div>tickets resolved</div></div>
        <div class="tm-cell"><div class="tm-big">${state.xp}</div><div>XP earned</div></div>
        <div class="tm-cell"><div class="tm-big">${rankTitle().split(" ")[0]}</div><div>current rank</div></div>
      </div>
      <table class="tm-table">
        <thead><tr><th>Process</th><th>CPU</th><th>Memory</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="tm-foot">💡 keeper.ps1 shows up sometimes. Nobody added it. <b>Click the keeper.ps1 row</b> to investigate. Or don't. Definitely don't.</div>`;

    const keeperRow = body.querySelector(".tm-keeper");
    if (keeperRow) {
      keeperRow.style.cursor = "pointer";
      keeperRow.title = "Something is off here… click to investigate";
      keeperRow.onclick = () => { if (typeof keeperClue === "function") keeperClue(); };
    }
  }

  /* ================= registry ================= */
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
      icon: "📚", label: "Training", title: "📚 Training — SOP Binder",
      overlay: true,
      open() { binderOpen(); },
    },
    learn: {
      icon: "🎓", label: "Learn", title: "🎓 Learn — IT in the real world",
      mount(body) { learn.mountApp(body); },
      onOpen() { const b = document.querySelector('.appwin[data-app="learn"] .appwin-body'); if (b && b._learnRender) b._learnRender(); },
    },
    library: {
      icon: "📖", label: "Library", title: "📖 IT Library — C:\\Books",
      mount(body) {
        const div = document.createElement("div");
        div.id = "library-body";
        body.appendChild(div);
        libraryRender();
      },
    },
    taskmgr: {
      icon: "📊", label: "Task Manager", title: "📊 Task Manager — pixlcorp.local",
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
      icon: "📄", label: "Notepad", title: "📄 Notepad",
      mount(body) {
        const pre = document.createElement("pre");
        pre.id = "npad-text";
        pre.className = "npad-body";
        body.appendChild(pre);
      },
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

  return { APPS, renderMail, updateBadges, renderSettings, renderExplorer, renderTaskmgr };
})();

/* globálny alias — os.js a ďalšie moduly čítajú APPS priamo */
var APPS = apps.APPS;

let expCwd = "C:\\";

/* ---------- notepad viewer (teraz ako okno, nie overlay) ---------- */
function npadShow(title, text) {
  os.openApp("notepad");
  os.noteRecent({ type: "file", name: title });
  if (typeof evidenceRead === "function") evidenceRead(title);
  os.setTitle("notepad", "📄 " + title + " — Notepad");
  const pre = document.getElementById("npad-text");
  if (pre) pre.textContent = text;
  SFX.click();
}
