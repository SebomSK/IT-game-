/* ===== TicketQuest — SOC Console: alert triage (SIEM) ===== */
/* Nekonečne opakovateľný tréning: každý alert je iný (náhodné mená/IP/hostitelia),
   náročnosť rastie s rankom. Cieľ: naučiť sa rozlišovať false positive / true positive
   / eskaláciu — presne to, čo robí SOC analytik Tier 1. */

const SCENE_SIEM_INTRO = {
  id: "siem-intro",
  title: "SOC CONSOLE · FIRST LOOK",
  pov: "3rd",
  bg: "serverroom",
  sprites: [
    { who: "player", pos: "left" },
    { who: "zora", pos: "right" },
  ],
  lines: [
    { who: "zora", text: "This is the SOC Console. Every alert here was raised by a tool — and tools are wrong a lot." },
    { who: "zora", text: "Your job is not to react to every red light. Your job is to decide: is it real, is it harmless, or is it above your pay grade?" },
    { who: "you", text: "I have zero security experience. What if I get it wrong?" },
    { who: "zora", text: "Then you read the explanation and you get it right next time. Nobody starts as a threat hunter, {PLAYER}." },
    { who: "zora", text: "Three buttons: false positive, true positive, escalate. Look at WHO, WHAT, WHEN and whether it's normal. Hints are free while you're an intern." },
  ],
};

const SIEM_USERS = ["marek", "jana", "doris", "pavel", "elena.novak", "tomas.kovac"];
const SIEM_HOSTS = ["WKS-101", "WKS-115", "WKS-208", "WKS-212", "WKS-301", "WKS-317"];
const siemPick = (a) => a[Math.floor(Math.random() * a.length)];
const siemInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const SIEM_EXT_IP = () => siemPick(["45.132.8." + siemInt(2, 250), "185.220.101." + siemInt(2, 250), "10.0.13.66", "91.240.118." + siemInt(2, 250)]);
const SIEM_INT_IP = () => "10.0." + siemInt(0, 9) + "." + siemInt(10, 240);

/* verdict: "fp" | "tp" | "esc";  alsoOk: iné prijateľné rozhodnutia (pol XP) */
const SIEM_ALERTS = [
  /* ---------- TIER 0: očividné ---------- */
  { tier: 0, sev: "LOW", title: "Multiple failed logons for one user", verdict: "fp",
    hint: "How many attempts? From where? Is this user known to forget passwords?",
    make() {
      const u = siemPick(SIEM_USERS), h = siemPick(SIEM_HOSTS), n = siemInt(3, 5);
      return {
        source: "Windows Security · DC01", facts: [["User", u], ["Failures", n + " in 6 min"], ["Source", h + " (" + SIEM_INT_IP() + ", internal)"], ["Then", "SUCCESSFUL logon, password changed"]],
        logs: [`08:5${siemInt(0, 9)}:01  4625  FAILED   user=${u}  src=${h}`, `08:5${siemInt(0, 9)}:19  4625  FAILED   user=${u}  src=${h}`, `09:01:44  4624  OK       user=${u}  src=${h}`, `09:02:10  4723  PASSWORD CHANGED  user=${u}`],
        why: "False positive. A handful of failures from the user's own PC, followed by a successful logon and a password change, is a forgotten password — not an attack. Compare with a brute force: hundreds of attempts from one external IP.",
      };
    } },
  { tier: 0, sev: "HIGH", title: "Port scan detected from external IP", verdict: "tp", alsoOk: ["esc"],
    hint: "Hundreds of ports in seconds from outside the company — normal or not?",
    make() {
      const ip = SIEM_EXT_IP(), n = siemInt(900, 2400);
      return {
        source: "Firewall · edge-fw01", facts: [["Source", ip + " (external)"], ["Ports probed", n + " in 30 s"], ["Target", "DMZ / VPN gateway"], ["Allowed by rule", "no"]],
        logs: [`FW  DENY  ${ip} → 203.0.113.10:22`, `FW  DENY  ${ip} → 203.0.113.10:3389`, `FW  DENY  ${ip} → 203.0.113.10:445`, `... ${n - 3} more`],
        why: "True positive. A single external address sweeping many ports in seconds is reconnaissance — the first step of many attacks. The firewall already denied it, but you should block the source and note it. (Escalating is also acceptable.)",
      };
    } },
  { tier: 0, sev: "CRIT", title: "EDR: Office spawned PowerShell with encoded command", verdict: "tp", alsoOk: ["esc"],
    hint: "Why would a spreadsheet launch PowerShell with a hidden base64 command?",
    make() {
      const u = siemPick(SIEM_USERS), h = siemPick(SIEM_HOSTS);
      return {
        source: "EDR · " + h, facts: [["User", u], ["Parent", "EXCEL.EXE (Invoice_" + siemInt(1000, 9999) + ".xlsm)"], ["Child", "powershell.exe -enc JABjAGwAaQBlAG4AdAA…"], ["Origin", "email attachment, opened 1 min ago"]],
        logs: [`PROC  EXCEL.EXE → powershell.exe -nop -w hidden -enc JABjAGwA…`, `NET   powershell.exe → ${SIEM_EXT_IP()}:443`],
        why: "True positive. Office apps almost never spawn PowerShell, and -enc with a hidden window plus an outbound connection is a classic malicious-macro downloader. Isolate the host and disable the user. (Escalation is also fine for a CRITICAL alert.)",
      };
    } },
  { tier: 0, sev: "MED", title: "Vulnerability scanner traffic across the network", verdict: "fp",
    hint: "Is this scan expected? Look for a scheduled change or a known scanner address.",
    make() {
      const n = siemInt(2000, 9000), chg = "CHG-" + siemInt(2000, 2999);
      return {
        source: "IDS · core-switch", facts: [["Source", "10.0.0.5 (nessus-scanner01)"], ["Packets", n], ["Time", "02:00 (weekly window)"], ["Change ticket", chg + " — approved scan"]],
        logs: [`IDS  ET SCAN Nessus user-agent  src=10.0.0.5`, `NOTE scheduled: ${chg} 'weekly credentialed scan 02:00-03:00'`],
        why: "False positive. The source is the company's own scanner, running inside its approved change window. Knowing what is NORMAL (and checking the change calendar) is half of triage.",
      };
    } },
  { tier: 0, sev: "MED", title: "Scheduled task logon after hours: svc-keeper", verdict: "fp",
    hint: "How long has this been happening, and does it follow a strict schedule?",
    make() {
      return {
        source: "Windows Security · DC01", facts: [["Account", "svc-keeper"], ["Time", "23:00:04"], ["Logon type", "5 (service)"], ["Baseline", "identical event every night for 14 months"]],
        logs: ["23:00:02  4738  CHANGED  user=doris  task=\\Maintenance\\keeper", "23:00:04  4624  OK       user=svc-keeper  logontype=5", "06:00:01  4740  LOCKED   user=doris  task=\\Maintenance\\keeper"],
        why: "Known/benign pattern — but note it. A perfectly regular service logon matches the baseline, so it is not an intrusion. (Whether the task SHOULD exist is a different question… check D:\\Evidence.)",
      };
    } },

  /* ---------- TIER 1: potrebuje kontext ---------- */
  { tier: 1, sev: "HIGH", title: "Impossible travel: two countries in minutes", verdict: "tp", alsoOk: ["esc"],
    hint: "Can one person be in two far-away countries 12 minutes apart?",
    make() {
      const u = siemPick(SIEM_USERS);
      return {
        source: "Identity provider", facts: [["User", u], ["Logon A", "Košice, SK · 09:02"], ["Logon B", siemPick(["Hanoi, VN", "Lagos, NG", "São Paulo, BR"]) + " · 09:14"], ["MFA", "not requested on logon B"]],
        logs: [`SIGNIN  ${u}  SK  OK  mfa=yes`, `SIGNIN  ${u}  FOREIGN  OK  mfa=no (legacy protocol)`],
        why: "True positive. Same account, two distant countries, 12 minutes apart, and the second logon skipped MFA via a legacy protocol: stolen credentials. Disable the session, reset the password and review mailbox rules.",
      };
    } },
  { tier: 1, sev: "HIGH", title: "Large upload to personal cloud storage", verdict: "esc",
    hint: "This involves a person's job and company data — who else must be involved?",
    make() {
      const u = siemPick(SIEM_USERS), gb = (siemInt(30, 90) / 10).toFixed(1);
      return {
        source: "DLP · proxy", facts: [["User", u], ["Upload", gb + " GB to personal-drive.example"], ["Time", "18:10 (outside normal pattern)"], ["HR note", "user is in their notice period"]],
        logs: [`PROXY  ${u}  POST personal-drive.example  ${gb} GB`, `DLP    policy 'Finance data' matched 212 files`],
        why: "Escalate. Possible insider data theft. It touches HR and legal matters, and you must not accuse or investigate a colleague on your own. Preserve the evidence and hand it to Tier 2 / security management.",
      };
    } },
  { tier: 1, sev: "LOW", title: "Backup agent reading every file on FILE01", verdict: "fp",
    hint: "Reading ALL files is suspicious — unless something is supposed to do exactly that.",
    make() {
      return {
        source: "File audit · FILE01", facts: [["Account", "svc-backup"], ["Files read", siemInt(40000, 90000)], ["Time", "01:00–01:40"], ["Schedule", "nightly backup job BK-FILE01"]],
        logs: ["AUDIT  svc-backup  READ  D:\\Shares\\...  (x" + siemInt(40000, 90000) + ")", "JOB    BK-FILE01 started 01:00 · completed 01:38 · OK"],
        why: "False positive. A backup service account reading everything during the backup window is its job. If it happened at noon from a user account, the answer would be different.",
      };
    } },
  { tier: 1, sev: "CRIT", title: "New local administrator account created", verdict: "tp", alsoOk: ["esc"],
    hint: "Who created it, when, and was there any change ticket?",
    make() {
      const u = siemPick(["marek", "jana", "elena.novak"]), h = siemPick(SIEM_HOSTS);
      return {
        source: "Windows Security · " + h, facts: [["New account", "support2 (Administrators)"], ["Created by", u + " (standard user)"], ["Time", "03:12"], ["Change ticket", "none"]],
        logs: [`03:12:07  4720  USER CREATED  support2  by=${u}`, `03:12:09  4732  ADDED TO Administrators  support2`],
        why: "True positive. A standard user cannot normally create admins — so this is privilege escalation or a hijacked session, at 03:12 with no change ticket. Disable the account and contain the host. (Escalate is also acceptable.)",
      };
    } },
  { tier: 1, sev: "MED", title: "Thousands of odd DNS TXT queries", verdict: "tp", alsoOk: ["esc"],
    hint: "Random-looking subdomains of one strange domain, thousands of times…",
    make() {
      const h = siemPick(SIEM_HOSTS);
      return {
        source: "DNS · dc01", facts: [["Host", h], ["Queries", siemInt(2500, 6000) + " TXT in 1 h"], ["Domain", "*.x7f2k.xyz (registered 2 days ago)"], ["Normal for host?", "no"]],
        logs: [`DNS  ${h}  TXT  a9f3b1c2.x7f2k.xyz`, `DNS  ${h}  TXT  0d44e7aa.x7f2k.xyz`, `DNS  ${h}  TXT  c81b9d03.x7f2k.xyz`],
        why: "True positive. Random subdomains + TXT records + a brand-new domain is DNS tunnelling: malware smuggling data or commands inside DNS. Isolate the host, block the domain, and escalate if more hosts show it.",
      };
    } },
  { tier: 1, sev: "LOW", title: "USB storage connected to reception PC", verdict: "fp",
    hint: "Check whether the device is on the approved list.",
    make() {
      return {
        source: "Endpoint control · WKS-101", facts: [["Device", "Kingston 32 GB (serial matched)"], ["Whitelist", "APPROVED — HR badge printer kit"], ["User", "reception"], ["Time", "10:20 (working hours)"]],
        logs: ["USB  connect  Kingston DT  serial=...A91F  policy=ALLOW (whitelist)"],
        why: "False positive. The device is on the approved whitelist and was used in working hours by the right person. Blocking everything makes users work around security.",
      };
    } },

  /* ---------- TIER 2: ransomware & identity ---------- */
  { tier: 2, sev: "CRIT", title: "Shadow copies deleted on a workstation", verdict: "tp", alsoOk: ["esc"],
    hint: "Who deletes backups silently, in the middle of the day, from a user PC?",
    make() {
      const u = siemPick(SIEM_USERS), h = siemPick(SIEM_HOSTS);
      return {
        source: "EDR · " + h, facts: [["User", u], ["Command", "vssadmin delete shadows /all /quiet"], ["Parent", "cmd.exe ← unknown.exe (Temp)"], ["Admin task?", "no change ticket"]],
        logs: [`PROC  unknown.exe → cmd.exe /c vssadmin delete shadows /all /quiet`, `PROC  unknown.exe → bcdedit /set {default} recoveryenabled no`],
        why: "True positive — a ransomware precursor. Attackers delete shadow copies and disable recovery BEFORE encrypting. Isolate the host immediately, then escalate to incident response.",
      };
    } },
  { tier: 2, sev: "LOW", title: "vssadmin used on backup server", verdict: "fp",
    hint: "Which exact vssadmin action? Listing is not the same as deleting.",
    make() {
      return {
        source: "EDR · SRV-FILE01", facts: [["User", "svc-backup"], ["Command", "vssadmin list shadows"], ["Parent", "backup-agent.exe"], ["Window", "01:00 backup job"]],
        logs: ["PROC  backup-agent.exe → vssadmin list shadows", "JOB   BK-FILE01 snapshot verified"],
        why: "False positive. 'list' only READS the shadow copies, run by the backup agent inside its job. The scary tool name was the only suspicious thing here — always read the full command line.",
      };
    } },
  { tier: 2, sev: "CRIT", title: "Mass file rename to .locked on file server", verdict: "tp", alsoOk: ["esc"],
    hint: "Thousands of files changing extension within a minute…",
    make() {
      const n = siemInt(1500, 5200);
      return {
        source: "File audit · SRV-FILE01", facts: [["Files renamed", n + " in 60 s"], ["New extension", ".locked"], ["Account", siemPick(SIEM_USERS) + " (via SMB)"], ["Ransom note", "README_RESTORE.txt appeared in 14 folders"]],
        logs: ["AUDIT  RENAME  Q3-report.xlsx → Q3-report.xlsx.locked", "AUDIT  CREATE  README_RESTORE.txt", "AUDIT  RENAME  ...  (x" + n + ")"],
        why: "True positive — active ransomware. Cut the account and the SMB session NOW, isolate the server, and escalate to the incident lead. Do not 'investigate more' while files burn.",
      };
    } },
  { tier: 2, sev: "HIGH", title: "Offboarded user logged in over VPN", verdict: "esc",
    hint: "Their account should be disabled. So what logged in — and how?",
    make() {
      return {
        source: "VPN gateway", facts: [["User", "pavel (offboarded 2 weeks ago)"], ["Result", "SUCCESS"], ["Source", SIEM_EXT_IP()], ["Account state", "disable flag missing in one directory"]],
        logs: ["VPN  pavel  OK  from external", "AD   pavel  enabled=TRUE (replication lag?)"],
        why: "Escalate. A former employee's credentials worked, which means a process failed (offboarding) and possibly data is at risk. Disable the account yourself if you can, but this needs Tier 2 / management and a post-incident review.",
      };
    } },
  { tier: 2, sev: "MED", title: "Burst of Kerberos service ticket requests", verdict: "esc",
    hint: "One normal user asking for tickets to MANY service accounts…",
    make() {
      const u = siemPick(SIEM_USERS), h = siemPick(SIEM_HOSTS);
      return {
        source: "Windows Security · DC01", facts: [["User", u], ["Requests", siemInt(60, 140) + " TGS in 90 s"], ["Targets", "all service accounts (SPNs)"], ["Host", h]],
        logs: [`4769  TGS  user=${u}  svc=MSSQLSvc/sql01  enc=RC4`, `4769  TGS  user=${u}  svc=HTTP/intranet  enc=RC4`, "... (many more)"],
        why: "Escalate. This looks like Kerberoasting — an attacker requesting service tickets to crack offline. It is subtle and needs senior analysis of the account and downstream exposure.",
      };
    } },

  /* ---------- TIER 3: lateral movement ---------- */
  { tier: 3, sev: "CRIT", title: "PsExec service installed on multiple hosts", verdict: "tp", alsoOk: ["esc"],
    hint: "The same remote-execution service appearing on several machines in minutes.",
    make() {
      const hosts = [siemPick(SIEM_HOSTS), siemPick(SIEM_HOSTS), "SRV-FILE01"].filter((v, i, a) => a.indexOf(v) === i);
      return {
        source: "EDR · fleet", facts: [["Service", "PSEXESVC installed"], ["Hosts", hosts.join(", ")], ["From", siemPick(SIEM_HOSTS) + " using an admin account"], ["Change ticket", "none"]],
        logs: hosts.map((h) => `7045  SERVICE INSTALLED  PSEXESVC  on ${h}`),
        why: "True positive — lateral movement. An attacker with admin credentials is hopping between machines. Contain the source host, reset the admin credentials and escalate: this is now a full incident.",
      };
    } },
];

const siem = (() => {
  let current = null;       // { def, data, answered }
  let usedHint = false;
  let box = null;

  const SEV_COLOR = { LOW: "sev-low", MED: "sev-med", HIGH: "sev-high", CRIT: "sev-crit" };
  const XP_BY_TIER = [6, 10, 16, 24];
  const TIER_NAMES = ["Intern training", "Tier 1", "Tier 2", "Tier 3"];

  function allowedTier() {
    const r = state.rank || 0;
    if (r >= 3) return 3;
    if (r === 2) return 2;
    if (r === 1) return 1;
    return 0;
  }

  function stats() {
    if (!state.siem) state.siem = { done: 0, correct: 0, streak: 0, best: 0 };
    return state.siem;
  }

  function nextAlert() {
    const t = allowedTier();
    // väčšia šanca na najvyššiu odomknutú úroveň, ale miešame aj ľahšie
    const pool = SIEM_ALERTS.filter((a) => a.tier <= t);
    const weighted = [];
    pool.forEach((a) => { for (let i = 0; i < 1 + (a.tier === t ? 2 : 0); i++) weighted.push(a); });
    let def;
    for (let tries = 0; tries < 6; tries++) {
      def = siemPick(weighted);
      if (!current || def !== current.def) break;
    }
    current = { def, data: def.make(), answered: false };
    usedHint = false;
  }

  function xpFor(def, half) {
    const s = stats();
    let xp = XP_BY_TIER[def.tier] + Math.min(5, s.streak);
    if (s.done >= 40) xp = Math.max(2, Math.floor(xp / 2));     // proti farmeniu XP
    if (usedHint && (state.rank || 0) >= 1) xp = Math.max(1, Math.floor(xp * 0.6));
    return half ? Math.max(1, Math.floor(xp / 2)) : xp;
  }

  function decide(choice) {
    if (!current || current.answered) return;
    const { def } = current;
    const s = stats();
    const exact = choice === def.verdict;
    const ok = !exact && (def.alsoOk || []).includes(choice);
    current.answered = true;
    s.done++;
    if (typeof learn !== "undefined") learn.markSeen({ kind: "triage" });   // odomkne lekciu „SOC alert triage“ v Learn app
    let xp = 0;
    if (exact || ok) {
      s.correct++;
      s.streak = ok ? s.streak : s.streak + 1;
      s.best = Math.max(s.best, s.streak);
      xp = xpFor(def, ok);
      awardXp(xp);
      repAdd(ok ? 0 : 1);
      SFX.ding();
    } else {
      s.streak = 0;
      repAdd(-2);
      SFX.err();
    }
    current.result = { exact, ok, xp };
    saveGame();
    render();
    if (typeof checkAchievements === "function") checkAchievements();
  }

  const LABEL = { fp: "False positive", tp: "True positive", esc: "Escalate" };

  function render() {
    if (!box) return;
    const s = stats();
    if (!current) nextAlert();
    const { def, data, answered, result } = current;
    const acc = s.done ? Math.round((s.correct / s.done) * 100) : 0;
    box.innerHTML = `
      <div class="soc-head">
        <div class="soc-stat"><b>${s.done}</b><span>triaged</span></div>
        <div class="soc-stat"><b>${acc}%</b><span>accuracy</span></div>
        <div class="soc-stat"><b>${s.streak}🔥</b><span>streak</span></div>
        <div class="soc-stat"><b>${escHtml(TIER_NAMES[allowedTier()])}</b><span>queue level</span></div>
      </div>
      <div class="soc-alert ${SEV_COLOR[def.sev]}">
        <div class="soc-alert-top">
          <span class="soc-sev">${def.sev}</span>
          <span class="soc-title">${escHtml(def.title)}</span>
        </div>
        <div class="soc-src">${escHtml(data.source)}</div>
        <div class="soc-facts">${data.facts.map(([k, v]) => `<div class="soc-fact"><span>${escHtml(k)}</span><b>${escHtml(String(v))}</b></div>`).join("")}</div>
        <pre class="soc-log">${data.logs.map(escHtml).join("\n")}</pre>
      </div>
      ${answered ? "" : `
      <div class="soc-actions">
        <button class="soc-btn fp" data-v="fp">✅ False positive<small>harmless — close it</small></button>
        <button class="soc-btn tp" data-v="tp">🚨 True positive<small>real — contain it</small></button>
        <button class="soc-btn esc" data-v="esc">⬆ Escalate<small>beyond Tier 1</small></button>
      </div>
      <div class="soc-hintrow"><button class="ol-act" id="soc-hint">💡 Hint${(state.rank || 0) >= 1 ? " (−40% XP)" : " (free)"}</button><span id="soc-hint-text" class="soc-hint-text"></span></div>`}
      ${answered ? `
      <div class="soc-result ${result.exact ? "good" : result.ok ? "ok" : "bad"}">
        <b>${result.exact ? "✔ Correct" : result.ok ? "◐ Acceptable" : "✘ Not quite"} — answer: ${LABEL[def.verdict]}${result.xp ? ` · +${result.xp} XP` : ""}</b>
        <div>${escHtml(def.why)}</div>
        <div class="soc-result-btns"><button class="btn-primary" id="soc-next">Next alert →</button><button class="ol-act" id="soc-learn">📘 Real-world lesson</button></div>
      </div>` : ""}`;
    box.querySelectorAll("[data-v]").forEach((b) => { b.onclick = () => decide(b.dataset.v); });
    const hb = box.querySelector("#soc-hint");
    if (hb) hb.onclick = () => { usedHint = true; box.querySelector("#soc-hint-text").textContent = "💡 " + def.hint; SFX.click(); };
    const nb = box.querySelector("#soc-next");
    if (nb) nb.onclick = () => { nextAlert(); SFX.click(); render(); };
    const lb = box.querySelector("#soc-learn");
    if (lb) lb.onclick = () => { SFX.click(); os.openApp("learn"); };
  }

  function mount(body) {
    box = document.createElement("div");
    box.id = "soc-body";
    body.appendChild(box);
    render();
  }

  function onOpen() {
    if (!state.story.siemIntro) {
      state.story.siemIntro = true;
      saveGame();
      cutscene.play([SCENE_SIEM_INTRO], () => {});
    }
    render();
  }

  return { mount, onOpen, render };
})();

APPS.soc = {
  icon: "🛡️", label: "SOC Console", title: "🛡️ SOC Console — alert triage",
  desc: "Triage security alerts: false positive, true positive or escalate.",
  mount: (body) => siem.mount(body),
  onOpen: () => siem.onOpen(),
};
