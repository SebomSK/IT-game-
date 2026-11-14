/* ===== TicketQuest — D:\ disk: logy a dôkazy k nočnej záhade (keeper.ps1) =====
   Hráč číta ako analytik: koreluje časy, event ID a autorov. Súbory sa pridávajú do FS (sim.js)
   a FILE_TEXT (apps.js) za behu — načítať až po nich. */

const EVIDENCE_FILES = ["security-export.log", "taskscheduler.log", "timeline.txt"];

const EVIDENCE_TEXT = {
  "security-export.log":
    "SECURITY LOG EXPORT — SRV-DC01 — filter: account 'doris' + scheduled tasks\n" +
    "Time                 EventID  Description\n" +
    "-------------------  -------  ----------------------------------------------------------\n" +
    "2025-09-12 14:02:11  4672     Special privileges assigned to new logon. Account: PIXLCORP\\z\n" +
    "2025-09-12 14:02:11  4698     A scheduled task was created. Task: \\Scripts\\keeper  Creator: PIXLCORP\\z\n" +
    "2026-11-09 23:00:02  4722     A user account was enabled.   Target: doris  Subject: SYSTEM\n" +
    "2026-11-09 23:00:02  4724     Password reset attempt.       Target: doris  Subject: SYSTEM\n" +
    "2026-11-09 23:05:03  4725     A user account was disabled.  Target: doris  Subject: SYSTEM\n" +
    "2026-11-10 06:00:01  4740     Account locked out.           Target: doris  Caller: (internal)\n" +
    "2026-11-10 23:00:02  4722     A user account was enabled.   Target: doris  Subject: SYSTEM\n" +
    "2026-11-10 23:05:03  4725     A user account was disabled.  Target: doris  Subject: SYSTEM\n" +
    "... 412 more entries with the identical pattern, every night since 2025-09-12 ...\n\n" +
    "[Note] Events 4722/4725 come from SYSTEM — a scheduled task, not a person at a keyboard.",
  "taskscheduler.log":
    "TASK SCHEDULER — \\Scripts\\keeper\n" +
    "Author:      PIXLCORP\\z\n" +
    "Created:     2025-09-12 14:02\n" +
    "Trigger:     Daily at 23:00\n" +
    "Run as:      SYSTEM   (RunLevel: Highest)\n" +
    "Action:      powershell.exe -ExecutionPolicy Bypass -File C:\\Windows\\Scripts\\keeper.ps1\n" +
    "Last result: 0x0 (success)   Next run: tonight 23:00\n\n" +
    "[Auditor's note] 'Run as SYSTEM' + 'Highest' + '-ExecutionPolicy Bypass' + an unnamed single-letter\n" +
    "author are the combination that makes a scheduled task suspicious in a real review.",
  "timeline.txt":
    "INVESTIGATION TIMELINE (your working copy)\n" +
    "Rule: never edit the originals — work on copies. In real cases you also record a hash:\n" +
    "  Get-FileHash D:\\Logs\\security-export.log -Algorithm SHA256\n\n" +
    "When                 What                                        Who      Meaning\n" +
    "2025-09-12 14:02     Scheduled task 'keeper' created             z        the cause exists 14 months\n" +
    "every day 23:00      Doris enabled + password reset (4722/4724) SYSTEM   automation, not Doris\n" +
    "every day 23:05      Doris disabled again (4725)                 SYSTEM   deliberate loop\n" +
    "every day 06:00      Lockout 4740, caller (internal)             system   the 'mystery' lockouts\n\n" +
    "QUESTIONS to answer (think, then check the Learn app → Lessons → 'Account lockouts'):\n" +
    " 1. Why does every incident happen at the same time of day?   (answer: it is scheduled)\n" +
    " 2. Which single event ID proves a task was created?          (answer: 4698)\n" +
    " 3. Who benefits from the loop?                               (answer: see Zora's note)\n",
  "how-to-read-logs.txt":
    "HOW TO READ SECURITY LOGS (a real analyst's routine)\n" +
    " 1. Pick the object you care about (a user, a host, an IP).\n" +
    " 2. Filter by event ID, sort by time.\n" +
    " 3. Look for REGULARITY — humans are irregular, scripts are not.\n" +
    " 4. Look at WHO (Subject) and WHERE (source/caller).\n" +
    " 5. Find the FIRST occurrence — that is usually where the cause is.\n\n" +
    "Common Windows event IDs:\n" +
    "  4624 logon OK · 4625 logon failed · 4720 account created · 4722 enabled · 4725 disabled\n" +
    "  4724 password reset attempt · 4740 locked out · 4767 unlocked · 4698 scheduled task created\n" +
    "  4672 special privileges assigned · 4688 process created\n",
  "archive-readme.txt":
    "D:\\Archive holds data of departed users (kept until the retention period ends).\n" +
    "Policy: disable first, archive the data, delete later. See the Learn app → 'Offboarding'.",
  "budget-2026.xlsx": "(Binary .xlsx — Notepad shrugs. Finance data: access is limited to the Accounting group.)",
};

Object.assign(FS, {
  "D:\\": ["Logs", "Evidence", "Shares", "Archive"],
  "D:\\Logs": ["security-export.log", "taskscheduler.log"],
  "D:\\Evidence": ["timeline.txt", "how-to-read-logs.txt"],
  "D:\\Shares": ["Finance", "Public"],
  "D:\\Shares\\Finance": ["budget-2026.xlsx"],
  "D:\\Shares\\Public": [],
  "D:\\Archive": ["archive-readme.txt"],
});
Object.assign(FILE_TEXT, EVIDENCE_TEXT);

/* volá sa pri otvorení súboru (Notepad aj terminál) */
function evidenceRead(name) {
  if (!EVIDENCE_FILES.includes(name)) return;
  if (!Array.isArray(state.evidence)) state.evidence = [];
  if (state.evidence.includes(name)) return;
  state.evidence.push(name);
  saveGame();
  const n = state.evidence.length;
  if (n < EVIDENCE_FILES.length) {
    notify({ icon: "🔎", title: "Evidence found", body: `${name} — ${n}/${EVIDENCE_FILES.length}. Correlate timestamps, users and event IDs.`, cls: "n-secret" });
  } else {
    state.xp += 25;
    saveGame();
    renderTopbar();
    notify({ icon: "🕵️", title: "Investigation complete (+25 XP)", body: "You built a timeline: a scheduled task by 'z' toggles Doris's account every night. That is how real log analysis works.", cls: "n-good" });
    SFX.ding();
  }
}
