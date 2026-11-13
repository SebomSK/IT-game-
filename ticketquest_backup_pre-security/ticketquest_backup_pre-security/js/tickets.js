/* ===== TicketQuest — tickets + completion conditions ===== */
/* check(srv) receives state.server and returns true when the job is really done. */
/* slaMin = SLA in minutes (null = no SLA, old intern tickets) */

const TICKETS = [
  /* ---------- INTERN (first shift) ---------- */
  {
    id: 1042,
    from: "Doris Pemberton, Office Admin",
    subject: "Can't log in — third time this week!",
    priority: "HIGH",
    xp: 50, slaMin: null,
    body:
      "Hi, I forgot my password AGAIN and now it says my account is \"locked\". " +
      "I need to work, it's really urgent. Thanks!! 🙏 — Doris",
    sop: [
      "Check the account status: <code>net user doris</code>",
      "Unlock the account: <code>net user doris /active:yes</code>",
      "Set a temporary password: <code>net user doris Welcome2026!</code>",
      "Mark the ticket resolved: <code>resolve 1042</code>",
    ],
    check: (srv) => srv.users.doris.active === true && srv.users.doris.changed === true,
  },
  {
    id: 1043,
    from: "Mark Kovac, Marketing",
    subject: "3rd floor printer prints nothing",
    priority: "NORMAL",
    xp: 40, slaMin: null,
    body:
      "Hey, the HP-3POS printer doesn't even react when I send a job. " +
      "The other printers apparently work. No idea if it's my PC or the printer.",
    sop: [
      "Check the print service: <code>get-service spooler</code>",
      "If it's STOPPED, start it: <code>start-service spooler</code>",
      "Verify it's running and resolve the ticket: <code>resolve 1043</code>",
    ],
    check: (srv) => srv.services.spooler === "RUNNING",
  },
  {
    id: 1045,
    from: "Jane White, Accounting",
    subject: "My internet doesn't work at all",
    priority: "HIGH",
    xp: 60, slaMin: null,
    body:
      "Good morning, no internet since I got in — Outlook and the browser are dead. " +
      "Everyone else says they're fine.",
    sop: [
      "Look at the network config: <code>ipconfig</code>",
      "IP starts with 169.254.x.x? That means the PC didn't get an address from DHCP.",
      "Ask for a new address: <code>ipconfig /renew</code>",
      "Verify connectivity: <code>ping 8.8.8.8</code>, then resolve: <code>resolve 1045</code>",
    ],
    check: (srv) => srv.network.renewed === true,
  },
  {
    id: 1044,
    from: "SECURITY ALERT (automated monitoring)",
    subject: "⚠️ Brute-force logons against the administrator account",
    priority: "CRITICAL",
    xp: 90, slaMin: null,
    body:
      "The event log recorded dozens of failed logons against the 'administrator' account " +
      "from a single IP address in the last hour. A brute-force attack is in progress. " +
      "Follow up on your helpdesk skills — find the attacker and block them.",
    sop: [
      "Read the security log: <code>eventlog security</code>",
      "Find the IP the event 4625 (failed logon) is coming from.",
      "Block it in the firewall: <code>block-ip &lt;IP-address&gt;</code>",
      "Check the log again and resolve: <code>resolve 1044</code>",
    ],
    check: (srv) => srv.blocked.includes("10.0.13.66"),
  },

  /* ---------- HELPDESK TIER 1 ---------- */
  {
    id: 1101,
    from: "Zora (HR & IT)",
    subject: "Onboarding: new employee Petra Nova, starts Monday",
    priority: "NORMAL",
    xp: 60, slaMin: 30,
    body:
      "Hi {PLAYER}! Petra Nova starts in Marketing on Monday. " +
      "Create her account and add her to the Marketing group. Login: petra.nova",
    sop: [
      "Create the account: <code>net user petra.nova Start123! /add</code>",
      "Add to the group: <code>net group Marketing petra.nova /add</code>",
      "Verify: <code>net user petra.nova</code>",
      "Resolve the ticket: <code>resolve 1101</code>",
    ],
    check: (srv) =>
      !!srv.users["petra.nova"] &&
      srv.users["petra.nova"].active === true &&
      srv.groups.Marketing.includes("petra.nova"),
  },
  {
    id: 1102,
    from: "Mark Kovac, Marketing",
    subject: "I can see the shared drive but can't open Finance",
    priority: "HIGH",
    xp: 60, slaMin: 45,
    body:
      "I transferred from Marketing to Accounting (trust me, HR hasn't updated the system yet) " +
      "and now the Finance folder gives me 'Access denied'. Can you help?",
    sop: [
      "Check permissions: <code>icacls D:\\Shares\\Finance</code>",
      "Grant Mark read access: <code>icacls D:\\Shares\\Finance /grant marek:R</code>",
      "Verify and resolve: <code>resolve 1102</code>",
    ],
    check: (srv) =>
      srv.shares["D:\\Shares\\Finance"].ACL.some((a) => a.startsWith("marek:")),
  },
  {
    id: 1103,
    from: "Mark Kovac, Marketing",
    subject: "Outlook: mail won't sync, says mailbox is full",
    priority: "NORMAL",
    xp: 50, slaMin: 60,
    body:
      "Outlook tells me 'Mailbox is full'. New mail isn't arriving at all. " +
      "What do I do? (Yes, same Mark as yesterday. Yes, I know.)",
    sop: [
      "Check the mailbox: <code>get-mailbox marek</code>",
      "If the quota is full, raise it: <code>set-mailbox marek 100</code>",
      "Resolve the ticket: <code>resolve 1103</code>",
    ],
    check: (srv) => srv.mailbox.marek.quota > 45,
  },
  {
    id: 1104,
    from: "Jane White, Accounting (home office)",
    subject: "VPN won't connect — can't work from home",
    priority: "CRITICAL",
    xp: 70, slaMin: 30,
    body:
      "From home the VPN fails with a 'server timeout' error. " +
      "In the office everything apparently works. I need to process invoices today!",
    sop: [
      "Read the VPN log: <code>type C:\\Logs\\vpn.log</code>",
      "RADIUS timeout error → check the service: <code>get-service ias</code>",
      "Start it: <code>start-service ias</code>",
      "Resolve the ticket: <code>resolve 1104</code>",
    ],
    check: (srv) => srv.services.ias === "RUNNING",
  },
  {
    id: 1105,
    from: "Zora (HR & IT)",
    subject: "Offboarding: Paul Stern is leaving — today 4 PM",
    priority: "HIGH",
    xp: 70, slaMin: 45,
    body:
      "{PLAYER}, Paul is leaving today. Disable his account, move his data to Departed, " +
      "and remove him from the Helpdesk group. I want a peaceful offboarding.",
    sop: [
      "Disable the account: <code>net user pavel /active:no</code>",
      "Move the data: <code>robocopy C:\\Users\\pavel D:\\Departed\\pavel /E</code>",
      "Remove from the group: <code>net group Helpdesk pavel /remove</code>",
      "Resolve the ticket: <code>resolve 1105</code>",
    ],
    check: (srv) =>
      srv.users.pavel.active === false &&
      srv.departed.includes("pavel") &&
      !srv.groups.Helpdesk.includes("pavel"),
  },
  {
    id: 1106,
    from: "Zora (HR & IT)",
    subject: "PC build: workstation WKS-114 for Petra",
    priority: "NORMAL",
    xp: 60, slaMin: 60,
    body:
      "Petra from ticket #1101 needs a new workstation set up. " +
      "Deploy it via WDS and join it to the domain. Thanks, {PLAYER}!",
    sop: [
      "Deploy the image via WDS: <code>wds-deploy WKS-114</code>",
      "Join the domain: <code>add-computer WKS-114</code>",
      "Resolve the ticket: <code>resolve 1106</code>",
    ],
    check: (srv) =>
      srv.wds["WKS-114"].deployed === true &&
      srv.wds["WKS-114"].joined === true,
  },
  {
    id: 1107,
    from: "Mark Kovac, Marketing",
    subject: "PC is acting up",
    priority: "NORMAL",
    xp: 70, slaMin: 45,
    phone: true,
    body:
      "I can't describe it. The PC just DOESN'T WORK. Please call me. " +
      "(Yes, ME AGAIN. No idea why the two of us are like this.)",
    sop: [
      "📞 Call Mark (button in the ticket detail)",
      "Diagnose with the RIGHT questions — not every question is a good question",
      "Fix it in the terminal based on what you learn: <code>reboot WKS-207</code>",
      "Resolve the ticket: <code>resolve 1107</code>",
    ],
    check: (srv) => srv.wds["WKS-207"].rebooted === true,
  },
];

/* Skills for the CV export (ticket → real-world skill) */
const SKILL_MAP = {
  1042: "Active Directory account management (unlock/reset)",
  1043: "Windows services",
  1045: "Network diagnostics (DHCP/DNS)",
  1044: "Security monitoring (event logs, firewall)",
  1101: "Employee onboarding (AD accounts, groups)",
  1102: "NTFS permissions (icacls)",
  1103: "Exchange / mailbox management",
  1104: "VPN & RADIUS troubleshooting",
  1105: "Offboarding processes",
  1106: "PC deployment (WDS, domain join)",
  1107: "Phone-based diagnostics & communication",
  2001: "Recurring incident handling",
};

const ALL_RESOLVED_TEXT =
  "You finished the whole shift! In the real world you just practiced: user management, " +
  "Windows services, network diagnostics and security incident response.";
