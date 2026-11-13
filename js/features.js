/* ===== TicketQuest — v5 features: Win11 notifications, career branches,
   achievements, keeper.ps1 side-quest, save export/import ===== */

/* ============================================================
   1. WIN11 NOTIFICATIONS (stack vpravo dole + bell + center)
   ============================================================ */
const notifLog = [];   // {icon,title,body,ts,read}
let notifRestore = null; // okná minimalizované cez Show desktop (obnova)

function notify(o) {
  /* o: { icon, title, body, tag?, cls? } */
  notifLog.unshift({ icon: o.icon || "💬", title: o.title || "PIXL Corp IT", body: o.body || "", ts: Date.now(), read: false });
  if (notifLog.length > 60) notifLog.pop();
  const bell = document.getElementById("btn-bell");
  if (bell) bell.classList.add("has-unread");
  spawnNotifCard(o);
}

function spawnNotifCard(o) {
  const stack = document.getElementById("notif-stack");
  if (!stack) return;
  // max 4 karty naraz — najstaršiu odstráň
  while (stack.children.length >= 4) stack.firstElementChild.remove();
  const card = document.createElement("div");
  card.className = "notif-card" + (o.cls ? " " + o.cls : "");
  card.innerHTML =
    `<div class="notif-ico">${o.icon || "💬"}</div>
     <div class="notif-main">
       <div class="notif-tt">${escHtml(o.title || "PIXL Corp IT")}</div>
       <div class="notif-bd">${escHtml(o.body || "")}</div>
     </div>
     <button class="notif-x" title="Dismiss">✕</button>`;
  card.querySelector(".notif-x").onclick = (e) => { e.stopPropagation(); card.remove(); };
  card.addEventListener("click", () => { card.remove(); openNotifCenter(); });
  stack.appendChild(card);
  setTimeout(() => { card.classList.add("gone"); setTimeout(() => card.remove(), 350); }, 6500);
}

function updateBell() {
  const bell = document.getElementById("btn-bell");
  if (!bell) return;
  const unread = notifLog.filter((n) => !n.read).length;
  bell.classList.toggle("has-unread", unread > 0);
  bell.setAttribute("data-tip", unread ? `Notifications (${unread} new)` : "Notifications");
}

function openNotifCenter() {
  const c = document.getElementById("notif-center");
  if (!c) return;
  if (!c.classList.contains("hidden")) { c.classList.add("hidden"); return; }
  notifLog.forEach((n) => { n.read = true; });
  updateBell();
  const fmt = (ts) => {
    const d = new Date(ts);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  c.innerHTML =
    `<div class="nc-head"><span>Notifications</span><button id="nc-clear">Clear all</button></div>` +
    (notifLog.length
      ? notifLog.slice(0, 30).map((n) =>
          `<div class="nc-item">
             <div class="notif-ico small">${n.icon}</div>
             <div class="nc-main">
               <div class="nc-tt">${escHtml(n.title)} <span class="nc-time">${fmt(n.ts)}</span></div>
               <div class="nc-bd">${escHtml(n.body)}</div>
             </div>
           </div>`).join("")
      : `<div class="nc-empty">🔕 No new notifications<br><span>(the queue never sleeps — it's just quiet right now)</span></div>`);
  c.classList.remove("hidden");
  c.querySelector("#nc-clear")?.addEventListener("click", () => { notifLog.length = 0; updateBell(); openNotifCenter(); openNotifCenter(); });
}

/* ============================================================
   2. KARIÉRNE VETVY (Sysadmin vs SOC) — od ranku 3
   ============================================================ */
function branchOpen(desiredRank) {
  const ov = document.getElementById("branch-overlay");
  if (!ov) { promoteTo(desiredRank); return; }
  ov.classList.remove("hidden");
  ov.querySelectorAll(".branch-card").forEach((b) => {
    b.onclick = () => {
      SFX.click();
      state.branch = b.dataset.branch;
      saveGame();
      ov.classList.add("hidden");
      termPrint(state.branch === "soc"
        ? "[HR] 🛡 Specialization locked in: SECURITY ANALYST. Phishing, brute-force logs and incidents will start arriving."
        : "[HR] 🖥 Specialization locked in: SYSTEMS ADMINISTRATOR. Infrastructure and PowerShell-heavy tickets incoming.", "t-warn");
      promoteTo(desiredRank, true);
    };
  });
}

function promoteTo(desired, withScene) {
  state.rank = desired;
  saveGame();
  renderTopbar();
  renderTickets();
  SFX.fanfare();
  const title = rankTitle();
  const r = RANKS[desired];
  notify({
    icon: "🎉",
    title: "Promotion!",
    body: `You are now ${title}. Salary: $${r.salary}/mo. The queue never sleeps.`,
    cls: "n-good",
  });
  toast(`🎉 PROMOTED — ${title}! Keep grinding.`, "toast-ticket");
  termPrint(`[HR] 🎉 PROMOTION! You are now <b>${title}</b> (💰 $${r.salary}/mo).`, "t-ok");
  termPrint("[HR] Harder, higher-value tickets will arrive from now on. The queue never sleeps.", "t-warn");
  const scene = SCENE_PROMO_BRANCH[state.branch];
  if (withScene && state.promotedTo < 3 && scene) {
    state.promotedTo = 3;
    cutscene.play([scene], () => grindSpawn());
  } else {
    if (desired === 3) state.promotedTo = 3;
    grindSpawn();
  }
  checkAchievements();
}

/* ============================================================
   3. DORIS "HELP!" ARC — rank 3+, ~150 ticketov
   ============================================================ */
function dorisArcMaybe() {
  if (state.rank < 3 || state.story.dorisArc || state.story.dorisStarted) return;
  if (countResolved() < 150) return;
  state.story.dorisStarted = true;
  saveGame();
  setTimeout(() => {
    cutscene.play([SCENE_DORIS_HELP], () => {
      // Doris nechala spadnúť polovicu servera — špeciálny CRITICAL ticket
      if (!state.grindTickets.some((t) => t.kind === "doris-mega")) {
        const t = makeGrindTicket("doris-mega");
        if (t) {
          const def = GRIND_KINDS["doris-mega"];
          def.make(t.params).setup(t.params, state.server);
          t.from = "Doris Pemberton, Office Admin (VERY sorry)";
          state.grindTickets.push(t);
          if (!state.arrived.includes(t.id)) state.arrived.push(t.id);
          state.story.dorisTicket = t.id;   // resolve-kontrola musí poznať id
          saveGame();
          notify({ icon: "🚨", title: "CRITICAL incident", body: `#${t.id} — ${t.subject}. Doris says she's sorry. Sort of.`, cls: "n-danger" });
          SFX.alarm();
          renderTickets();
        }
      }
    });
  }, 400);
}

function dorisArcResolvedMaybe() {
  const mega = (state.grindTickets || []).find((t) => t.kind === "doris-mega");
  const target = state.story.dorisTicket || (mega && mega.id) || 2901;
  if (state.story.dorisArc || !state.resolved.includes(target)) return;
  state.story.dorisArc = true;
  saveGame();
  setTimeout(() => {
    cutscene.play([SCENE_DORIS_FIXED], () => {
      notify({ icon: "🦸", title: "Incident closed", body: "The Doris Incident (official name in the report) is over. She's already locked out again.", cls: "n-good" });
      checkAchievements();
    });
  }, 300);
}

/* ============================================================
   4. KEEPER.PS1 SIDE-QUEST — 3 stopy → odhalenie
   ============================================================ */
const KEEPER_CLUES = [
  {
    file: "keeper-trace.log (1/3)",
    text: "--- keeper-trace.log ---\n" +
      "Every night at 11 PM, an unknown scheduled task runs\n" +
      "something called keeper.ps1.\n" +
      "\n" +
      "2026-11-09 23:00  task \"\\Scripts\\keeper\" started\n" +
      "2026-11-09 23:00  process created: powershell.exe -File keeper.ps1\n" +
      "2026-11-09 23:00  ...no output. no errors. just... silence.\n" +
      "\n" +
      "(Who schedules a task and leaves no logs? Click the keeper.ps1\n" +
      "row in Task Manager again — maybe it talks.)",
  },
  {
    file: "keeper-trace.log (2/3)",
    text: "--- keeper-trace.log ---\n" +
      "Recovered fragment of keeper.ps1 (partial, obfuscated):\n" +
      "\n" +
      "  # hour 23. the floor is empty.\n" +
      "  $u = Get-ADUser -Identity 'doris'\n" +
      "  if ($u.Enabled) { Set-ADAccountPassword -Reset ... }\n" +
      "  Start-Sleep -Seconds 300\n" +
      "  Disable-ADAccount -Identity 'doris'   # <- ?!\n" +
      "\n" +
      "It UNLOCKS Doris... and then LOCKS HER AGAIN 5 minutes later.\n" +
      "Why would anyone automate that?!",
  },
  {
    file: "keeper-trace.log (3/3)",
    text: "--- keeper-trace.log ---\n" +
      "Full path: C:\\Windows\\Scripts\\keeper.ps1\n" +
      "Created:   14 months ago (before your first day)\n" +
      "Author:    z\n" +
      "Last run:  tonight, 23:00\n" +
      "Next run:  tonight, 23:00\n" +
      "\n" +
      "z. One letter. 14 months. Doris's account. This goes deeper\n" +
      "than a ticket. One more click will open the whole truth.",
  },
];

function keeperClue() {
  if (!state.keeper) state.keeper = { clues: 0, done: false };
  if (state.keeper.done) {
    npadShow("keeper-trace.log (final)", "--- case closed ---\nkeeper.ps1 = Zora's script. It keeps Doris's account\nin a controlled lockout loop: unlock at night, re-lock at 6 AM.\n'Sometimes the system IS the bug.' — Z\n\nDon't tell HR. The tickets keep the department funded. 😉");
    return;
  }
  const clue = KEEPER_CLUES[state.keeper.clues % 3];
  state.keeper.clues++;
  npadShow(clue.file, clue.text);
  saveGame();
  if (state.keeper.clues >= 3) {
    state.keeper.done = true;
    saveGame();
    setTimeout(() => {
      cutscene.play([SCENE_KEEPER], () => {
        checkAchievements();
        termPrint("[🕵️] Case closed: keeper.ps1 is Zora's automation. Doris never stood a chance.", "t-warn");
      });
    }, 350);
  } else {
    notify({ icon: "🕵️", title: "keeper-trace.log", body: `Clue ${state.keeper.clues}/3 found. Something is scheduled at night…`, cls: "n-secret" });
  }
  checkAchievements();
}

/* ============================================================
   5. ACHIEVEMENTS
   ============================================================ */
const ACHIEVEMENTS = [
  { id: "first",     icon: "🥇", name: "First Blood",        desc: "Resolve your first ticket",            check: (s) => s.resolved.length >= 1 },
  { id: "ten",       icon: "🔟", name: "Double Digits",      desc: "Resolve 10 tickets",                   check: (s) => countResolved() >= 10 },
  { id: "hundred",   icon: "💯", name: "Century",            desc: "Handle 100 tickets",                   check: () => countResolved() >= 100 },
  { id: "t500",      icon: "🏆", name: "Ticket Machine",     desc: "Handle 500 tickets",                   check: () => countResolved() >= 500 },
  { id: "escalate",  icon: "⬆️", name: "Know Your Limits",   desc: "Escalate your first ticket",           check: (s) => s.escalated.length >= 1 },
  { id: "notes",     icon: "📝", name: "Documentation Hero", desc: "Write 10 good resolution notes",       check: (s) => s.stats.notesGood >= 10 },
  { id: "doris5",    icon: "🙃", name: "Doris-Proof",        desc: "Fix 5 of Doris's lockouts",            check: (s) => s.dorisCount >= 5 },
  { id: "aplus",     icon: "🎓", name: "Certified",          desc: "Pass the A+ exam",                     check: (s) => !!(s.quiz && s.quiz.aplus) },
  { id: "rank3",     icon: "🎖️", name: "Real Admin",         desc: "Reach Junior Sysadmin",                check: (s) => s.rank >= 3 },
  { id: "branch",    icon: "🧭", name: "Career Crossroads",  desc: "Choose your specialization",           check: (s) => !!s.branch },
  { id: "keeper",    icon: "🕵️", name: "Who Is keeper.ps1?", desc: "Find all keeper.ps1 clues",            check: (s) => !!(s.keeper && s.keeper.done) },
  { id: "dorisarc",  icon: "🦸", name: "Doris Savior",       desc: "Survive the Doris Incident",           check: (s) => s.story && s.story.dorisArc === true },
];

function checkAchievements() {
  if (!state.achievements) state.achievements = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements.includes(a.id)) continue;
    let ok = false;
    try { ok = a.check(state); } catch (e) {}
    if (ok) {
      state.achievements.push(a.id);
      saveGame();
      notify({ icon: a.icon, title: `Achievement: ${a.name}`, body: a.desc, cls: "n-ach" });
      SFX.ding();
    }
  }
}

function achCount() {
  return (state.achievements || []).length + " / " + ACHIEVEMENTS.length;
}

function achRender() {
  const box = document.getElementById("ach-panel");
  if (!box) return;
  box.innerHTML =
    `<div class="ach-head">🏆 Achievements — ${achCount()}</div>` +
    ACHIEVEMENTS.map((a) => {
      const got = (state.achievements || []).includes(a.id);
      return `<div class="ach ${got ? "got" : "locked"}">
        <span class="ach-ico">${got ? a.icon : "🔒"}</span>
        <span><b>${a.name}</b><span class="ach-desc">${a.desc}</span></span>
      </div>`;
    }).join("");
}

/* ============================================================
   6. SAVE EXPORT / IMPORT
   ============================================================ */
function saveExport() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ticketquest-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  notify({ icon: "💾", title: "Save exported", body: "ticketquest-save.json downloaded. Keep it safe!", cls: "n-good" });
}

function saveImport(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!data || typeof data !== "object" || !data.player || typeof data.xp !== "number") {
        throw new Error("bad save");
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      location.reload();
    } catch (e) {
      toast("⚠️ Not a valid TicketQuest save file.", "toast-danger");
    }
  };
  r.readAsText(file);
}

/* ============================================================
   wiring — spustí sa pri štarte hry
   ============================================================ */
(function featuresInit() {
  // bell + notif center
  document.getElementById("btn-bell")?.addEventListener("click", () => { SFX.click(); openNotifCenter(); });
  // Show desktop
  document.getElementById("btn-showdesktop")?.addEventListener("click", () => {
    SFX.click();
    if (typeof os.minimizeAll === "function") os.showDesktop();
  });
  // klik mimo notif center ho zavrie
  document.getElementById("desktop-view")?.addEventListener("mousedown", (e) => {
    if (e.target.closest("#notif-center") || e.target.closest("#btn-bell")) return;
    document.getElementById("notif-center")?.classList.add("hidden");
  });
})();
