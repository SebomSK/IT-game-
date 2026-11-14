/* ===== TicketQuest — kvíz po kapitole + „replay“ ticketu s inou chybou ===== */
/* Po dokončení kapitoly v SOP Binderi sa objaví:
     🎓 krátky kvíz (3 otázky, odpovede sa miešajú, +XP raz za kapitolu)
     🔁 replay lab — nový ticket rovnakého druhu s INÝMI parametrami (iný používateľ / služba / IP),
        takže sa postup nedá vyriešiť naspamäť.                                                   */

const CHAPTER_EXTRAS = {
  "Unlock a locked account": {
    key: "c1", replay: "lockout",
    quiz: [
      { q: "A user says their account is locked. Which command shows the account state?", a: ["net user <name>", "ipconfig /all", "get-service spooler"], c: 0 },
      { q: "Unlocking an account is not enough on its own. What should you also do per the SOP?", a: ["Set a temporary password", "Reboot the domain controller", "Delete the user"], c: 0 },
      { q: "Why do you check the logs before blindly unlocking a repeatedly locked account?", a: ["It may be an attack, not a forgotten password", "Logs make the unlock faster", "It is required by Windows"], c: 0 },
    ],
  },
  "Reset a user password": {
    key: "c2", replay: "lockout",
    quiz: [
      { q: "Which password handling is correct?", a: ["Set a new temporary one, never share the old one", "Send the old password by email", "Reuse the same password for everyone"], c: 0 },
      { q: "Minimum sensible password length in this company's SOP is…", a: ["8 characters or more", "3 characters", "No minimum"], c: 0 },
      { q: "Before resetting a password over the phone you should…", a: ["Verify the caller's identity", "Just do it, they sound nice", "Ask them to email the old password"], c: 0 },
    ],
  },
  "Windows services (e.g. printing)": {
    key: "c3", replay: "service",
    quiz: [
      { q: "Which service handles print queues?", a: ["Print Spooler", "DNS Client", "Netlogon"], c: 0 },
      { q: "A service shows STOPPED. What is the first fix?", a: ["Start the service and verify it stays RUNNING", "Reinstall Windows", "Ask the user to buy a new printer"], c: 0 },
      { q: "Which cmdlet lists the state of a service?", a: ["Get-Service", "Get-Help", "Get-Date"], c: 0 },
    ],
  },
  "Networking: DHCP, APIPA and ping": {
    key: "c4", replay: "dhcp",
    quiz: [
      { q: "An IP starting with 169.254 means…", a: ["The PC found no DHCP server (APIPA)", "The PC is on the internet directly", "The network is perfectly fine"], c: 0 },
      { q: "Which command asks DHCP for a fresh address?", a: ["ipconfig /renew", "ping 127.0.0.1", "net user"], c: 0 },
      { q: "Pinging 8.8.8.8 works but a website name does not. What is the likely culprit?", a: ["DNS", "The monitor", "The keyboard"], c: 0 },
    ],
  },
  "Security logs and brute-force": {
    key: "c5", replay: "bruteforce",
    quiz: [
      { q: "Windows event 4625 means…", a: ["A failed logon", "A clean shutdown", "A new printer"], c: 0 },
      { q: "Dozens of failed logons from ONE IP in minutes look like…", a: ["A brute-force attack", "Normal Monday traffic", "A backup job"], c: 0 },
      { q: "The first containment step against the attacking IP is…", a: ["Block it in the firewall", "Email the attacker", "Disable all accounts"], c: 0 },
    ],
  },
  "Employee onboarding": {
    key: "c6", replay: "onboard",
    quiz: [
      { q: "Onboarding a new hire means creating the account and…", a: ["Adding them to the right group", "Giving them the administrator password", "Skipping the temp password"], c: 0 },
      { q: "Why use groups instead of per-user permissions?", a: ["Easier to manage and audit", "Groups are faster to type", "Users dislike groups"], c: 0 },
      { q: "A new account's first password should be…", a: ["Temporary and changed at first logon", "The same as the username", "Permanent"], c: 0 },
    ],
  },
  "NTFS permissions (icacls)": {
    key: "c7", replay: "share",
    quiz: [
      { q: "NTFS 'Read' permission lets a user…", a: ["Open files but not change them", "Change and delete files", "Take ownership"], c: 0 },
      { q: "Principle of least privilege means…", a: ["Give only the access that is needed", "Give everyone full control", "Remove all access"], c: 0 },
      { q: "Which tool shows and changes ACLs from the command line?", a: ["icacls", "ping", "nslookup"], c: 0 },
    ],
  },
  "Mailboxes and quotas": {
    key: "c8", replay: "mailbox",
    quiz: [
      { q: "A user cannot receive mail and their mailbox is at 100% of quota. Fix?", a: ["Raise the quota or clean up the mailbox", "Reset their password", "Reboot the router"], c: 0 },
      { q: "Raising a quota should always be…", a: ["A deliberate, documented decision", "Unlimited by default", "Done silently, no note"], c: 0 },
      { q: "Which cmdlet changes a mailbox quota?", a: ["Set-Mailbox", "Get-Process", "Start-Service"], c: 0 },
    ],
  },
  "VPN and RADIUS": {
    key: "c9", replay: "service",
    quiz: [
      { q: "VPN logins time out and the log says RADIUS not responding. What is the first check?", a: ["Is the IAS/NPS service running?", "The user's wallpaper", "The coffee machine"], c: 0 },
      { q: "RADIUS is used for…", a: ["Centralised authentication of network access", "Printing", "Disk defragmentation"], c: 0 },
      { q: "After starting a stopped service you should…", a: ["Verify it works and write a note", "Close the ticket without testing", "Disable it again"], c: 0 },
    ],
  },
  "Offboarding (a safe departure)": {
    key: "c10", replay: "offboard",
    quiz: [
      { q: "A colleague leaves the company. What happens to their data first?", a: ["It is archived before the account is disabled", "It is deleted immediately", "It stays on their laptop"], c: 0 },
      { q: "A leaver's account should be…", a: ["Disabled promptly", "Kept active for a year", "Shared with the team"], c: 0 },
      { q: "Why disable instead of delete right away?", a: ["It can be audited or restored if needed", "Deleting is impossible", "Disabled accounts cost more"], c: 0 },
    ],
  },
  "PC build & domain (WDS)": {
    key: "c11", replay: "deploy",
    quiz: [
      { q: "WDS is used to…", a: ["Deploy operating system images over the network", "Print documents", "Filter spam"], c: 0 },
      { q: "A deployed PC must be added to the domain to…", a: ["Receive policies and domain logons", "Be faster", "Get a nicer wallpaper"], c: 0 },
      { q: "Which cmdlet joins a computer to the domain?", a: ["Add-Computer", "Get-Service", "Set-Mailbox"], c: 0 },
    ],
  },
  "Phone diagnostics (the soft skill)": {
    key: "c12", replay: null,
    quiz: [
      { q: "Best first question for an upset user on the phone?", a: ["What exactly happens and since when?", "Have you tried turning your brain on?", "That is not my problem."], c: 0 },
      { q: "Why ask diagnostic questions before touching anything?", a: ["Diagnosis is most of the job", "It wastes the user's time", "It is a legal requirement"], c: 0 },
      { q: "If you cannot fix it at your level, you should…", a: ["Escalate with clear notes", "Hang up", "Guess and hope"], c: 0 },
    ],
  },
};

const CHAPTER_PASS = 2;          // z 3 otázok
const CHAPTER_XP = 15;           // raz za kapitolu

function chapterExtras(ch) { return (ch && CHAPTER_EXTRAS[ch.title]) || null; }

/* premiešaná kópia otázky: { q, a:[…], correct } — pozícia správnej odpovede sa mení pri každom otvorení */
function chapterBuildQuestions(extra) {
  return extra.quiz.map((q) => {
    const order = shuffleIdx(q.a.length);
    return { q: q.q, a: order.map((o) => q.a[o]), correct: order.indexOf(q.c) };
  });
}

/* skóre → XP (iba prvé úspešné absolvovanie) — čistá logika, testovateľná bez DOM */
function chapterGrade(extra, score) {
  const key = extra.key;
  const prev = (state.chapterQuiz && state.chapterQuiz[key]) || 0;
  const passed = score >= CHAPTER_PASS;
  let xp = 0;
  if (!state.chapterQuiz) state.chapterQuiz = {};
  if (score > prev) state.chapterQuiz[key] = score;
  if (passed && prev < CHAPTER_PASS) { xp = CHAPTER_XP; state.xp += xp; }
  saveGame();
  return { passed, xp, best: state.chapterQuiz[key] || 0 };
}

/* replay: nový grind ticket rovnakého druhu, s inými náhodnými parametrami */
function chapterReplay(extra) {
  if (!extra || !extra.replay) return null;
  if ((state.rank || 0) < 1) return null;
  if (!state.grindTickets) state.grindTickets = [];
  const open = state.grindTickets.filter((t) => !state.resolved.includes(t.id) && !state.escalated.includes(t.id));
  if (open.length >= 10) return { full: true };
  const t = makeGrindTicket(extra.replay);
  if (!t) return null;
  GRIND_KINDS[t.kind].make(t.params).setup(t.params, state.server);
  t.from = "Training lab (replay) — new fault, same skill";
  state.grindTickets.push(t);
  if (!state.arrived.includes(t.id)) state.arrived.push(t.id);
  state.replays = (state.replays || 0) + 1;
  saveGame();
  return t;
}

/* ---------- UI (modal vytvorený za behu — nezávisí od index.html) ---------- */
function chapterQuizOpen(ch, onClose) {
  const extra = chapterExtras(ch);
  if (!extra) return;
  let ov = document.getElementById("chapterquiz-overlay");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "chapterquiz-overlay";
    ov.className = "overlay hidden";
    ov.innerHTML = `<div class="modal-box wide"><h2 class="modal-title" id="cq-title"></h2><div id="cq-body"></div></div>`;
    document.body.appendChild(ov);
  }
  const qs = chapterBuildQuestions(extra);
  let i = 0, score = 0;
  const title = ov.querySelector("#cq-title");
  const body = ov.querySelector("#cq-body");
  title.textContent = `🎓 Chapter check — ${ch.title}`;
  const close = () => { ov.classList.add("hidden"); if (onClose) onClose(); };

  function show() {
    const q = qs[i];
    body.innerHTML = `<p class="quiz-q">Question ${i + 1}/${qs.length}: ${escHtml(q.q)}</p><div class="cq-answers"></div>
      <div class="modal-actions"><button class="btn-secondary cq-cancel">Close</button><button class="btn-primary cq-next" disabled>NEXT →</button></div>`;
    const box = body.querySelector(".cq-answers");
    q.a.forEach((ans, k) => {
      const b = document.createElement("button");
      b.className = "quiz-answer";
      b.textContent = ans;
      b.onclick = () => {
        box.querySelectorAll(".quiz-answer").forEach((x) => (x.disabled = true));
        if (k === q.correct) { b.classList.add("correct"); score++; SFX.ding(); }
        else { b.classList.add("wrong"); box.querySelectorAll(".quiz-answer")[q.correct].classList.add("correct"); SFX.err(); }
        const nx = body.querySelector(".cq-next");
        nx.disabled = false;
        nx.textContent = i === qs.length - 1 ? "SEE RESULT →" : "NEXT →";
      };
      box.appendChild(b);
    });
    body.querySelector(".cq-cancel").onclick = close;
    body.querySelector(".cq-next").onclick = () => { i++; if (i >= qs.length) finish(); else show(); };
  }

  function finish() {
    const g = chapterGrade(extra, score);
    if (typeof renderTopbar === "function") renderTopbar();
    body.innerHTML = `<h3>${g.passed ? "✅ PASSED" : "❌ NOT YET"} — ${score}/${qs.length}</h3>
      <p class="modal-sub">${g.passed
        ? (g.xp ? `+${g.xp} XP for this chapter. Nice.` : "Chapter already mastered — no extra XP, but good revision.")
        : `You need ${CHAPTER_PASS}/${qs.length}. Re-read the chapter and try again — the answers are shuffled every time.`}</p>
      <div class="modal-actions"><button class="btn-primary cq-done">Close</button></div>`;
    body.querySelector(".cq-done").onclick = close;
  }

  ov.classList.remove("hidden");
  show();
}

function chapterReplayRun(ch) {
  const extra = chapterExtras(ch);
  const t = chapterReplay(extra);
  if (!t) { toast("🔁 No replay lab for this chapter yet (or you need to reach Tier 1 first).", "t-warn"); return; }
  if (t.full) { toast("🔁 Clear a few open tickets first — the queue is full.", "t-warn"); return; }
  SFX.ping();
  toast(`🔁 Replay lab: ticket #${t.id} — ${t.subject}`, "toast-ticket");
  if (typeof renderTickets === "function") renderTickets();
}
