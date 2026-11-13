/* ===== TicketQuest — UI, game logic, wiring ===== */

/* ---------- Firebase Authentication ---------- */
import { isLoggedIn, getCurrentUser, parseStoredUser, showIntroOverlay, hideIntroOverlay, showMessage } from './auth.js';

// Check for stored "remember me" user on app start
document.addEventListener('DOMContentLoaded', () => {
  const storedUser = parseStoredUser();
  if (storedUser) {
    // Auto-login with stored credentials
    // Note: For security, you might want to force password change on first login
    login(storedUser.email, 'TEMP_PASSWORD', true).then(() => {
      // If auto-login succeeds, hide intro and start game
      hideIntroOverlay();
      showMessage('Welcome back! Continuing your shift...');
    }).catch(err => {
      // Auto-login failed (e.g., password changed), show login form
      console.log('Auto-login failed:', err.message);
      showIntroOverlay();
    });
  } else {
    // No stored user, show intro
    showIntroOverlay();
  }
});

/* ---------- terminal ----------
const termEl = document.getElementById("terminal");
let inputRow = null, inputEl = null, promptEl = null;
const history = [];
let histIdx = -1;

function termPrint(text, cls = "") {
  const div = document.createElement("div");
  div.className = "t-line" + (cls ? " " + cls : "");
  div.textContent = String(text ?? "");
  termEl.insertBefore(div, inputRow);
  termEl.scrollTop = termEl.scrollHeight;
}

function termClear() {
  [...termEl.querySelectorAll(".t-line")].forEach((n) => n.remove());
}

function newInputRow() {
  inputRow = document.createElement("div");
  inputRow.className = "t-line t-input-row";
  promptEl = document.createElement("span");
  promptEl.className = "t-prompt";
  promptEl.textContent = `PS C:\\Users\\${state.player.login || "admin"}> `;
  inputEl = document.createElement("input");
  inputEl.id = "t-input";
  inputEl.autocomplete = "off";
  inputEl.spellcheck = false;
  inputRow.appendChild(promptEl);
  inputRow.appendChild(inputEl);
  termEl.appendChild(inputRow);
  termEl.scrollTop = termEl.scrollHeight;
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const val = inputEl.value;
      if (val.trim()) { history.push(val); histIdx = history.length; }
      const echo = document.createElement("div");
      echo.className = "t-line t-cmd";
      echo.textContent = promptEl.textContent + val;
      termEl.insertBefore(echo, inputRow);
      inputEl.value = "";
      SFX.click();
      runCommand(val);
      termEl.scrollTop = termEl.scrollHeight;
    } else if (e.key === "ArrowUp") {
      if (histIdx > 0) { histIdx--; inputEl.value = history[histIdx]; }
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (histIdx < history.length - 1) { histIdx++; inputEl.value = history[histIdx]; }
      else { inputEl.value = ""; }
      e.preventDefault();
    } else {
      SFX.type();
    }
  });
}

function banner() {
  termPrint(`Microsoft Windows [Version 10.0.26100.1]  —  ${HOST} (SIMULATED)`, "t-dim");
  termPrint("(c) PIXL Corp. All rights... probably reserved.", "t-dim");
  termPrint("");
  termPrint(`Welcome to the server, ${state.player.name || "colleague"}. Type 'help' for commands.`, "t-warn");
  termPrint("Show tickets with 'tickets'; the curriculum is in the SOP Binder on the left.", "t-warn");
  termPrint("");
}

/* ---------- toasts (delegate → Win11 notifications v hre) ---------- */
function toast(msg, cls = "") {
  const inGame = !document.getElementById("game")?.classList.contains("hidden");
  if (inGame && typeof notify === "function" && !document.getElementById("game").classList.contains("hidden")) {
    const icon = cls.includes("danger") ? "⏰" : cls.includes("warn") ? "⚠️" : msg.includes("📥") ? "🎫" : msg.includes("🎉") ? "🎉" : "💬";
    notify({ icon, title: "PIXL Corp IT", body: msg, cls: cls.includes("danger") ? "n-danger" : "" });
    return;
  }
  const box = document.getElementById("toast-box");
  if (!box) { termPrint(msg, cls); return; }
  const t = document.createElement("div");
  t.className = "toast " + cls;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.classList.add("show"), 20);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 5200);
}

/* ---------- office / tickets ---------- */
function ticketVisible(t) {
  if (t.slaMin === null && !t.doris) return true;
  if (t.slaMin !== null && state.rank < 1) return false;
  return state.arrived.includes(t.id);
}

function renderTickets() {
  const list = document.getElementById("ticket-list");
  list.innerHTML = "";
  const all = [...TICKETS, ...(state.dorisTickets || []), ...(state.grindTickets || [])];
  for (const t of all) {
    if (!t || typeof t !== "object") continue;
    if (!ticketVisible(t)) continue;
    // vyriešené grind tickety nezobrazuj — zoznam by rástl donekonečna
    if (t.grind && (state.resolved.includes(t.id) || state.escalated.includes(t.id))) continue;
    // HelpDesk queue filter (chips)
    const f = (typeof hdFilter !== "undefined" && hdFilter) || "all";
    const isDone = state.resolved.includes(t.id) || state.escalated.includes(t.id);
    if (f === "new" && (isDone || state.taken.includes(t.id))) continue;
    if (f === "mine" && !state.taken.includes(t.id)) continue;
    if (f === "done" && !isDone) continue;
    const resolved = state.resolved.includes(t.id);
    const escalated = state.escalated.includes(t.id);
    const taken = state.taken.includes(t.id);
    const priority = ["HIGH", "NORMAL", "CRITICAL"].includes(t.priority) ? t.priority : "NORMAL";
    const ticketId = Number.isSafeInteger(t.id) ? t.id : "?";
    const card = document.createElement("div");
    card.className = "ticket-card" + (resolved ? " resolved" : "");
    const phoneTag = t.phone ? " 📞" : "";
    const status = resolved
      ? "✔ RESOLVED" + (state.notes[t.id] ? " 📝" : "")
      : escalated
      ? "⬆ ESCALATED (T2)"
      : taken
      ? `${slaOverdue(t) ? "⏰ OVER SLA — " : ""}✋ Assigned to you${phoneTag}`
      : `🆕 New${phoneTag}` + (t.slaMin ? ` (SLA ${t.slaMin} min)` : "");
    card.innerHTML = `
      <div class="tc-head">
        <span class="ticket-id">#${ticketId}</span>
        <span class="prio ${priority.toLowerCase()}">${priority}</span>
      </div>
      <div class="tc-subject">${escHtml(t.subject)}</div>
      <div class="tc-from">${escHtml(t.from)}</div>
      <div class="tc-status ${resolved ? "resolved" : taken ? "taken" : ""}">${escHtml(status)}</div>`;
    card.addEventListener("click", () => { SFX.click(); showDetail(t.id); });
    list.appendChild(card);
  }
  renderQuizButton();
  apps.updateBadges();
  office.updateBadge();
}

function showDetail(id) {
  const t = findTicket(id);
  if (!t) return;
  const detail = document.getElementById("ticket-detail");
  detail.classList.remove("hidden");
  document.getElementById("td-id").textContent = "#" + t.id;
  const prioEl = document.getElementById("td-priority");
  const priority = ["HIGH", "NORMAL", "CRITICAL"].includes(t.priority) ? t.priority : "NORMAL";
  prioEl.textContent = priority;
  prioEl.className = "prio " + priority.toLowerCase();
  document.getElementById("td-from").textContent = t.from;
  document.getElementById("td-body").textContent = "„" + String(t.body ?? "").replaceAll("{PLAYER}", state.player.name || "") + "“";
  const sopList = document.getElementById("td-sop");
  sopList.replaceChildren();
  (Array.isArray(t.sop) ? t.sop.slice(0, 20) : []).forEach((line) => {
    const item = document.createElement("li");
    renderSopLine(item, line);
    sopList.appendChild(item);
  });

  const callBtn = document.getElementById("btn-call");
  if (t.phone) {
    callBtn.classList.remove("hidden");
    callBtn.textContent = state.phoneDone[t.id] ? "📞 CALL DONE ✔" : "📞 CALL THE USER";
    callBtn.disabled = state.phoneDone[t.id];
    callBtn.onclick = () => phoneOpen(t.id);
  } else {
    callBtn.classList.add("hidden");
  }

  const btn = document.getElementById("btn-take");
  if (state.resolved.includes(t.id) || state.escalated.includes(t.id)) {
    btn.textContent = state.escalated.includes(t.id) ? "⬆ ESCALATED — T2 HANDLES IT" : "✔ RESOLVED";
    btn.disabled = true;
  } else if (state.taken.includes(t.id)) {
    btn.textContent = `✋ TAKEN ${fmtSla(t)} — SOLVE IT IN THE TERMINAL →`;
    btn.disabled = true;
  } else {
    btn.textContent = "✋ TAKE TICKET";
    btn.disabled = false;
    btn.onclick = () => {
      if (!state.taken.includes(t.id)) {
        state.taken.push(t.id);
        state.takenAt[t.id] = Date.now();
        startSla(t);
        saveGame();
        termPrint(`[HELPDESK] Ticket #${t.id} assigned to you${t.slaMin ? ` (SLA ${t.slaMin} min${state.chill ? ", chill mode ON" : ""})` : ""}.`, "t-ok");
        if (t.phone) toast("📞 Tip: call the user before you start guessing!", "t-warn");
      }
      renderTickets();
      showDetail(t.id);
      if (inputEl) inputEl.focus();
    };
  }
  document.querySelectorAll(".ticket-card").forEach((c) =>
    c.classList.toggle("selected", c.dataset.id == t.id));
}

function renderSopLine(item, value) {
  const text = String(value ?? "").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
  let inCode = false;
  text.split(/(<\/?code>)/gi).forEach((part) => {
    if (/^<code>$/i.test(part)) { inCode = true; return; }
    if (/^<\/code>$/i.test(part)) { inCode = false; return; }
    if (inCode) {
      const code = document.createElement("code");
      code.textContent = part;
      item.appendChild(code);
    } else {
      item.appendChild(document.createTextNode(part));
    }
  });
}

/* ---------- XP / rank / salary ---------- */
function renderTopbar() {
  const rank = RANKS[rankIndex()];
  document.getElementById("rank-name").textContent = rankTitle();
  const next = RANKS[rankIndex() + 1];
  const start = next ? next.minXp : 0;
  const prev = rank.minXp;
  const progress = next ? Math.max(0, Math.min(100, ((state.xp - prev) / (start - prev)) * 100)) : 100;
  document.getElementById("xp-fill").style.width = progress + "%";
  document.getElementById("xp-label").textContent = `${state.xp} XP${next ? ` / ${next.minXp}` : ""}`;
  document.getElementById("salary-label").textContent =
    rank.salary > 0 ? `💰 $${rank.salary}/mo` : "☕ intern (unpaid)";
  renderTopbarAvatar();
}

/* ---------- ticket arrival (live shift) ---------- */
function seedArrivals() {
  const plan = TICKETS.filter((t) => !state.arrived.includes(t.id) && ticketVisible(t));
  plan.forEach((t, i) => {
    setTimeout(() => arriveTicket(t), 3000 + i * 25000);
  });
}

function arriveTicket(t) {
  if (state.arrived.includes(t.id)) return;
  state.arrived.push(t.id);
  saveGame();
  SFX.ping();
  toast(`📥 New ticket #${t.id} — ${t.subject}`, "toast-ticket");
  renderTickets();
}

/* ---------- Doris running gag ---------- */
const DORIS_LINES = [
  "I forgot my password again. But this time I REALLY forgot it.",
  "Hi, it's me again... Locked out. Third... fourth time?",
  "I promise this is the last time I'll ask for help! (It isn't.)",
  "So... the password. You know how it is. The coffee was strong.",
];

function maybeSpawnDoris(t) {
  if (state.rank < 1 || t.doris) return;
  const t1done = state.resolved.filter((id) => id >= 1101 && id <= 1107).length;
  if (t1done % 2 !== 0 || t1done === 0) return;
  // Doris locked herself out again!
  state.server.users.doris.active = false;
  state.server.users.doris.changed = false;
  state.dorisCount++;
  const id = 2000 + state.dorisCount;
  if (state.resolved.includes(id) || state.dorisTickets.some((x) => x.id === id)) return;
  state.dorisTickets.push({
    id,
    from: "Doris Pemberton, Office Admin",
    subject: `Locked out again (the ${state.dorisCount}. time)`,
    priority: "HIGH",
    xp: 40, slaMin: 30,
    doris: true,
    body: DORIS_LINES[(state.dorisCount - 1) % DORIS_LINES.length],
    sop: [
      "Looks familiar: <code>net user doris</code>",
      "Unlock: <code>net user doris /active:yes</code>",
      "Reset the password: <code>net user doris Pass2026!</code>",
      "Resolve: <code>resolve " + id + "</code>",
    ],
    check: (srv) => srv.users.doris.active === true && srv.users.doris.changed === true,
  });
  saveGame();
  toast(`📥 Doris just sent ticket #${id}. Unexpected. 🙃`, "toast-ticket");
  SFX.ping();
  renderTickets();
}

/* ---------- resolution notes modal ---------- */
function openNotes(t) {
  const overlay = document.getElementById("notes-overlay");
  const ta = document.getElementById("notes-text");
  ta.value = state.notes[t.id] || "";
  overlay.classList.remove("hidden");
  ta.dataset.ticket = t.id;
  ta.focus();
}

function submitNotes() {
  const overlay = document.getElementById("notes-overlay");
  const ta = document.getElementById("notes-text");
  const id = parseInt(ta.dataset.ticket, 10);
  const t = findTicket(id);
  const note = ta.value.trim();
  if (note) {
    state.notes[id] = note;
    if (note.length >= 40) {
      state.xp += 10;
      state.stats.notesGood++;
      termPrint("📝 Good resolution note (+10 XP). Documentation counts!", "t-ok");
    }
  }
  saveGame();
  overlay.classList.add("hidden");
  renderTickets();
  renderTopbar();
  afterProgressTick(t);
}

/* ---------- promotions, review, story ---------- */
function afterProgressTick(t) {
  maybeSpawnDoris(t);

  // performance review after finishing all of T1 (before the quiz)
  if (
    state.rank === 1 && !state.reviewDone &&
    RANKS[2].reqs.tickets.every((id) => state.resolved.includes(id) || state.escalated.includes(id))
  ) {
    setTimeout(() => {
      reviewShow(() => {
        termPrint("[HR] Performance review done. The A+ exam is unlocked (🎓 Settings app or taskbar).", "t-ok");
        renderQuizButton();
      });
    }, 600);
    return;
  }

  const desired = desiredRank();
  if (desired > state.rank && state.rank === 0) {
    // first shift done → night mystery + promotion
    cutscene.play([SCENE_NIGHT], () => {
      night.open(() => {
        cutscene.play([SCENE_PROMO_T1], () => {
          state.rank = 1;
          state.story.mystery1 = true;
          saveGame();
          renderTopbar();
          renderTickets();
          seedArrivals();
          grindStartLoop();
          SFX.fanfare();
          termPrint("[HR] 🎉 You're now Helpdesk Tier 1! New tickets (arriving over time) + SLA unlocked.", "t-ok");
          termPrint("[HR] A new phase of the course is in the SOP Binder. 📚", "t-warn");
          if (state.story.nightEvidence) {
            toast("🤫 You have evidence from the night (keeper.ps1). Zora doesn't know yet...", "toast-secret");
          }
        });
      });
    });
    return;
  }

  // grind promócie (rank 3+): stovky ticketov = vyššia pozícia
  if (desired > state.rank && state.rank >= 2) {
    // kariérna vetva — od ranku 3 si hráč vyberá špecializáciu
    if (desired >= 3 && !state.branch) {
      branchOpen(desired);
      return;
    }
    promoteTo(desired, true);
    dorisArcMaybe();
    return;
  }

  // Doris "HELP!" arc (aj bez promócie)
  dorisArcMaybe();
  checkAchievements();
}

function onQuizPassed() {
  const desired = desiredRank();
  if (desired >= 2 && state.rank < 2) {
    cutscene.play([SCENE_PROMO_T2], () => {
      state.rank = 2;
      saveGame();
      renderTopbar();
      renderTickets();
      SFX.fanfare();
      termPrint("[HR] 🎉 Desktop Support Tier 2! Phase 2 of development will bring new tasks.", "t-ok");
      statsOpen();
    });
  }
}

function onTicketResolved(t) {
  renderTickets();
  if (!document.getElementById("ticket-detail").classList.contains("hidden")) showDetail(t.id);
  renderTopbar();
  openNotes(t);
  dorisArcResolvedMaybe();
  checkAchievements();
}

function onTicketEscalated(t) {
  renderTickets();
  renderTopbar();
  afterProgressTick(t);
}

/* ---------- quiz button ---------- */
function renderQuizButton() {
  const btn = document.getElementById("btn-quiz");
  if (!btn) return;
  const eligible =
    state.rank >= 1 &&
    state.reviewDone &&
    RANKS[2].reqs.tickets.every((id) => state.resolved.includes(id) || state.escalated.includes(id)) &&
    !state.quiz.aplus;
  btn.textContent = "🎓 A+ EXAM";
  btn.classList.toggle("hidden", !eligible);
}

/* ---------- SLA tick ---------- */
setInterval(() => {
  if (document.getElementById("game").classList.contains("hidden")) return;
  if (state.chill) return;
  for (const id of state.taken) {
    if (state.resolved.includes(id) || state.escalated.includes(id)) continue;
    const t = findTicket(id);
    if (t && slaOverdue(t) && !state.overdue[id]) {
      state.overdue[id] = true;
      state.stats.slaMiss++;
      saveGame();
      SFX.alarm();
      toast(`⏰ Ticket #${id} is OVER SLA! XP bonus halved.`, "toast-danger");
      termPrint(`⏰ Ticket #${id} is OVER SLA! XP bonus halved. Solve it fast.`, "t-err");
      renderTickets();
    }
  }
}, 1000);

/* ---------- start ---------- */
document.getElementById("btn-clockin").addEventListener("click", () => {
  document.getElementById("intro-overlay").classList.add("hidden");
  if (state.player.name) {
    startGame();
  } else {
    cutscene.play([SCENE_INTRO], () => {
      state.story.introDone = true;
      saveGame();
      startGame();
    });
  }
});

function startGame(withTutorial = false) {
  menuHide();
  document.getElementById("game").classList.remove("hidden");
  binderInit();
  if (!state.stats.startedAt) state.stats.startedAt = Date.now();
  // intern tickets arrive live (first two right away)
  if (!state.arrived.includes(1042)) state.arrived.push(1042);
  if (!state.arrived.includes(1043)) state.arrived.push(1043);
  saveGame();
  renderTickets();
  renderTopbar();
  try { office.init(); } catch (e) { console.error("office init:", e); }
  try { os.init(); } catch (e) { console.error("os init:", e); }
  try { hydrateGrindTickets(); grindStartLoop(); } catch (e) { console.error("grind init:", e); }
  seedArrivals();
}

/* promo-overlay bolo odstránené v v3 — promócie idú cez cutscene engine */

/* bezpečný binding — chýbajúci element nesmie zrútiť celý main.js */
function on(id, fn, ev = "click") {
  const el = document.getElementById(id);
  if (el) el.addEventListener(ev, fn);
}

on("btn-quiz", () => quizOpen("aplus"));
on("btn-binder", () => { SFX.click(); binderOpen(); });
on("binder-close", () => document.getElementById("binder-overlay").classList.add("hidden"));
on("binder-download-btn", () => { SFX.ding(); binderDownload(); });
on("notes-ok", submitNotes);
on("notes-skip", () => {
  document.getElementById("notes-overlay").classList.add("hidden");
  const id = parseInt(document.getElementById("notes-text").dataset.ticket, 10);
  afterProgressTick(findTicket(id));
});
function toggleChill() {
  state.chill = !state.chill;
  saveGame();
  const btn = document.getElementById("btn-chill");
  if (btn) btn.textContent = state.chill ? "🍃 CHILL: ON" : "⏱ CHILL: OFF";
  renderTickets();
  termPrint(state.chill ? "Chill mode ON — SLA timers are off." : "Chill mode OFF — SLA is running. Brave.", "t-warn");
}

on("btn-chill", toggleChill);
on("btn-stats", () => { SFX.click(); statsOpen(); });
on("stats-close", () => document.getElementById("stats-overlay").classList.add("hidden"));
on("btn-cv", cvDownload);
on("npad-close", () => document.getElementById("npad-overlay").classList.add("hidden"));
document.querySelectorAll(".hd-chip").forEach((c) => {
  c.addEventListener("click", () => {
    SFX.click();
    hdFilter = c.dataset.filter;
    document.querySelectorAll(".hd-chip").forEach((x) => x.classList.toggle("active", x === c));
    renderTickets();
  });
});
on("phone-close", () => document.getElementById("phone-overlay").classList.add("hidden"));

termEl.addEventListener("click", () => { if (inputEl) inputEl.focus(); });

/* restore saved game + main menu */
const hadSave = loadGame();
binderInit();

/* ---------- main menu ---------- */
const mmRoot = document.getElementById("main-menu");
const mmSettingsPanel = document.getElementById("mm-settings-panel");
const mmConfirmPanel = document.getElementById("mm-confirm-panel");
const mmMainButtons = mmRoot ? mmRoot.querySelector(".menu-buttons") : null;
let mmConfirmAction = null;

function mmShowPanel(name) {
  if (!mmRoot) return;
  mmSettingsPanel.classList.toggle("hidden", name !== "settings");
  mmConfirmPanel.classList.toggle("hidden", name !== "confirm");
  mmMainButtons.classList.toggle("hidden", !!name);
}
function menuShow() {
  if (!mmRoot) { document.getElementById("intro-overlay").classList.remove("hidden"); return; }
  mmRoot.classList.remove("hidden");
  document.getElementById("intro-overlay").classList.add("hidden");
  const canContinue = hadSave && !!state.player.name;
  const cont = document.getElementById("mm-continue");
  const rst = document.getElementById("mm-reset");
  cont.classList.toggle("hidden", !canContinue);
  rst.classList.toggle("hidden", !hadSave);
  if (canContinue) {
    cont.textContent = `💾 CONTINUE — ${state.resolved.length + state.escalated.length} tickets · ${state.xp} XP`;
  }
  mmShowPanel(null);
}
function menuHide() { if (mmRoot) mmRoot.classList.add("hidden"); }
function menuShowIntro() {
  menuHide();
  if (state.player.name && hadSave) {
    document.getElementById("btn-clockin").textContent = "⏰ CONTINUE SHIFT";
    const story = document.querySelector(".intro-story");
    if (story && !story.querySelector(".welcome-back")) {
      story.insertAdjacentHTML("beforeend",
        `<p class="hint welcome-back">💾 Welcome back, <b>${escHtml(state.player.name)}</b>! Progress: ${state.resolved.length + state.escalated.length} tickets, ${state.xp} XP.</p>`);
    }
  }
  document.getElementById("intro-overlay").classList.remove("hidden");
}
function beginNewGame() {
  newGameState();
  const story = document.querySelector(".intro-story");
  if (story) { const wb = story.querySelector(".welcome-back"); if (wb) wb.remove(); }
  document.getElementById("btn-clockin").textContent = "⏰ CLOCK IN";
  menuHide();
  document.getElementById("intro-overlay").classList.remove("hidden");
}

if (mmRoot) {
  on("mm-continue", () => {
    SFX.click();
    menuHide();
    if (state.player.name) startGame();
    else menuShowIntro();
  });
  on("mm-new", () => {
    SFX.click();
    if (hadSave && (state.resolved.length + state.escalated.length > 0 || state.xp > 0)) {
      document.getElementById("mm-confirm-title").textContent = "▶ START A NEW GAME?";
      document.getElementById("mm-confirm-text").textContent =
        `Your current save (${escHtml(state.player.name) || "unnamed intern"}, ${state.xp} XP) will be permanently overwritten.`;
      mmConfirmAction = beginNewGame;
      mmShowPanel("confirm");
    } else {
      beginNewGame();
    }
  });
  on("mm-reset", () => {
    SFX.click();
    document.getElementById("mm-confirm-title").textContent = "🗑️ RESET PROGRESS?";
    document.getElementById("mm-confirm-text").textContent =
      "This permanently deletes your save. There is no undo. Mr. Pixel will not remember you.";
    mmConfirmAction = () => { SFX.err(); resetGame(); };
    mmShowPanel("confirm");
  });
  on("mm-confirm-yes", () => { SFX.click(); const f = mmConfirmAction; mmConfirmAction = null; if (f) f(); });
  on("mm-confirm-no", () => { SFX.click(); mmConfirmAction = null; mmShowPanel(null); });
  on("mm-settings", () => { SFX.click(); mmShowPanel("settings"); });
  on("mm-settings-back", () => { SFX.click(); mmShowPanel(null); });
  const sndBtn = document.getElementById("mm-sound");
  if (sndBtn) {
    sndBtn.textContent = SFX.isMuted() ? "OFF" : "ON";
    sndBtn.addEventListener("click", () => {
      const muted = SFX.toggleMuted();
      sndBtn.textContent = muted ? "OFF" : "ON";
      if (!muted) SFX.click();
    });
  }
  menuShow();
}
