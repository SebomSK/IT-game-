/* ===== TicketQuest — simulated Windows Server (terminal engine) ===== */

const HOST = "SRV-DC01";
const ATTACKER_IP = "10.0.13.66";
const attackerBlocked = () => state.server.blocked.includes(ATTACKER_IP);

const EVENTLOG_SECURITY = [
  { t: "08:02:11", id: 4625, txt: "Failed logon  user=administrator  source=10.0.13.66", n: "×14" },
  { t: "08:04:39", id: 4625, txt: "Failed logon  user=administrator  source=10.0.13.66", n: "×22" },
  { t: "08:05:07", id: 4624, txt: "Successful logon  user=jane  source=10.0.0.57", n: "" },
  { t: "08:11:52", id: 4625, txt: "Failed logon  user=administrator  source=10.0.13.66", n: "×31" },
  { t: "08:14:20", id: 4625, txt: "Failed logon  user=administrator  source=10.0.13.66", n: "×48" },
  { t: "08:15:02", id: 4740, txt: "Account locked  user=doris  source=(internal)", n: "" },
  { t: "08:21:44", id: 4625, txt: "Failed logon  user=administrator  source=10.0.13.66", n: "×67" },
];

function runCommand(raw) {
  const line = raw.trim();
  if (!line) return;
  const parts = line.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "help":            cmdHelp(); break;
    case "cls":
    case "clear":           termClear(); break;
    case "whoami":          termPrint(`pixlcorp\\${state.player.login || "admin"}`); break;
    case "hostname":        termPrint(HOST); break;
    case "dir":             cmdDir(args); break;
    case "cd":              cmdCd(args); break;
    case "type":
    case "cat":             cmdType(args); break;
    case "ipconfig":        cmdIpconfig(args); break;
    case "ping":            cmdPing(args); break;
    case "nslookup":        cmdNslookup(args); break;
    case "net":             cmdNet(args); break;
    case "get-service":     cmdGetService(args); break;
    case "start-service":   cmdStartService(args); break;
    case "restart-service": cmdStartService(args); break;
    case "get-mailbox":     cmdGetMailbox(args); break;
    case "set-mailbox":     cmdSetMailbox(args); break;
    case "icacls":          cmdIcacls(args); break;
    case "robocopy":        cmdRobocopy(args); break;
    case "wds-deploy":      cmdWdsDeploy(args); break;
    case "add-computer":    cmdAddComputer(args); break;
    case "eventlog":        cmdEventlog(args); break;
    case "block-ip":        cmdBlockIp(args); break;
    case "tickets":         cmdTickets(); break;
    case "resolve":         cmdResolve(args); break;
    case "escalate":        cmdEscalate(args); break;
    case "reboot":          cmdReboot(args); break;
    case "stats":           cmdStats(); break;
    case "sudo":            termPrint("sudo? This isn't Linux. But I respect the courage. 😄", "t-dim"); break;
    case "coffee":          termPrint("☕ +1 coffee. Productivity +5. Doris wants one too.", "t-dim"); break;
    case "exit":
    case "logout":          termPrint("You can't escape. The tickets will always find you. 😏", "t-dim"); break;
    case "hack":            termPrint(["A proper hacker uses the SOP binder. 😉", "Hacking = Ctrl+C, Ctrl+V with confidence.", "Try 'coffee'. It's the best exploit."][Math.floor(Math.random() * 3)], "t-dim"); break;
    default:
      termPrint(`'${cmd}' is not recognized as a command. Try <b>help</b>.`, "t-err");
  }
}

/* look up a ticket among static and dynamic (Doris) ones */
function findTicket(id) {
  return TICKETS.find((x) => x.id === id) ||
         (state.dorisTickets || []).find((x) => x.id === id) || null;
}

function cmdReboot(args) {
  const name = (args[0] || "").toUpperCase();
  const w = state.server.wds[name];
  if (!w) { termPrint(`Machine '${name}' is unknown.`, "t-err"); return; }
  if (w.rebooted) { termPrint(`${name} has already been rebooted.`, "t-dim"); return; }
  w.rebooted = true;
  saveGame();
  termPrint(`Rebooting ${name}...`, "t-warn");
  termPrint("Sent 2/2 restarts.");
  termPrint(`[OK] ${name} — rebooted.`, "t-ok");
}

function cmdStats() {
  const s = careerStats();
  termPrint("=== YOUR CAREER @ PIXL CORP ===", "t-warn");
  termPrint(`Tickets resolved:    ${s.resolvedCount}`);
  termPrint(`Escalated:           ${s.esc}`);
  termPrint(`On-time SLA (T1):    ${s.slaPct}%`);
  termPrint(`Avg time per ticket: ${s.avgMin} min`);
  termPrint(`Resolution notes:    ${s.notes}`);
  termPrint(`Doris lockouts:      ${s.doris}× 😄`);
  termPrint("Full details + CV export: 📊 button in the top bar.", "t-dim");
}

/* ---------- commands ---------- */

function cmdHelp() {
  const rows = [
    ["help",                 "list of commands"],
    ["whoami / hostname",    "who you are / which server"],
    ["dir, cd, type",        "file system"],
    ["ipconfig [/renew]",    "network configuration"],
    ["ping <host>",          "connectivity test"],
    ["net user [u] [pass] [/active:yes|/add]", "user management"],
    ["net group [g] [u] [/add|/remove]",       "group management"],
    ["icacls <path> [/grant u:R]",             "NTFS permissions"],
    ["get-service [name]",   "service status"],
    ["start-service <name>", "start a service"],
    ["get-mailbox <u>",      "mailbox status"],
    ["set-mailbox <u> <GB>", "change mailbox quota"],
    ["robocopy <src> <dst> /E", "move data"],
    ["wds-deploy <PC>",      "deploy a workstation via WDS"],
    ["add-computer <PC>",    "join a PC to the domain"],
    ["eventlog security|system", "view logs"],
    ["block-ip <IP>",        "firewall rule"],
    ["reboot <PC>",          "reboot a workstation"],
    ["stats",                "your career in numbers"],
    ["tickets",              "list of tickets"],
    ["resolve <ID>",         "mark a ticket as resolved"],
    ["escalate <ID>",        "escalate to Tier 2"],
    ["cls",                  "clear the screen"],
  ];
  termPrint("AVAILABLE COMMANDS (server SRV-DC01):", "t-warn");
  for (const [c, d] of rows) termPrint(`  ${c.padEnd(42)} ${d}`);
}

let cwd = "C:\\Users\\admin";
const FS = {
  "C:\\": ["Users", "Windows", "Reports", "IT-SOP", "Logs"],
  "C:\\Users\\admin": ["Desktop", "Documents"],
  "C:\\Reports": ["week1.txt", "todo.txt"],
  "C:\\IT-SOP": ["day-one.docx", "password-sop.txt"],
  "C:\\Logs": ["vpn.log"],
};

function cmdDir(args) {
  const target = FS[cwd] ? cwd : "C:\\";
  termPrint(` Directory of ${target}\n`);
  FS[target].forEach((f) => termPrint(`  ${f}`));
}

function cmdCd(args) {
  if (!args[0] || args[0] === "\\") { cwd = "C:\\"; termPrint(cwd); return; }
  let dest = cwd.endsWith("\\") ? cwd + args[0] : cwd + "\\" + args[0];
  dest = dest.replace(/\\+$/, "");
  if (FS[dest] || ["C:\\Users", "C:\\Windows"].includes(dest)) {
    cwd = dest; termPrint(cwd);
  } else {
    termPrint(`Directory not found: ${dest}`, "t-err");
  }
}

function cmdType(args) {
  if (!args[0]) { termPrint("Usage: type <file>", "t-err"); return; }
  const f = args[0].toLowerCase();
  if (f === "todo.txt") {
    termPrint("[TODO]\n - fix the coffee machine, 2nd floor (IT priority!)\n - DEFEAT THE BRUTE-FORCER", "t-dim");
  } else if (f === "week1.txt") {
    termPrint("Week 1 at PIXL Corp: survived. Victory: the spooler.", "t-dim");
  } else if (f === "vpn.log") {
    termPrint(`--- VPN log (latest entries) ---
2026-11-12 21:14  ERROR  RADIUS timeout: IAS not responding (10.0.0.1:1812)
2026-11-12 21:15  ERROR  RADIUS timeout: IAS not responding (10.0.0.1:1812)
2026-11-12 21:16  WARN   3 consecutive auth failures — service degraded`, "t-dim");
    termPrint("💡 RADIUS = the IAS service. Check its status: 'get-service ias'", "t-warn");
  } else if (f === "password-sop.txt") {
    termPrint("SOP: Always reset passwords, NEVER send the old one. Minimum 10 characters.", "t-dim");
  } else {
    termPrint(`File '${args[0]}' doesn't exist (or it's a .docx the terminal can't read).`, "t-err");
  }
}

function cmdIpconfig(args) {
  const n = state.server.network;
  if (args[0] && args[0].toLowerCase() === "/renew") {
    if (n.renewed) { termPrint("The IP address has already been renewed.", "t-dim"); return; }
    n.ip = "10.0.0.57"; n.dns = "10.0.0.1"; n.renewed = true;
    saveGame();
    termPrint("Renewing DHCP lease", "t-warn");
    termPrint("....................");
    termPrint("OK", "t-ok");
    cmdIpconfig([]);
    return;
  }
  termPrint(`
Windows IP Configuration

Ethernet adapter Ethernet0:
   Connection-specific DNS Suffix  . : pixlcorp.local
   IPv4 Address. . . . . . . . . . . : ${n.ip}
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : ${n.gateway}
   DNS Servers . . . . . . . . . . . : ${n.dns}`);
  if (n.ip.startsWith("169.254.")) {
    termPrint("\n⚠️  APIPA (169.254.x.x) — the server didn't get an address from DHCP. Try 'ipconfig /renew'.", "t-warn");
  }
}

function cmdPing(args) {
  if (!args[0]) { termPrint("Usage: ping <host>", "t-err"); return; }
  const host = args[0].toLowerCase();
  const n = state.server.network;
  const reachable =
    host === "localhost" || host === HOST ? true :
    host === n.gateway || host === "10.0.0.1" ? true :
    host === "8.8.8.8" ? n.renewed : false;

  for (let i = 0; i < 4; i++) {
    termPrint(reachable
      ? `Reply from ${host === "8.8.8.8" ? "8.8.8.8" : n.gateway}: bytes=32 time=${8 + i}ms TTL=118`
      : `Request timed out.`, reachable ? "" : "t-err");
  }
  termPrint(reachable
    ? `\nPing statistics: Sent = 4, Received = 4, Lost = 0 (0% loss)`
    : `\nPing statistics: Sent = 4, Received = 0, Lost = 4 (100% loss)`, reachable ? "t-ok" : "t-err");
}

function cmdNslookup(args) {
  if (state.server.network.renewed) {
    termPrint(`Server:  dns.pixlcorp.local\nAddress: 10.0.0.1\n\nName:    ${args[0] || "pixlcorp.local"}\nAddress: 93.184.216.34`);
  } else {
    termPrint("DNS request timed out. (The network isn't OK — see ipconfig.)", "t-err");
  }
}

function cmdNet(args) {
  if (!args[0]) { termPrint("Available: net user [...], net group [...]", "t-err"); return; }
  const sub = args[0].toLowerCase();
  if (sub === "user") cmdNetUser(args.slice(1));
  else if (sub === "group") cmdNetGroup(args.slice(1));
  else termPrint("Available: net user [...], net group [...]", "t-err");
}

function cmdNetUser(a) {
  const users = state.server.users;
  const name = (a[0] || "").toLowerCase();
  const flags = a.filter((x) => x.startsWith("/")).map((x) => x.toLowerCase());

  if (!name) {
    termPrint("User accounts for \\\\" + HOST + "\n");
    Object.keys(users).forEach((u) => termPrint(`  ${u}`));
    termPrint("\nTip: 'net user <name>' shows details.", "t-dim");
    return;
  }

  // create: net user <name> <password> /add
  const passArg = a.find((x, i) => i >= 1 && !x.startsWith("/") && x !== undefined);
  if (flags.includes("/add")) {
    if (!passArg) { termPrint("Usage: net user <name> <password> /add", "t-err"); return; }
    if (users[name]) { termPrint(`User '${name}' already exists.`, "t-err"); return; }
    if (passArg.length < 8) { termPrint("The password entered is too short. Minimum 8 characters.", "t-err"); return; }
    users[name] = { active: true, changed: true, desc: name.charAt(0).toUpperCase() + name.slice(1) + " (new employee)" };
    saveGame();
    termPrint(`The command completed successfully. (Account '${name}' created.)`, "t-ok");
    return;
  }

  if (!users[name]) { termPrint(`User '${name}' not found.`, "t-err"); return; }

  // password reset: net user <name> <password>
  if (passArg && !passArg.startsWith("/")) {
    if (passArg.length < 8) { termPrint("The password entered is too short. Minimum 8 characters.", "t-err"); return; }
    users[name].changed = true;
    saveGame();
    termPrint(`The command completed successfully. (Password for '${name}' changed.)`, "t-ok");
    return;
  }

  // unlock / enable / disable
  if (flags.includes("/active:yes")) {
    users[name].active = true; saveGame();
    termPrint("The command completed successfully. (Account activated.)", "t-ok");
    return;
  }
  if (flags.includes("/active:no")) {
    users[name].active = false; saveGame();
    termPrint("The command completed successfully. (Account disabled.)", "t-ok");
    return;
  }

  const u = users[name];
  const groups = Object.keys(state.server.groups)
    .filter((g) => state.server.groups[g].includes(name)).join(", ") || "(none)";
  termPrint(`User name                    ${name}
Full Name                    ${u.desc}
Account active               ${u.active ? "Yes" : "No"}
Group Memberships            ${groups}
Password last set            ${u.changed ? "just now" : "3/12/2026 9:14 AM"}`);
  if (!u.active) termPrint("⚠️  Account is DISABLED/LOCKED.", "t-warn");
}

function cmdNetGroup(a) {
  const groups = state.server.groups;
  const g = (a[0] || "").toLowerCase();
  const keys = Object.keys(groups).map((k) => k.toLowerCase());
  if (!g) {
    termPrint("Groups on " + HOST + "\n");
    keys.forEach((k) => termPrint(`  ${k}`));
    termPrint("\nTip: 'net group <group>' shows members.", "t-dim");
    return;
  }
  const realKey = Object.keys(groups).find((k) => k.toLowerCase() === g);
  if (!realKey) { termPrint(`Group '${g}' not found.`, "t-err"); return; }
  const user = (a[1] || "").toLowerCase();
  const flag = (a[2] || "").toLowerCase();

  if (!user) {
    termPrint(`Group name     ${realKey}\nMembers\n-------`);
    groups[realKey].forEach((m) => termPrint(`  ${m}`));
    return;
  }
  if (flag === "/add") {
    if (groups[realKey].includes(user)) { termPrint("User is already a member.", "t-dim"); return; }
    if (!state.server.users[user]) { termPrint(`User '${user}' not found.`, "t-err"); return; }
    groups[realKey].push(user);
    saveGame();
    termPrint(`The command completed successfully. (${user} → ${realKey})`, "t-ok");
    return;
  }
  if (flag === "/remove") {
    if (!groups[realKey].includes(user)) { termPrint("User is not a member.", "t-dim"); return; }
    groups[realKey] = groups[realKey].filter((m) => m !== user);
    saveGame();
    termPrint(`The command completed successfully. (${user} removed from ${realKey})`, "t-ok");
    return;
  }
  termPrint("Usage: net group <group> [user] [/add|/remove]", "t-err");
}

function cmdGetService(args) {
  const svcs = state.server.services;
  const filter = (args[0] || "").toLowerCase();
  const list = filter ? [filter] : Object.keys(svcs);
  termPrint("\nStatus   Name           DisplayName");
  termPrint("------   ----           -----------");
  let found = false;
  for (const s of list) {
    if (!(s in svcs)) continue;
    found = true;
    termPrint(`${svcs[s].padEnd(9)}${s.padEnd(15)}${SERVICE_NAMES[s] || s}`);
  }
  if (!found) termPrint(`Service '${filter}' not found.`, "t-err");
  if (filter === "spooler" && svcs.spooler === "STOPPED") {
    termPrint("⚠️  The print service isn't running → 'start-service spooler'", "t-warn");
  }
  if (filter === "ias" && svcs.ias === "STOPPED") {
    termPrint("⚠️  RADIUS (IAS) is down → that's why VPN times out. 'start-service ias'", "t-warn");
  }
}

const SERVICE_NAMES = {
  spooler: "Print Spooler",
  wuauserv: "Windows Update",
  dnscache: "DNS Client",
  netlogon: "Netlogon",
  ias: "Internet Authentication Service (RADIUS)",
};

function cmdStartService(args) {
  const s = (args[0] || "").toLowerCase();
  const svcs = state.server.services;
  if (!(s in svcs)) { termPrint(`Service '${s}' not found.`, "t-err"); return; }
  if (svcs[s] === "RUNNING") { termPrint("The service is already running.", "t-dim"); return; }
  svcs[s] = "RUNNING";
  saveGame();
  termPrint(`[OK] Service '${s}' started.`, "t-ok");
}

function cmdGetMailbox(args) {
  const u = (args[0] || "").toLowerCase();
  const mb = state.server.mailbox[u];
  if (!mb) { termPrint(`Mailbox '${u}' not found.`, "t-err"); return; }
  termPrint(`Mailbox        ${u}
Items          2,841
Storage used   ${mb.used} GB / ${mb.quota} GB`);
  if (mb.used >= mb.quota) {
    termPrint("⚠️  Quota FULL → mail is stuck. Raise it: 'set-mailbox " + u + " 100'", "t-warn");
  }
}

function cmdSetMailbox(args) {
  const u = (args[0] || "").toLowerCase();
  const gb = parseInt(args[1], 10);
  const mb = state.server.mailbox[u];
  if (!mb) { termPrint(`Mailbox '${u}' not found.`, "t-err"); return; }
  if (!gb || gb <= 0) { termPrint("Usage: set-mailbox <u> <GB>", "t-err"); return; }
  mb.quota = gb;
  saveGame();
  termPrint(`[OK] Quota for '${u}' set to ${gb} GB.`, "t-ok");
}

function cmdIcacls(args) {
  const path = args[0];
  const shares = state.server.shares;
  const realKey = Object.keys(shares).find((k) => k.toLowerCase() === (path || "").toLowerCase().replace(/\\+$/, ""));
  if (!realKey) { termPrint(`Path '${path}' not found (check the format D:\\Shares\\<name>).`, "t-err"); return; }
  const acl = shares[realKey].ACL;

  if (args[1] && args[1].toLowerCase() === "/grant") {
    const grant = args[2] || "";
    const [user, perm] = grant.split(":");
    if (!user || !perm) { termPrint("Usage: icacls <path> /grant <user>:<R|M|F>", "t-err"); return; }
    if (!["R", "M", "F"].includes(perm.toUpperCase())) { termPrint("Unknown permission (allowed: R, M, F).", "t-err"); return; }
    const entry = `${user}:${perm.toUpperCase()}`;
    if (!acl.includes(entry)) acl.push(entry);
    saveGame();
    termPrint(`successfully processed 1 files; (granted ${entry} on ${realKey})`, "t-ok");
    return;
  }

  termPrint(realKey + "\n");
  acl.forEach((a) => termPrint("  " + a.padEnd(18) + "  " + (a.endsWith(":R") ? "(Read)" : a.endsWith(":M") ? "(Modify)" : "(Full)")));
  termPrint("\nTip: grant access → 'icacls " + realKey + " /grant <user>:R'", "t-dim");
}

function cmdRobocopy(args) {
  const src = (args[0] || "").toLowerCase();
  const dst = (args[1] || "").toLowerCase();
  if (!src || !dst) { termPrint("Usage: robocopy <src> <dst> /E", "t-err"); return; }
  if (src.includes("pavel") || src.includes("paul")) {
    if (!state.server.departed.includes("pavel")) state.server.departed.push("pavel");
    saveGame();
    termPrint(`-------------------------------------------------------------------------------
   ROBOCOPY     ::     Robust File Copy for Windows
-------------------------------------------------------------------------------
  1,247 files copied, 0 failed.
  ${dst} — done.`, "t-ok");
    return;
  }
  termPrint("1,247 files copied, 0 failed.", "t-ok");
}

function cmdWdsDeploy(args) {
  const name = (args[0] || "").toUpperCase();
  const w = state.server.wds[name];
  if (!w) { termPrint(`WDS: machine '${name}' is not in the pipeline. (Known: ${Object.keys(state.server.wds).join(", ")})`, "t-err"); return; }
  if (w.deployed) { termPrint("The image is already installed.", "t-dim"); return; }
  termPrint("Windows Deployment Services", "t-warn");
  termPrint("Boot image WIN11-CORP.wim  ..........  [OK]");
  termPrint("Applying image  ....................  [OK]");
  termPrint("Drivers & Office  ..................  [OK]");
  w.deployed = true;
  saveGame();
  termPrint(`[OK] ${name} — deployment done. Now 'add-computer ${name}'.`, "t-ok");
}

function cmdAddComputer(args) {
  const name = (args[0] || "").toUpperCase();
  const w = state.server.wds[name];
  if (!w) { termPrint(`Machine '${name}' is unknown.`, "t-err"); return; }
  if (!w.deployed) { termPrint("Deploy the image first: 'wds-deploy " + name + "'", "t-err"); return; }
  if (w.joined) { termPrint("The machine is already in the domain.", "t-dim"); return; }
  w.joined = true;
  saveGame();
  termPrint(`[OK] ${name} joined the domain PIXLCORP.`, "t-ok");
  termPrint("Welcome to the family, machine. 🤖", "t-dim");
}

function cmdEventlog(args) {
  const type = (args[0] || "security").toLowerCase();
  if (type !== "security" && type !== "system") {
    termPrint("Usage: eventlog security|system", "t-err"); return;
  }
  termPrint(`--- ${HOST} — ${type.toUpperCase()} log (latest entries) ---\n`, "t-warn");
  for (const e of EVENTLOG_SECURITY) {
    termPrint(`${e.t}  [${e.id}]  ${e.txt}  ${e.n}`);
  }
  if (!attackerBlocked()) {
    termPrint("\n🔴 New 4625 events are still coming from 10.0.13.66! → 'block-ip 10.0.13.66'", "t-err");
  } else {
    termPrint("\n🛡️  No new attempts from 10.0.13.66 — the attack looks stopped.", "t-ok");
  }
}

function cmdBlockIp(args) {
  const ip = args[0];
  if (!ip) { termPrint("Usage: block-ip <IP>", "t-err"); return; }
  if (state.server.blocked.includes(ip)) { termPrint(`IP ${ip} is already blocked.`, "t-dim"); return; }
  state.server.blocked.push(ip);
  saveGame();
  termPrint(`[OK] Firewall rule created: BLOCK inbound from ${ip}`, "t-ok");
  if (ip === ATTACKER_IP) termPrint("The log quietly thanked you. 🔥", "t-dim");
}

function cmdTickets() {
  termPrint("Active tickets:", "t-warn");
  const all = [...TICKETS, ...(state.dorisTickets || [])];
  for (const t of all) {
    const locked = ticketLocked(t);
    if (state.resolved.includes(t.id)) {
      termPrint(`  #${t.id}  ${t.subject}  [RESOLVED]`, "t-dim");
    } else if (state.escalated.includes(t.id)) {
      termPrint(`  #${t.id}  ${t.subject}  [ESCALATED]`, "t-dim");
    } else if (locked) {
      termPrint(`  #${t.id}  🔒 (unlocks at a higher rank)`, "t-dim");
    } else if (state.taken.includes(t.id)) {
      termPrint(`  #${t.id}  ${t.subject}  [ASSIGNED TO YOU]`, "t-ok");
    } else {
      termPrint(`  #${t.id}  ${t.subject}  [NEW]`);
    }
  }
  termPrint("Details + SOP: click a ticket in the office.", "t-dim");
}

function ticketLocked(t) {
  if (t.doris) return state.rank < 1;
  return t.slaMin !== null && state.rank < 1; // Tier 1 tickets unlock after promotion
}

function cmdResolve(args) {
  const id = parseInt(args[0], 10);
  const t = findTicket(id);
  if (!t) { termPrint(`Ticket '${args[0]}' doesn't exist.`, "t-err"); return; }
  if (state.resolved.includes(id)) { termPrint("Ticket is already resolved. ✔", "t-dim"); return; }
  if (state.escalated.includes(id)) { termPrint("Ticket was escalated — T2 is handling it. ⬆", "t-dim"); return; }
  if (ticketLocked(t)) { termPrint("You can't take this ticket yet (lower rank).", "t-err"); return; }
  if (t.phone && !state.phoneDone[id]) {
    termPrint("📞 Call the user first (button in the ticket detail) — diagnosis is 90% of the job.", "t-err");
    return;
  }
  if (!state.taken.includes(id)) {
    termPrint("You haven't taken this ticket yet — take it in the HelpDesk app (✋ TAKE TICKET).", "t-err");
    return;
  }
  if (t.check(state.server)) {
    let gain = t.xp;
    if (slaOverdue(t)) {
      gain = Math.round(gain * 0.5);
      state.overdue[id] = true;
      state.stats.slaMiss++;
      termPrint("⏰ The ticket was over SLA — the speed bonus is halved, but done is done.", "t-warn");
    }
    state.resolved.push(id);
    state.xp += gain;
    if (state.takenAt[id]) {
      state.stats.totalMin += Math.round((Date.now() - state.takenAt[id]) / 60000);
    }
    saveGame();
    termPrint(`✔ TICKET #${t.id} RESOLVED  (+${gain} XP)`, "t-ok");
    const confetti = ["*~ confetti ~* 🎉", "\\o/  \\o/  \\o/", "🎧 *victory fanfare*", "✨✨✨"];
    termPrint(confetti[Math.floor(Math.random() * confetti.length)], "t-dim");
    if (typeof SFX !== "undefined") SFX.ding();
    onTicketResolved(t);
  } else {
    termPrint(`✘ Ticket #${id} is NOT resolved yet. Check the SOP procedure in the ticket detail.`, "t-err");
    if (typeof SFX !== "undefined") SFX.err();
  }
}

function cmdEscalate(args) {
  const id = parseInt(args[0], 10);
  const t = findTicket(id);
  if (!t) { termPrint(`Ticket '${args[0]}' doesn't exist.`, "t-err"); return; }
  if (state.resolved.includes(id) || state.escalated.includes(id)) {
    termPrint("The ticket is already done. ✔", "t-dim"); return;
  }
  if (!state.taken.includes(id)) {
    termPrint("Take the ticket first (HelpDesk app → TAKE TICKET).", "t-err"); return;
  }
  const gain = Math.round(t.xp * 0.4);
  state.escalated.push(id);
  state.xp += gain;
  saveGame();
  termPrint(`⬆ Ticket #${id} escalated to Tier 2 (+${gain} XP).`, "t-ok");
  termPrint("This is standard practice — knowing your limits is a professional virtue.", "t-dim");
  onTicketEscalated(t);
}
