/* ===== TicketQuest — grind engine: nekonečný prúd ticketov ===== */
/* Tickety sú generované procedurálne (data only — bez funkcií, aby prežili
   JSON save). check() sa hydratuje z GRIND_KINDS podľa `kind` pri načítaní. */

const GRIND_USERS = ["marek", "jana", "pavel", "petra.nova"];
const GRIND_GROUPS = ["Marketing", "Accounting", "Helpdesk", "Sales"];
const GRIND_FIRST = ["Elena", "Tomas", "Petra", "Lukas", "Maja", "Andrej", "Silvia", "Peter", "Nina", "Roman", "Klara", "Martin"];
const GRIND_LAST = ["Novak", "Kovac", "White", "Stern", "Bela", "Horvat", "Vlk", "Dubec", "Lang", "Marek"];
const GRIND_DEPTS = ["Marketing", "Accounting", "Sales", "HR", "Logistics"];
const GRIND_PCS = ["WKS-101", "WKS-115", "WKS-208", "WKS-212", "WKS-301", "WKS-317"];
const GRIND_SVCS = ["spooler", "wuauserv", "dnscache", "netlogon"];
const GRIND_BADIPS = ["10.0.13.66", "10.0.44.7", "10.0.99.3", "45.132.8.19"];
const GRIND_SVC_LABELS = {
  spooler: "Print Spooler", wuauserv: "Windows Update",
  dnscache: "DNS Client", netlogon: "Netlogon",
};

/* generuje login z mena: elena.novak */
function grindLogin(first, last) {
  return (first + "." + last).toLowerCase()
    .replace(/[^a-z.]/g, "").slice(0, 20);
}

/* deterministické pomocníčky pre nové druhy ticketov (musia dať rovnaký výsledok po načítaní save-u) */
function grindKb(p) { return "KB50" + (30000 + (p.id % 9000)); }
function grindDns(p) { return { name: "portal" + (p.id % 90 + 10), ip: "10.0.0." + (20 + (p.id % 60)) }; }
function grindBackupJob(p) {
  const jobs = [["FILE01", "volume shadow copy timeout"], ["MAIL01", "target disk full"], ["SQL01", "snapshot lock held by another process"]];
  const j = jobs[p.id % jobs.length];
  return { job: j[0], reason: j[1] };
}

/* ---------- definície druhov ticketov ---------- */
/* check(params)(srv) → bool; setup(params) pripraví stav servera */
const GRIND_KINDS = {
  /* ---- TIER 1 ---- */
  lockout: {
    tier: 1, prio: "HIGH", xp: 45, sla: 45,
    make(p) {
      return {
        subject: "Can't log in — account locked?!",
        body: `Hi IT, my account says "locked" and I really need to work. It's urgent!\n— ${p.full}`,
        sop: [
          `Check the account: <code>net user ${p.user}</code> — or <code>get-aduser ${p.user}</code>`,
          `Unlock it: <code>net user ${p.user} /active:yes</code> — or <code>unlock-adaccount ${p.user}</code>`,
          `Set a fresh password: <code>net user ${p.user} Welcome2026!</code> — or <code>set-adaccountpassword ${p.user} Welcome2026!</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { if (srv.users[p.user]) { srv.users[p.user].active = false; srv.users[p.user].changed = false; } },
        check(p, srv) { const u = srv.users[p.user]; return !!u && u.active === true && u.changed === true; },
      };
    },
  },
  onboard: {
    tier: 1, prio: "NORMAL", xp: 60, sla: 60,
    make(p) {
      return {
        subject: `Onboarding: ${p.full} starts Monday (${p.dept})`,
        body: `Hi {PLAYER}! ${p.full} joins ${p.dept} on Monday. Create the account (login: ${p.login}, temp password ${p.pass}) and add it to the ${p.group} group.\n— Zora (HR & IT)`,
        sop: [
          `Create the account: <code>net user ${p.login} ${p.pass} /add</code> — or <code>new-aduser ${p.login} ${p.pass} /add</code>`,
          `Add to the group: <code>net group ${p.group} ${p.login} /add</code> — or <code>add-adgroupmember ${p.group} ${p.login}</code>`,
          `Verify: <code>net user ${p.login}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup() {},
        check(p, srv) {
          const u = srv.users[p.login];
          return !!u && u.active === true && (srv.groups[p.group] || []).includes(p.login);
        },
      };
    },
  },
  "group-add": {
    tier: 1, prio: "NORMAL", xp: 40, sla: 45,
    make(p) {
      return {
        subject: `Access request: ${p.user} → ${p.group}`,
        body: `Hello, ${p.user} moved to ${p.group} and needs group access. HR approved it.\n— Manager, ${p.group}`,
        sop: [
          `Check current memberships: <code>net user ${p.user}</code>`,
          `Add to the group: <code>net group ${p.group} ${p.user} /add</code> — or <code>add-adgroupmember ${p.group} ${p.user}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup() {},
        check(p, srv) { return (srv.groups[p.group] || []).includes(p.user); },
      };
    },
  },
  service: {
    tier: 1, prio: "HIGH", xp: 50, sla: 40,
    make(p) {
      const label = GRIND_SVC_LABELS[p.svc] || p.svc;
      return {
        subject: `${label} is down — things are broken`,
        body: `Something is wrong with ${label} on the server. Users are complaining since ${p.time}.\n— Monitoring alert`,
        sop: [
          `Check the service: <code>get-service ${p.svc}</code>`,
          `If STOPPED, start it: <code>start-service ${p.svc}</code>`,
          `Verify and resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { srv.services[p.svc] = "STOPPED"; },
        check(p, srv) { return srv.services[p.svc] === "RUNNING"; },
      };
    },
  },
  mailbox: {
    tier: 1, prio: "NORMAL", xp: 40, sla: 60,
    make(p) {
      return {
        subject: "Outlook: mailbox is full, mail not arriving",
        body: `Outlook says my mailbox is full. I can't receive anything!\n— ${p.full}`,
        sop: [
          `Check the mailbox: <code>get-mailbox ${p.user}</code>`,
          `Raise the quota: <code>set-mailbox ${p.user} 100</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { if (srv.mailbox[p.user]) srv.mailbox[p.user].quota = srv.mailbox[p.user].used; else srv.mailbox[p.user] = { used: 46, quota: 46 }; },
        check(p, srv) { const m = srv.mailbox[p.user]; return !!m && m.quota > m.used; },
      };
    },
  },
  dhcp: {
    tier: 1, prio: "HIGH", xp: 55, sla: 40,
    make(p) {
      return {
        subject: `No internet on ${p.pc} — everyone else is fine`,
        body: `The whole workstation ${p.pc} has no internet. Browsers and Outlook are dead.\n— ${p.full}, floor IT champion`,
        sop: [
          `Look at the network config: <code>ipconfig</code>`,
          `IP starts with 169.254.x.x? No DHCP lease — renew it: <code>ipconfig /renew</code>`,
          `Verify: <code>ping 8.8.8.8</code>, then resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { srv.network.renewed = false; srv.network.ip = "169.254." + (10 + Math.floor(Math.random() * 90)) + "." + (10 + Math.floor(Math.random() * 90)); },
        check(p, srv) { return srv.network.renewed === true; },
      };
    },
  },
  reboot: {
    tier: 1, prio: "NORMAL", xp: 35, sla: 45,
    make(p) {
      return {
        subject: `${p.pc} froze — acts possessed`,
        body: `${p.pc} froze twice today. Mouse dead, no bluescreen. A reboot usually helps it.\n— ${p.full}`,
        sop: [
          `Reboot the workstation remotely: <code>reboot ${p.pc}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { if (!srv.wds[p.pc]) srv.wds[p.pc] = { deployed: false, joined: false }; srv.wds[p.pc].rebooted = false; },
        check(p, srv) { return !!(srv.wds[p.pc] && srv.wds[p.pc].rebooted === true); },
      };
    },
  },
  /* ---- TIER 2 (rank 2+) ---- */
  share: {
    tier: 2, prio: "HIGH", xp: 55, sla: 45,
    make(p) {
      return {
        subject: `Access denied on ${p.path}`,
        body: `I can see the share ${p.path} but opening it says Access denied. I need it for work today.\n— ${p.full}`,
        sop: [
          `Check permissions: <code>icacls ${p.path}</code>`,
          `Grant read access: <code>icacls ${p.path} /grant ${p.user}:R</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup() {},
        check(p, srv) {
          const s = srv.shares[p.path];
          return !!s && s.ACL.some((a) => a.startsWith(p.user + ":"));
        },
      };
    },
  },
  offboard: {
    tier: 2, prio: "NORMAL", xp: 55, sla: 60,
    make(p) {
      return {
        subject: `Offboarding: ${p.full} — last day today`,
        body: `{PLAYER}, ${p.full} leaves today. Disable the account. Don't delete anything — just disable.\n— Zora (HR & IT)`,
        sop: [
          `Disable the account: <code>net user ${p.user} /active:no</code>`,
          `Verify: <code>net user ${p.user}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup() {},
        check(p, srv) { const u = srv.users[p.user]; return !!u && u.active === false; },
      };
    },
  },
  deploy: {
    tier: 2, prio: "NORMAL", xp: 65, sla: 75,
    make(p) {
      return {
        subject: `New workstation ${p.pc} for ${p.full}`,
        body: `A fresh machine ${p.pc} is waiting in the pipeline. Deploy the image and join it to the domain.\n— Zora (HR & IT)`,
        sop: [
          `Deploy the image via WDS: <code>wds-deploy ${p.pc}</code>`,
          `Join the domain: <code>add-computer ${p.pc}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { if (!srv.wds[p.pc]) srv.wds[p.pc] = { deployed: false, joined: false }; srv.wds[p.pc].deployed = false; srv.wds[p.pc].joined = false; },
        check(p, srv) { const w = srv.wds[p.pc]; return !!w && w.deployed === true && w.joined === true; },
      };
    },
  },
  /* ---- SECURITY HYGIENE (patching, MFA, policy, DNS, backups) ---- */
  patch: {
    tier: 1, prio: "HIGH", xp: 50, sla: 45,
    make(p) {
      const kb = grindKb(p);
      return {
        subject: `Security update ${kb} missing on ${p.pc} (vulnerability scan)`,
        body: `The vulnerability scanner flagged ${p.pc}: a critical Windows security update (${kb}) is not installed. Unpatched machines are the first thing attackers look for.\n— Security scanner`,
        sop: [
          `See what is pending: <code>get-hotfix ${p.pc}</code>`,
          `Windows Update must be running: <code>get-service wuauserv</code> (start it if STOPPED)`,
          `Install the update: <code>install-patch ${kb} ${p.pc}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { srv.patches[p.pc] = { kb: grindKb(p), title: "Cumulative Security Update", installed: false }; },
        check(p, srv) { const x = srv.patches[p.pc]; return !!x && x.installed === true; },
      };
    },
  },
  mfa: {
    tier: 1, prio: "NORMAL", xp: 45, sla: 45,
    make(p) {
      return {
        subject: `New phone — authenticator app is empty (${p.full})`,
        body: `I got a new phone and now I can't pass the MFA prompt, so I can't sign in at all. Please reset it. (Verified with my manager: ${p.dept} lead says it's really me.)\n— ${p.full}`,
        sop: [
          `Check the state: <code>get-mfa ${p.user}</code>`,
          `Social-engineering check: the manager confirmation is in the ticket — in real life you would call back on a KNOWN number first.`,
          `Reset it: <code>reset-mfa ${p.user}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { srv.mfa[p.user] = { reset: false }; },
        check(p, srv) { const m = srv.mfa[p.user]; return !!m && m.reset === true; },
      };
    },
  },
  gpo: {
    tier: 2, prio: "NORMAL", xp: 60, sla: 50,
    make(p) {
      return {
        subject: `Screen-lock policy is not applied on ${p.pc}`,
        body: `Compliance audit: ${p.pc} does not enforce the 5-minute screen lock Group Policy. An unlocked, unattended PC is an open door.\n— Compliance`,
        sop: [
          `Inspect the policy result: <code>get-gpresult ${p.pc}</code>`,
          `Force a refresh: <code>gpupdate /force ${p.pc}</code>`,
          `Verify and resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { srv.gpo[p.pc] = { policy: "Screen lock after 5 min (GPO-SEC-12)", applied: false }; },
        check(p, srv) { const g = srv.gpo[p.pc]; return !!g && g.applied === true; },
      };
    },
  },
  dns: {
    tier: 2, prio: "HIGH", xp: 60, sla: 45,
    make(p) {
      const d = grindDns(p);
      return {
        subject: `Intranet portal "${d.name}" not reachable by name`,
        body: `The new ${p.dept} portal works by IP (${d.ip}) but not by name: "${d.name}.pixlcorp.local" says the name does not exist.\n— ${p.full}`,
        sop: [
          `Look the name up: <code>get-dnsrecord ${d.name}</code>`,
          `Create the A record: <code>add-dnsrecord ${d.name} ${d.ip}</code>`,
          `Verify and resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { delete srv.dns[d.name]; },
        check(p, srv) { return srv.dns[d.name] === d.ip; },
      };
    },
  },
  backup: {
    tier: 2, prio: "CRITICAL", xp: 70, sla: 45,
    make(p) {
      const j = grindBackupJob(p);
      return {
        subject: `Backup job ${j.job} FAILED last night`,
        body: `Nightly backup ${j.job} failed (${j.reason}). If ransomware hits today, we have no clean restore point. Fix it before it matters.\n— Backup monitor`,
        sop: [
          `Check the jobs: <code>get-backup</code>`,
          `Re-run the failed job: <code>start-backup ${j.job}</code>`,
          `Verify and resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { srv.backups[j.job] = { ok: false, reason: j.reason }; },
        check(p, srv) { const b = srv.backups[j.job]; return !!b && b.ok === true; },
      };
    },
  },
  /* ---- ŠPECIALIZÁCIE (rank 3+): vetva má vlastné druhy ticketov ---- */

  /* SOC — phishing, brute-force, incidenty */
  phishing: {
    branch: "soc", tier: 3, prio: "CRITICAL", xp: 85, sla: 45,
    make(p) {
      return {
        subject: `Phishing: ${p.full} entered their password on a fake site!`,
        body: `User ${p.user} replied to a "Password expires today" email and typed their credentials on pixlcorp-mail.io (NOT us). Credentials compromised.\n— Mail gateway alert`,
        sop: [
          `Disable the compromised account: <code>net user ${p.user} /active:no</code>`,
          `Reset the password: <code>net user ${p.user} Secure${p.id}!</code>`,
          `Re-enable the account: <code>net user ${p.user} /active:yes</code>`,
          `Block the sender's IP: <code>block-ip ${p.badIp}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) { if (srv.users[p.user]) { srv.users[p.user].active = true; srv.users[p.user].changed = false; } },
        check(p, srv) {
          const u = srv.users[p.user];
          return !!u && u.active === true && u.changed === true && srv.blocked.includes(p.badIp);
        },
      };
    },
  },
  bruteforce: {
    branch: "soc", tier: 3, prio: "HIGH", xp: 75, sla: 40,
    make(p) {
      return {
        subject: `Brute-force attack in progress from ${p.badIp}`,
        body: `SIEM alert: 1,400+ failed logons (event 4625) targeting administrator from ${p.badIp} in the last 10 minutes. Block it before it gets lucky.\n— Monitoring`,
        sop: [
          `Confirm in the logs: <code>eventlog security</code>`,
          `Create a firewall block rule: <code>block-ip ${p.badIp}</code>`,
          `Verify the log goes quiet, then resolve: <code>resolve ${p.id}</code>`,
        ],
        setup() {},
        check(p, srv) { return srv.blocked.includes(p.badIp); },
      };
    },
  },
  incident: {
    branch: "soc", tier: 4, prio: "CRITICAL", xp: 120, sla: 60,
    make(p) {
      return {
        subject: `INCIDENT: malware beacon from ${p.pc} (C2 traffic)`,
        body: `EDR flagged ${p.pc}: outbound beaconing to ${p.badIp} every 60s. User ${p.user} clicked something. Contain NOW: isolate the machine, disable the account, block the C2.\n— EDR platform`,
        sop: [
          `Disable the user account: <code>net user ${p.user} /active:no</code>`,
          `Block the C2 server: <code>block-ip ${p.badIp}</code>`,
          `Isolate the workstation: <code>reboot ${p.pc}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) {
          if (srv.users[p.user]) { srv.users[p.user].active = true; srv.users[p.user].changed = true; }
          if (!srv.wds[p.pc]) srv.wds[p.pc] = { deployed: false, joined: false };
          srv.wds[p.pc].rebooted = false;
        },
        check(p, srv) {
          const u = srv.users[p.user];
          return !!u && u.active === false &&
            srv.blocked.includes(p.badIp) &&
            !!(srv.wds[p.pc] && srv.wds[p.pc].rebooted === true);
        },
      };
    },
  },

  /* ADMIN — infraštruktúra, PowerShell, AD hygiena */
  "share-audit": {
    branch: "admin", tier: 3, prio: "HIGH", xp: 70, sla: 50,
    make(p) {
      return {
        subject: `Audit finding: ${p.path} is open to Everyone`,
        body: `Security audit: ${p.path} grants Read to Everyone. Least-privilege, please — only ${p.group} should have access.\n— Compliance (Q4 audit)`,
        sop: [
          `Check current ACL: <code>icacls ${p.path}</code>`,
          `Remove Everyone: <code>icacls ${p.path} /remove Everyone</code>`,
          `Grant the right group: <code>icacls ${p.path} /grant ${p.group}:R</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) {
          if (srv.shares[p.path]) {
            srv.shares[p.path].ACL = ["Everyone:R"];
          } else {
            srv.shares[p.path] = { ACL: ["Everyone:R"] };
          }
        },
        check(p, srv) {
          const s = srv.shares[p.path];
          return !!s && !s.ACL.some((a) => a.startsWith("Everyone")) &&
            s.ACL.some((a) => a.startsWith(p.group + ":"));
        },
      };
    },
  },
  "stale-account": {
    branch: "admin", tier: 4, prio: "NORMAL", xp: 85, sla: 90,
    make(p) {
      return {
        subject: `Departure cleanup: ${p.full} (left 2 months ago)`,
        body: `{PLAYER}, ${p.full} left the company weeks ago but the account is still active and the home folder is untouched. Full cleanup, please.\n— HR & Compliance`,
        sop: [
          `Copy the home folder first: <code>robocopy C:\\Users\\${p.user} D:\\Archive\\${p.user} /E</code>`,
          `Disable the stale account: <code>net user ${p.user} /active:no</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup() {},
        check(p, srv) {
          const u = srv.users[p.user];
          return !!u && u.active === false && srv.departed.includes(p.user);
        },
      };
    },
  },

  /* ---- EVENT TICKET (Doris arc) — nie je v grind poole ---- */
  "doris-mega": {
    tier: 99, prio: "CRITICAL", xp: 150, sla: 120,
    make(p) {
      return {
        subject: `HALF THE SERVER IS DOWN (it was me — Doris)`,
        body: `{PLAYER}!! I was "just cleaning" my desktop and everything vanished: the sharedrive, Outlook, the printer! I may have clicked something. Or three things. HELP!\n— Doris Pemberton (Office Admin, very sorry)`,
        sop: [
          `Start Netlogon: <code>start-service netlogon</code>`,
          `Start the Print Spooler: <code>start-service spooler</code>`,
          `Unlock Doris's account: <code>net user doris /active:yes</code> + <code>net user doris DorisOK${p.id}!</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) {
          srv.services.netlogon = "STOPPED";
          srv.services.spooler = "STOPPED";
          if (srv.users.doris) { srv.users.doris.active = false; srv.users.doris.changed = false; }
        },
        check(p, srv) {
          return srv.services.netlogon === "RUNNING" &&
            srv.services.spooler === "RUNNING" &&
            !!srv.users.doris && srv.users.doris.active === true && srv.users.doris.changed === true;
        },
      };
    },
  },

  /* ---- TIER 3 (rank 3+): viackrokové combo ---- */
  "onboard-full": {
    tier: 3, prio: "HIGH", xp: 90, sla: 90,
    make(p) {
      return {
        subject: `Full setup: ${p.full} (${p.dept}) — account + PC`,
        body: `{PLAYER}, VIP onboarding: ${p.full} starts in ${p.dept}. Account (login: ${p.login}, temp password ${p.pass}), ${p.group} group membership, AND workstation ${p.pc} deployed + domain-joined. All of it, please.\n— Zora (HR & IT)`,
        sop: [
          `Create the account: <code>net user ${p.login} ${p.pass} /add</code>`,
          `Add to the group: <code>net group ${p.group} ${p.login} /add</code>`,
          `Deploy the workstation: <code>wds-deploy ${p.pc}</code>`,
          `Join the domain: <code>add-computer ${p.pc}</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) {
          if (!srv.wds[p.pc]) srv.wds[p.pc] = { deployed: false, joined: false };
          srv.wds[p.pc].deployed = false; srv.wds[p.pc].joined = false;
        },
        check(p, srv) {
          const u = srv.users[p.login];
          const w = srv.wds[p.pc];
          return !!u && u.active === true &&
            (srv.groups[p.group] || []).includes(p.login) &&
            !!w && w.deployed === true && w.joined === true;
        },
      };
    },
  },
  "power-user": {
    tier: 3, prio: "CRITICAL", xp: 95, sla: 60,
    make(p) {
      return {
        subject: `${p.full} locked out AND no access to ${p.path}`,
        body: `Double trouble: my account got locked out, and once IT fixed that last time I still couldn't open ${p.path}. Please sort both out at once.\n— ${p.full} (very stressed)`,
        sop: [
          `Unlock the account: <code>net user ${p.user} /active:yes</code>`,
          `Reset the password: <code>net user ${p.user} Welcome2026!</code>`,
          `Grant share access: <code>icacls ${p.path} /grant ${p.user}:R</code>`,
          `Resolve: <code>resolve ${p.id}</code>`,
        ],
        setup(p, srv) {
          if (srv.users[p.user]) { srv.users[p.user].active = false; srv.users[p.user].changed = false; }
        },
        check(p, srv) {
          const u = srv.users[p.user];
          const s = srv.shares[p.path];
          return !!u && u.active === true && u.changed === true &&
            !!s && s.ACL.some((a) => a.startsWith(p.user + ":"));
        },
      };
    },
  },
};

/* weighted pool podľa ranku + vetvy */
function grindPool() {
  const rank = state.rank || 0;
  const pool = [];
  for (const [kind, def] of Object.entries(GRIND_KINDS)) {
    if (def.branch && def.branch !== state.branch) continue; // vetvovo zamknuté druhy
    if (def.tier === 99) continue;                           // event ticket (Doris arc) — len na požiadanie
    if (def.tier === 1) pool.push(kind, kind);            // weight 2
    if (def.tier === 2 && rank >= 2) pool.push(kind, kind);
    if (def.tier === 3 && rank >= 3) pool.push(kind);
    if (def.tier >= 4 && rank >= def.tier) pool.push(kind);
  }
  return pool;
}

let grindNextId = 5000;

function makeGrindTicket(forceKind) {
  const pool = grindPool();
  const kind = forceKind || pool[Math.floor(Math.random() * pool.length)] || "lockout";
  const def = typeof kind === "string" && Object.prototype.hasOwnProperty.call(GRIND_KINDS, kind)
    ? GRIND_KINDS[kind]
    : null;
  if (!def) return null;

  const first = GRIND_FIRST[Math.floor(Math.random() * GRIND_FIRST.length)];
  const last = GRIND_LAST[Math.floor(Math.random() * GRIND_LAST.length)];
  const full = `${first} ${last}`;
  const login = grindLogin(first, last);
  // len účty, ktoré na serveri naozaj existujú (petra.nova vznikne až po onboarding tickete #1101)
  const usable = GRIND_USERS.filter((u) => state.server.users[u]);
  const userPool = usable.length ? usable : ["marek"];
  const user = userPool[Math.floor(Math.random() * userPool.length)];
  const group = GRIND_GROUPS[Math.floor(Math.random() * GRIND_GROUPS.length)];
  if (!state.server.groups[group]) state.server.groups[group] = [];   // skupina musí existovať, inak je ticket nevyriešiteľný
  const dept = GRIND_DEPTS[Math.floor(Math.random() * GRIND_DEPTS.length)];
  const pc = GRIND_PCS[Math.floor(Math.random() * GRIND_PCS.length)];
  const badIp = GRIND_BADIPS[Math.floor(Math.random() * GRIND_BADIPS.length)];
  const path = Math.random() < .5 ? "D:\\Shares\\Finance" : "D:\\Shares\\Public";
  const svc = GRIND_SVCS[Math.floor(Math.random() * GRIND_SVCS.length)];
  const pass = "Start" + (1000 + Math.floor(Math.random() * 9000)) + "!";
  const time = String(8 + Math.floor(Math.random() * 6)).padStart(2, "0") + ":" + String(Math.floor(Math.random() * 60)).padStart(2, "0");

  const id = grindNextId++;
  const p = { id, kind, user, login, group, dept, pc, path, svc, pass, full, time, badIp };
  const made = def.make(p);
  return {
    id, kind, params: p,
    from: "IT Service Desk (auto-routed)",
    subject: made.subject,
    priority: def.prio,
    xp: def.xp, slaMin: def.sla,
    grind: true,
    body: made.body,
    sop: made.sop,
  };
}

/* hydratacia check/setup funkcií po načítaní zo save-u */
function hydrateGrindTickets() {
  for (const t of state.grindTickets || []) {
    const def = typeof t.kind === "string" && Object.prototype.hasOwnProperty.call(GRIND_KINDS, t.kind)
      ? GRIND_KINDS[t.kind]
      : null;
    if (def && isPlainObject(t.params) && !t.check) {
      const made = def.make(t.params);
      t.check = (srv) => made.check(t.params, srv);
    }
  }
}

/* spawn nového ticketu do live queue */
function grindSpawn(silent) {
  if (!state.grindTickets) state.grindTickets = [];
  // prune: vyriešené grind tickety z dieta — ich štatistiky žijú v state.resolved
  if (state.grindTickets.length > 60) {
    state.grindTickets = state.grindTickets.filter(
      (t) => !state.resolved.includes(t.id) && !state.escalated.includes(t.id)
    );
  }
  const open = state.grindTickets.filter(
    (t) => !state.resolved.includes(t.id) && !state.escalated.includes(t.id)
  ).length;
  if (open >= 8) return null; // queue limit — nejeden sa najeskôr, kým niečo nevyriešiš
  const t = makeGrindTicket();
  if (!t) return null;
  const def = GRIND_KINDS[t.kind];
  def.make(t.params).setup(t.params, state.server);
  state.grindTickets.push(t);
  if (!state.arrived.includes(t.id)) state.arrived.push(t.id);
  saveGame();
  if (!silent) {
    SFX.ping();
    toast(`📥 New ticket #${t.id} — ${t.subject}`, "toast-ticket");
    if (typeof renderTickets === "function") renderTickets();
  }
  return t;
}

/* trvalý tik — tickety prichádzajú počas celej smeny */
function grindStartLoop() {
  if (grindStartLoop._running) return;
  grindStartLoop._running = true;
  // prvá vlna hneď (ak je queue prázdna)
  setTimeout(() => { if (countResolved() > 0 || state.rank >= 1) grindSpawn(true); }, 4000);
  setInterval(() => {
    if (document.getElementById("game").classList.contains("hidden")) return;
    if (state.rank < 1) return; // intern ešte žije zo statických ticketov
    grindSpawn();
  }, 45000);
}
