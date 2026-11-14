/* ===== TicketQuest — vzdelávacia vrstva (learn) =====
   Cieľ: hráč si z hry odnesie reálne vedomosti. Po každom tickete dostane „debrief":
   čo sa v skutočnosti stalo, ako to robia profesionáli, čo hra zjednodušuje.
   API (všetko bezpečné aj bez DOM — testuje sa headless):
     learn.lessonFor(ticket)      -> { key, ...lesson } | null
     learn.debriefHtml(ticket)    -> HTML string (statický obsah, escapovaný)
     learn.markSeen(ticket)       -> zapíše lekciu + zručnosť do state.learn
     learn.answer(key, idx)       -> { correct, explain } ; správne = +5 XP raz
     learn.onFail(ticket)         -> vypíše hint do terminálu pri zlom `resolve`
     learn.explain(cmd)           -> riadky pre terminálový príkaz `explain`
     learn.skillSummary()         -> [{ id, label, count, level }]
     learn.mountApp(bodyEl)       -> aplikácia Learn (Lessons / Method / Commands / Glossary) */

const LEARN_SKILLS = {
  identity: "Identity & access (AD)",
  network: "Networking & DNS/DHCP",
  server: "Windows Server & services",
  security: "Security & incident response",
  endpoint: "Endpoint & deployment",
  process: "Troubleshooting & documentation",
};

/* mapovanie príbehových ticketov → kľúč lekcie (grind tickety používajú t.kind) */
const LEARN_STORY_MAP = {
  1042: "lockout", 1043: "service", 1045: "dhcp", 1044: "bruteforce",
  1101: "onboard", 1102: "share", 1103: "mailbox", 1104: "vpn",
  1105: "offboard", 1106: "deploy", 1107: "phoneDiag",
};

/* Každá lekcia: skill, title, concept (čo to je), why (prečo to funguje / čo sa deje pod kapotou),
   irl (ako to robia profesionáli — reálne nástroje), pitfalls (časté chyby), sim (čo hra zjednodušuje),
   hint (nápoveda pri zlom resolve), check (otázka na premýšľanie: q, options, answer, explain).
   Texty držia `kód` v spätných apostrofoch. */
const LESSONS = {
  lockout: {
    skill: "identity", title: "Account lockouts",
    concept: "A domain account locks automatically after too many bad passwords. The lockout policy (threshold, duration, observation window) is set centrally in Active Directory.",
    why: "The domain controller counts failed logons per account. Past the threshold it sets the account to locked for a set time (or until an admin unlocks it). It is a defence against password guessing — and the reason attackers can lock people out on purpose.",
    irl: [
      "Unlock in AD Users and Computers, or `Unlock-ADAccount -Identity user`.",
      "Find the cause: event 4740 on the DC names the *source computer*; 4625 / 4771 / 4776 show the failures.",
      "Reset with `Set-ADAccountPassword -Reset` and force a change: `Set-ADUser user -ChangePasswordAtLogon $true`.",
    ],
    pitfalls: [
      "Unlocking again and again without finding the source (old saved password on a phone, mapped drive or a service account).",
      "Resetting a password for a caller you did not verify — this is how social-engineering attacks work. Verify identity first (callback, manager, ID).",
      "Telling the password over e-mail or chat.",
    ],
    sim: "The game unlocks with `net user x /active:yes`. In a real domain you use `Unlock-ADAccount` — `/active` toggles *disabled*, not *locked*.",
    hint: "Locked accounts need two things: unlocked AND a fresh password (the old one is probably the problem).",
    check: { q: "A user is locked out every morning at 8:05 even after you unlock them. What do you check first?",
      options: ["Raise the lockout threshold", "Event 4740 on the DC to find the source computer or device", "Delete and recreate the account"], answer: 1,
      explain: "4740 names the machine causing the bad attempts — usually a phone or PC still using the old password. Raising the threshold only weakens security." },
  },
  service: {
    skill: "server", title: "Services & root cause",
    concept: "Many Windows features run as services (background programs): Print Spooler, DNS Client, Netlogon, Windows Update. Services can be Running, Stopped or Disabled, and depend on each other.",
    why: "If a service stops, everything that needs it fails — a stopped Spooler means no printing, a stopped Netlogon means domain logons fail. Starting it fixes the symptom; the Event Viewer (System log, Service Control Manager events 7031/7034/7036) tells you why it stopped.",
    irl: [
      "`Get-Service Spooler`, `Start-Service Spooler`, or `services.msc`.",
      "`Get-WinEvent -LogName System -MaxEvents 30` to see what happened before it stopped.",
      "Set recovery actions (auto-restart) and monitoring so you hear about it before users do.",
    ],
    pitfalls: [
      "Restarting and walking away — if it stops again tonight you have a bigger problem (bad driver, corrupt print job, failing disk).",
      "Ignoring service dependencies: a service may refuse to start because something it needs is down.",
    ],
    sim: "Real spooler problems are often a stuck job in `C:\\Windows\\System32\\spool\\PRINTERS`. Microsoft also recommends *disabling* the Print Spooler on domain controllers (PrintNightmare).",
    hint: "The check wants the service in state RUNNING. Look at its status first: `get-service <name>`.",
    check: { q: "A service you restarted stops again an hour later. Best next step?",
      options: ["Restart it every hour with a script and move on", "Read the System event log around the stop time and look for the cause", "Reinstall Windows"], answer: 1,
      explain: "Workarounds hide the cause. The logs usually show a crash, a dependency or a permissions problem." },
  },
  dhcp: {
    skill: "network", title: "No network: DHCP & layered troubleshooting",
    concept: "DHCP hands out IP address, gateway and DNS to devices. If it fails, Windows gives itself a 169.254.x.x (APIPA) address — a sure sign the DHCP server was never reached.",
    why: "A 169.254 address means: link is up, but nobody answered the DHCP request. Causes: cable/Wi-Fi/VLAN problem, DHCP service down, or the scope is out of free leases.",
    irl: [
      "`ipconfig /all`, then `ipconfig /release` and `ipconfig /renew`.",
      "Test in layers: link → IP → gateway (`ping`) → outside IP (`ping 8.8.8.8`) → DNS (`nslookup`). The first thing that fails shows the layer.",
      "On the server: check the DHCP scope for exhausted leases and the DHCP service state.",
    ],
    pitfalls: [
      "Blaming 'the internet' before checking whether the PC even has a valid IP.",
      "Setting a static IP as a quick fix — it can collide with the DHCP pool.",
    ],
    sim: "A real renew can still fail if the switch port is on the wrong VLAN or a DHCP relay (IP helper) is missing.",
    hint: "Fix the address first: `ipconfig /renew`. A 169.254.x.x address is not a working lease.",
    check: { q: "`ipconfig` shows 169.254.31.44. What does that tell you?",
      options: ["DNS is broken", "The PC did not receive a DHCP lease", "The website is down"], answer: 1,
      explain: "APIPA addresses are self-assigned when DHCP does not answer. DNS and websites come later in the chain." },
  },
  bruteforce: {
    skill: "security", title: "Brute-force attacks & log reading",
    concept: "Brute force = trying many passwords against an account. In Windows it shows up as many failed logons (event 4625) from one source address.",
    why: "The key question is not 'is someone attacking' but 'did it SUCCEED'. A successful logon (4624) from the same IP after a burst of failures means the account may be compromised.",
    irl: [
      "`Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625}` and group by source IP.",
      "Block at the perimeter: `New-NetFirewallRule -Direction Inbound -RemoteAddress <ip> -Action Block`.",
      "Real fixes are structural: MFA, lockout policy, no admin/RDP exposed to the internet, rename or disable the built-in Administrator.",
    ],
    pitfalls: [
      "Blocking one IP and calling it done — attackers rotate addresses.",
      "Not checking for a later successful logon (4624) from that address.",
    ],
    sim: "Real attacks come from many IPs; a single block-ip is only a first aid step.",
    hint: "Confirm the source in the security log first, then block exactly that address.",
    check: { q: "You see 300 failed logons (4625) from one IP. What must you verify before relaxing?",
      options: ["That the IP belongs to a known country", "Whether any successful logon (4624) came from that IP", "That the server has enough disk space"], answer: 1,
      explain: "Failures are noise; a success after failures is the incident." },
  },
  onboard: {
    skill: "identity", title: "Onboarding & role-based access",
    concept: "A new employee gets an account and access based on their ROLE — usually by adding the account to the right security groups, never by granting rights one by one.",
    why: "Groups make access manageable and auditable: when someone changes department you change group membership and everything follows. The principle is least privilege — only what the job needs.",
    irl: [
      "`New-ADUser`, `Add-ADGroupMember`; place the user in the correct OU so Group Policy applies.",
      "Temporary password + `ChangePasswordAtLogon`; follow the naming convention (first.last).",
      "Get the request from HR in a ticket — the paper trail is your protection.",
    ],
    pitfalls: [
      "Copying another user's permissions ('make her like Mark') — you copy his unneeded access too.",
      "Giving a new hire admin rights 'for now'.",
    ],
    sim: "Real onboarding also covers mailbox licence, MFA enrolment, laptop, badge and a first-day checklist.",
    hint: "Two checks: the account exists and is active, AND it is a member of the requested group.",
    check: { q: "Why add users to groups instead of assigning permissions to each user?",
      options: ["It is faster to type", "Access is easier to audit and change when people move roles", "Windows does not allow user permissions"], answer: 1,
      explain: "Groups scale and leave a clean audit trail." },
  },
  "group-add": {
    skill: "identity", title: "Access requests & approval",
    concept: "Group membership grants access. Adding someone is a security decision — it needs the approval of whoever owns the data.",
    why: "Group membership is copied into the user's access token at logon, so a change usually applies only after the user logs off and on again (or gets a new Kerberos ticket).",
    irl: [
      "`Add-ADGroupMember -Identity Group -Members user`; verify with `Get-ADGroupMember`.",
      "Record who approved it. Review membership of sensitive groups regularly (access recertification).",
    ],
    pitfalls: ["Granting access on the word of the requester alone.", "Forgetting to tell the user to log off and on."],
    sim: "The game applies the change instantly. In real life 'it still doesn't work' often means the user's old token.",
    hint: "The check looks at group membership: add the user to the group named in the ticket.",
    check: { q: "You added a user to a group but they still get 'access denied'. First idea?",
      options: ["They need to sign out and in to refresh their token", "Delete the group", "Give them Full Control"], answer: 0,
      explain: "Tokens are built at logon. Never fix access problems by over-granting." },
  },
  share: {
    skill: "server", title: "NTFS & share permissions",
    concept: "Access to a network share is controlled twice: share permissions and NTFS permissions. The user gets the MORE RESTRICTIVE of the two.",
    why: "That is why a user can 'see' the folder but not open it: they have list/traverse rights but not read. An explicit Deny beats Allow, and permissions inherit from parent folders unless inheritance is broken.",
    irl: [
      "`icacls D:\\Shares\\Finance` to read, `/grant Group:(OI)(CI)R` to apply read to subfolders.",
      "Assign groups, not individuals. Use *Effective Access* in the folder's Advanced Security dialog to test.",
    ],
    pitfalls: ["Granting Full Control 'to make it work'.", "Putting 'Everyone' on a share — see the audit ticket."],
    sim: "The game models one ACL list; real Windows evaluates share ACL, NTFS ACL, inheritance and deny entries together.",
    hint: "Check the current ACL first (`icacls <path>`), then grant the minimum needed (R = read).",
    check: { q: "Share permission: Full Control. NTFS permission: Read. What can the user do?",
      options: ["Full Control", "Read", "Nothing"], answer: 1,
      explain: "The most restrictive combination wins." },
  },
  mailbox: {
    skill: "server", title: "Mailbox quotas",
    concept: "Mailboxes have size limits: at a warning level the user is told, at the send limit they cannot send, at the receive limit mail bounces.",
    why: "Quotas keep storage predictable. 'Mailbox full' is also a symptom of a bigger problem: large attachments, no archiving policy, or a mail loop.",
    irl: [
      "`Get-MailboxStatistics user`, `Set-Mailbox user -ProhibitSendQuota ...`.",
      "Better long-term: online archive, retention policy, teach users to move attachments to SharePoint/OneDrive.",
    ],
    pitfalls: ["Raising the quota forever instead of fixing the cause.", "Not asking what filled it (one 2 GB attachment loop?)."],
    sim: "Real quotas are set per limit (warning / send / receive) and cloud plans have fixed maximums.",
    hint: "The quota must end up larger than the used space: `get-mailbox <user>` then `set-mailbox <user> <size>`.",
    check: { q: "A mailbox is full for the third month. Best long-term fix?",
      options: ["Raise the quota every month", "Archive/retention policy and find what fills it", "Disable the user's mail"], answer: 1,
      explain: "Fix the cause; a quota bump is a temporary patch." },
  },
  vpn: {
    skill: "network", title: "VPN & RADIUS authentication",
    concept: "A remote user connects to the VPN server, which asks a RADIUS server (Windows NPS, formerly IAS) to check the credentials against Active Directory.",
    why: "If RADIUS is down, every VPN login fails even though the VPN server itself is fine. Chain: client → VPN gateway → RADIUS (UDP 1812) → AD.",
    irl: [
      "Check the NPS/IAS service and its event log; confirm the shared secret matches on both sides.",
      "Look at the user's side too: expired password, locked account, missing MFA, expired certificate.",
    ],
    pitfalls: ["Restarting the VPN gateway when the authentication server is the broken link."],
    sim: "Real RADIUS issues are often a mismatched shared secret or an expired server certificate.",
    hint: "Follow the chain: what does the VPN depend on? The log in `C:\\Logs\\vpn.log` names it.",
    check: { q: "All VPN users fail at the same minute. What is the most likely cause?",
      options: ["Everyone mistyped their password", "A shared dependency such as the RADIUS server failed", "Home Wi-Fi outage"], answer: 1,
      explain: "Many users failing together point to a shared component, not to individuals." },
  },
  offboard: {
    skill: "identity", title: "Offboarding: disable, don't delete",
    concept: "When someone leaves, their access must end at the agreed time — but the account is normally disabled, not deleted.",
    why: "Deleting destroys mailbox, files and audit history that legal or the manager may still need. Disabling removes access while keeping everything recoverable.",
    irl: [
      "`Disable-ADAccount`, reset the password, revoke active sessions/tokens, remove from groups, hide from the address list.",
      "Hand mail and files to the manager (shared mailbox / archive), collect laptop and badge, delete after the retention period.",
    ],
    pitfalls: ["Disabling hours late — leavers with live access are a classic insider risk.", "Deleting the account the same day."],
    sim: "Real offboarding is a checklist coordinated with HR, with the exact time agreed.",
    hint: "The account must be disabled (active = no), not removed.",
    check: { q: "Why disable instead of delete?",
      options: ["Delete is not possible in AD", "Data and audit history stay recoverable until the retention period ends", "Disabled accounts cost less"], answer: 1,
      explain: "Retention and legal hold, plus you can reverse a mistake." },
  },
  deploy: {
    skill: "endpoint", title: "Deploying a workstation",
    concept: "New PCs get a standard OS image and are joined to the domain so that policies, software and security settings apply automatically.",
    why: "A standard image means every PC behaves the same and is easy to support. Domain join places the computer in an OU, where Group Policy applies. Naming conventions (WKS-114) make inventories readable.",
    irl: [
      "Image via WDS/MDT (PXE boot) or modern cloud provisioning (Windows Autopilot + Intune).",
      "`Add-Computer -DomainName pixlcorp.local`; enable BitLocker; manage local admin passwords (LAPS).",
    ],
    pitfalls: ["Hand-installing each PC differently.", "Leaving the computer in the default 'Computers' container — no policies apply."],
    sim: "The game compresses imaging, drivers, encryption and policy into two commands.",
    hint: "Two steps are checked: deployed AND joined to the domain.",
    check: { q: "Why join a PC to the domain?",
      options: ["So Group Policy and central management apply", "To make it faster", "To remove the need for passwords"], answer: 0,
      explain: "Central control is the whole point." },
  },
  reboot: {
    skill: "endpoint", title: "'Turn it off and on again' — and when not to",
    concept: "A restart clears many temporary faults, which is why it is the classic first step.",
    why: "But a restart also destroys evidence (memory contents, running processes) and hides recurring faults.",
    irl: [
      "`Restart-Computer -ComputerName WKS-101`, or `shutdown /r /m \\\\WKS-101 /t 60 /c \"message\"`.",
      "Warn the user to save work. If it freezes repeatedly, check uptime, event logs, disk SMART and RAM — then escalate.",
    ],
    pitfalls: ["Rebooting during a security incident — you lose volatile evidence.", "Never asking why it froze."],
    sim: "Real remote reboots can be blocked by firewalls or pending updates.",
    hint: "The workstation just needs to be rebooted: `reboot <PC>`.",
    check: { q: "A PC freezes daily. A reboot fixes it every time. What now?",
      options: ["Keep rebooting", "Investigate the logs/hardware or escalate — a pattern means a cause", "Replace the keyboard"], answer: 1,
      explain: "A repeating symptom is a clue, not a routine." },
  },
  phishing: {
    skill: "security", title: "Phishing response",
    concept: "Phishing tricks users into giving up credentials. Once a user typed a password into a fake page, treat the account as compromised.",
    why: "The attacker has a valid password, maybe a session token. They often create hidden mailbox rules or register their own MFA method to stay in.",
    irl: [
      "Reset the password, revoke sessions, review MFA methods and mailbox rules, read the sign-in log.",
      "Search for and remove the same e-mail from every mailbox; block the sender/domain and URL at the mail gateway or proxy.",
      "Report to the security team; support the user — people who report fast should be thanked, not blamed.",
    ],
    pitfalls: ["Only resetting the password and leaving a forwarding rule in place.", "Blaming the user so nobody reports next time."],
    sim: "Blocking an IP is weak against phishing: senders rotate and spoof. Domain and URL blocks matter more.",
    hint: "Contain first (disable, reset), then block the source — all four steps are checked.",
    check: { q: "A user entered a password on a fake page. Which is NOT part of a good response?",
      options: ["Revoke active sessions and review MFA methods", "Check mailbox rules for forwarding", "Wait to see whether anything happens"], answer: 2,
      explain: "Speed matters: attackers use stolen credentials within minutes." },
  },
  incident: {
    skill: "security", title: "Incident response phases",
    concept: "Incident response follows phases: Preparation → Detection & Analysis → Containment, Eradication, Recovery → Lessons learned (NIST SP 800-61).",
    why: "Contain first so the damage stops, then investigate. C2 'beaconing' looks like small outbound connections at regular intervals.",
    irl: [
      "Isolate the host (EDR network isolation or unplug the network) — do NOT power it off if you may need memory evidence.",
      "Block the C2 address, disable the account, preserve logs, build a timeline, escalate to the security lead.",
    ],
    pitfalls: ["Wiping the PC before collecting evidence.", "Not documenting times and actions."],
    sim: "The game isolates with `reboot`. In reality a reboot loses volatile evidence; real tools isolate by network.",
    hint: "Contain on three fronts: the account, the C2 address and the workstation.",
    check: { q: "A PC beacons to a suspicious IP. First priority?",
      options: ["Contain (isolate) while keeping evidence", "Format the disk immediately", "Email everyone the details"], answer: 0,
      explain: "Stop the spread, keep the evidence, then analyse." },
  },
  "share-audit": {
    skill: "security", title: "Least privilege & access reviews",
    concept: "'Everyone' on a share means every authenticated user — including contractors and compromised accounts — can read it.",
    why: "Over-broad permissions accumulate over the years. Auditors look for them because they turn one stolen account into access to everything.",
    irl: [
      "Replace 'Everyone' with specific groups: `icacls <path> /remove Everyone` then `/grant Group:R`.",
      "Run access reviews: owners confirm who should still have access. AGDLP: Accounts → Global groups → Domain Local groups → Permissions.",
    ],
    pitfalls: ["Removing access before telling the owner.", "Fixing one folder and not checking subfolders."],
    sim: "Real audits also review inherited permissions and service accounts.",
    hint: "Remove Everyone AND grant the proper group, or nobody has access.",
    check: { q: "Why is 'Everyone: Read' on a finance share a finding?",
      options: ["It is slow", "Any account, including a compromised one, can read sensitive data", "Everyone is not a valid group"], answer: 1,
      explain: "It violates least privilege." },
  },
  "stale-account": {
    skill: "identity", title: "Dormant accounts",
    concept: "Accounts of people who left are attack surface: nobody notices if they are used.",
    why: "Attackers love dormant accounts because they have valid access and nobody watching.",
    irl: [
      "Find them: `Search-ADAccount -AccountInactive -TimeSpan 90.00:00:00 -UsersOnly`.",
      "Archive data first, disable, move to a 'Disabled' OU, delete after the retention period. Review service accounts separately.",
    ],
    pitfalls: ["Deleting before archiving.", "Disabling a service account that something still depends on."],
    sim: "Real cleanup needs manager sign-off for each account.",
    hint: "Copy the data first with robocopy, then disable the account.",
    check: { q: "What comes first when cleaning up a departed user?",
      options: ["Delete the account", "Archive their data, then disable", "Reset their password to 'password'"], answer: 1,
      explain: "Data safe first, access off second, deletion much later." },
  },
  "power-user": {
    skill: "process", title: "Two faults in one ticket",
    concept: "Tickets often hide more than one problem. Fixing the first one does not mean the user can work.",
    why: "Every fault needs its own check. Verify each symptom is gone before you close.",
    irl: ["Make a list of symptoms from the ticket, fix one, test it, move on. Ask the user to confirm."],
    pitfalls: ["Closing the ticket after the first fix."],
    sim: "Real tickets can hide even more.",
    hint: "Two things are checked: the account works AND the share access exists.",
    check: { q: "You fixed the login but the user still cannot open the share. What does that show?",
      options: ["The first fix was wrong", "The ticket contained more than one fault", "The user is imagining it"], answer: 1,
      explain: "Test every symptom separately." },
  },
  "onboard-full": {
    skill: "endpoint", title: "Full onboarding workflow",
    concept: "Onboarding combines identity (account, groups) and endpoint (PC) work. Order matters: account first, then device, then the first-day checks.",
    why: "A PC joined to the domain gives the new user a working logon with their policies on day one.",
    irl: ["Use a checklist: account, groups, mailbox, MFA, PC, software, badge, first-day walkthrough."],
    pitfalls: ["Skipping the verification step on the user's first logon."],
    sim: "The game skips licences, MFA and physical handover.",
    hint: "Four steps are checked: account, group, deploy and domain join.",
    check: { q: "Why a checklist for onboarding?",
      options: ["It looks professional", "It prevents missed steps and gives an audit trail", "It is required by Windows"], answer: 1,
      explain: "Checklists remove memory from the process." },
  },
  phoneDiag: {
    skill: "process", title: "Diagnosing a vague ticket",
    concept: "'PC is acting up' is not a problem statement. The first job is to turn it into something testable.",
    why: "Good questions save hours: What exactly happens? Since when? What changed? Does it affect only you? Can you reproduce it? Is there an error message?",
    irl: [
      "Follow a method: identify the problem → theory → test → plan → implement → verify → document (CompTIA's troubleshooting steps).",
      "Check scope: one user, one PC, one site, or everyone?",
    ],
    pitfalls: ["Guessing and changing things before understanding.", "Leading questions that put words in the user's mouth."],
    sim: "Real users are less cooperative and describe symptoms in surprising ways.",
    hint: "Use the call: ask what changed and what the error says before touching anything.",
    check: { q: "Which question is the most useful first?",
      options: ["Did you try turning it off and on?", "What exactly happens, since when, and what changed before it?", "Are you sure it is broken?"], answer: 1,
      explain: "Symptom, timing and change reveal the cause most often." },
  },
  "doris-mega": {
    skill: "process", title: "Multiple failures: find the common cause",
    concept: "When several services fail at about the same time, look for ONE cause (a change, a permission, a power event) before fixing each separately.",
    why: "Correlating timestamps across logs usually reveals a single trigger.",
    irl: [
      "Build a timeline, ask 'what changed?', check change records, restore services in dependency order.",
      "Afterwards hold a blameless post-mortem: what failed, why, how to prevent it (the '5 whys').",
    ],
    pitfalls: ["Fixing symptoms in random order.", "Blaming a person instead of the process."],
    sim: "Real outages also need communication to users and management.",
    hint: "Both services must be running; start them and check each.",
    check: { q: "Three services stop within minutes of each other. First move?",
      options: ["Start them one by one without looking at anything", "Check what changed around that time to find the common trigger", "Reboot the server immediately"], answer: 1,
      explain: "Common cause first; reboot loses evidence." },
  },
  /* ===== security hygiene + SOC (pridané: patching, MFA, GPO, DNS, backup, triáž, phishing) ===== */
  patch: {
    skill: "security", title: "Patch & vulnerability management",
    concept: "A security patch fixes a known flaw (a CVE). A vulnerability scanner compares what is installed with databases of known flaws and lists every machine that is missing a fix.",
    why: "Once a flaw is public, attackers weaponise it within days — they scan the internet for machines that have not patched yet. Unpatched systems are the cheapest way into a company, which is why patching is the most boring and the most effective control there is.",
    irl: [
      "Pipeline: inventory → prioritise (CVSS score, and whether the flaw is *exploited in the wild* — see the CISA KEV list) → test on a pilot ring → deploy in a maintenance window → verify → report.",
      "Tools: WSUS / Microsoft Configuration Manager / Intune (Windows Update for Business). Check one PC with `Get-HotFix`, or the PSWindowsUpdate module.",
      "Do not forget third-party software: browsers, Java, PDF readers and VPN clients are attacked just as often as Windows.",
    ],
    pitfalls: [
      "Pushing a patch to every server at once without a test ring — a bad update can take payroll down.",
      "Ignoring the pending reboot: many patches are not active until the machine restarts.",
      "Only patching Windows and forgetting everything else.",
    ],
    sim: "The game installs a patch with one command (`install-patch`). Real updates are staged by an update service, need reboots, and can fail — then you read the Windows Update log and the System event log.",
    hint: "The Windows Update service (wuauserv) must be RUNNING before a patch can install. Check the pending KB with get-hotfix <PC>.",
    check: { q: "The scanner says a critical patch is missing on the payroll server. Best approach?",
      options: ["Install it immediately during working hours", "Test it on a pilot machine, schedule a maintenance window, patch, then verify", "Wait until next quarter's maintenance"], answer: 1,
      explain: "Speed matters, but so does not breaking production. Test, schedule, patch and verify — and prioritise by risk, not by habit." },
  },
  mfa: {
    skill: "identity", title: "MFA recovery & social engineering",
    concept: "Multi-factor authentication needs two or more different factors: something you know (password), something you have (phone, key) and something you are (fingerprint).",
    why: "A stolen password alone no longer gets an attacker in. So attackers now target the *recovery process*: they phone the help desk pretending to be an employee and ask for an MFA reset. Whoever resets MFA on a bad story hands over the account.",
    irl: [
      "Verify identity BEFORE the reset: call back on the number stored in the HR system, get the manager's approval, or use a video call with a photo ID.",
      "In the identity provider (Entra ID, Okta, …) clear the registered methods, revoke active sessions, and issue a one-time Temporary Access Pass.",
      "Log the request, who approved it and how identity was verified — you may need this evidence later.",
    ],
    pitfalls: [
      "Resetting MFA for anyone who 'knows' the employee ID or the manager's name — both are easy to find.",
      "Forgetting to revoke old sessions, so a thief who is already signed in stays signed in.",
      "Sending the temporary code over the same channel the attacker might control (the same e-mail account).",
    ],
    sim: "The game resets MFA with `reset-mfa`. A real reset is a workflow in the identity provider and should always include the verification step the ticket only describes.",
    hint: "get-mfa <user> shows the state; reset-mfa <user> clears it. In real life you verify first.",
    check: { q: "A caller says they are the CFO, got a new phone and need MFA reset urgently. What do you do?",
      options: ["Reset it — it is the CFO and it is urgent", "Verify via callback to the known number or manager approval, then reset and log it", "Ask them to e-mail their password so you can check"], answer: 1,
      explain: "Urgency plus authority is the classic social-engineering recipe. Verify through a channel you control, then act." },
  },
  gpo: {
    skill: "endpoint", title: "Group Policy & security baselines",
    concept: "Group Policy lets an admin define settings once — screen lock, password rules, firewall, drive mapping — and have every domain computer or user receive them automatically.",
    why: "Clients refresh policy at boot, at logon and roughly every 90 minutes. If a machine could not reach a domain controller (often a DNS problem), its policy goes stale and the machine silently falls out of the security baseline.",
    irl: [
      "On the PC: `gpupdate /force` refreshes now; `gpresult /r` (or `/h report.html`) shows which policies applied and which were filtered out.",
      "Remotely: `Invoke-GPUpdate -Computer <PC>`. In the console, *Group Policy Management* and *Group Policy Modeling* show what a user/computer would receive.",
      "Security baselines (CIS Benchmarks, Microsoft Security Baselines) tell you which settings to enforce.",
    ],
    pitfalls: [
      "Forcing gpupdate again and again without asking why it failed (DNS, network, security filtering, a bad WMI filter).",
      "Putting everything into the Default Domain Policy instead of linked, testable policies.",
      "Changing a policy for the whole company without testing on a pilot OU first.",
    ],
    sim: "In the game `gpupdate /force <PC>` is typed on the server. In reality the command runs on the client (or via Invoke-GPUpdate).",
    hint: "get-gpresult <PC> shows the policy as NOT APPLIED; then gpupdate /force <PC> fixes it.",
    check: { q: "`gpupdate /force` reports that the domain could not be contacted. Most likely cause?",
      options: ["The client cannot resolve or reach a domain controller (DNS/network)", "The monitor is too old", "The policy file is corrupt on every PC"], answer: 0,
      explain: "Policy comes from the domain controller; if the client cannot find it, start with DNS and connectivity." },
  },
  dns: {
    skill: "network", title: "DNS: names vs addresses",
    concept: "DNS translates names (portal.pixlcorp.local) into IP addresses. An A record maps a name to an IPv4 address; AAAA does the same for IPv6.",
    why: "Clients ask the DNS server they are configured with. If the record is missing the answer is 'name does not exist' even though the server is perfectly reachable by IP. That is the fingerprint of a DNS problem: works by IP, fails by name.",
    irl: [
      "Test: `Resolve-DnsName portal12.pixlcorp.local` or `nslookup portal12 <dns-server>`; clear a stale cache with `ipconfig /flushdns`.",
      "Create a record: `Add-DnsServerResourceRecordA -Name portal12 -ZoneName pixlcorp.local -IPv4Address 10.0.0.30`, or in DNS Manager.",
      "In a domain, DNS and Active Directory depend on each other: broken DNS breaks logons and Group Policy too.",
    ],
    pitfalls: [
      "Telling users to type the IP address — it works today and breaks the day the server moves.",
      "Leaving stale or duplicate records after servers are retired (set up scavenging).",
      "Forgetting caching: the old answer lives until the TTL expires.",
    ],
    sim: "The game has one DNS zone and no TTL or cache. Real DNS has several servers, caching, reverse (PTR) records and delegation.",
    hint: "get-dnsrecord <name> shows it is missing; add-dnsrecord <name> <ip> creates it with the IP from the ticket.",
    check: { q: "A site works when you type its IP but not its name. What does that tell you?",
      options: ["The network cable is broken", "Routing works; name resolution (DNS) is the problem", "The web server is switched off"], answer: 1,
      explain: "If the IP works, the network path and the server are fine. The missing piece is the name-to-address lookup." },
  },
  backup: {
    skill: "server", title: "Backups & ransomware readiness",
    concept: "A backup is a copy you can actually restore. The 3-2-1 rule: 3 copies, on 2 different media, with 1 stored off-site (modern advice adds one immutable or offline copy and zero restore errors).",
    why: "Ransomware encrypts your files and often deletes shadow copies and online backups first. A tested, isolated backup is the last line of defence — and a backup job that fails silently means you find out only on the worst day of the year.",
    irl: [
      "Monitor job results every day and treat a failed or 'warning' job as an incident. Typical causes: full target disk, VSS timeouts, locked files, expired credentials.",
      "Test restores on a schedule — that is the only proof. Define RPO (how much data you can lose) and RTO (how long recovery may take).",
      "Keep one copy immutable or offline and on separate credentials, so an attacker with domain admin cannot delete it. Tools: Veeam, Windows Server Backup (`wbadmin get versions`), Azure Backup.",
    ],
    pitfalls: [
      "Never testing a restore ('it says successful' is not proof).",
      "Storing backups on a share that every admin account — and therefore every attacker with admin — can delete.",
      "Re-running a failed job without fixing the reason it failed.",
    ],
    sim: "The game re-runs the job with `start-backup`. A real fix addresses the root cause (disk space, VSS) and ends with a test restore.",
    hint: "get-backup lists the failed job; start-backup <job> re-runs it.",
    check: { q: "A backup failed because the target disk was full. After a re-run it succeeds. What else should you do?",
      options: ["Nothing, it is green now", "Fix the capacity/retention problem and verify a test restore", "Delete random old backups to free space"], answer: 1,
      explain: "Green is not proof. Fix why it failed (capacity) and prove recoverability with a restore test." },
  },
  triage: {
    skill: "security", title: "SOC alert triage",
    concept: "A SIEM or EDR raises alerts when something matches a rule. Triage is the first decision on each one: false positive (harmless), true positive (real — contain it) or escalate (needs more skill, authority or people).",
    why: "Tools produce far more alerts than people can read, and most are noise — so a SOC analyst's job is judgement. Context decides: is this normal for this user, this machine, this time? Is there a change ticket? How critical is the asset?",
    irl: [
      "Tools: Microsoft Sentinel, Splunk, Elastic (SIEM); Defender for Endpoint, CrowdStrike (EDR); SOAR playbooks automate the repetitive steps.",
      "Map behaviour to MITRE ATT&CK (e.g. 'PowerShell from Office' → Execution; 'shadow copy deletion' → Impact) so everyone describes the same attack the same way.",
      "Always document the verdict and the reasoning — and feed false positives back so detection engineers can tune the rule.",
    ],
    pitfalls: [
      "Closing alerts as false positives out of habit (alert fatigue is a real, documented risk).",
      "Escalating everything — you stop being trusted — or investigating a colleague alone when it touches HR or legal.",
      "Not recording why you decided; the next shift (or an auditor) must be able to follow your logic.",
    ],
    sim: "The game gives you the evidence. In real life most of the work is *finding* it: pivoting between logs, endpoint data, identity and network tools.",
    hint: "Ask: who, what, when — and is it normal? Check the baseline and the change calendar.",
    check: { q: "An alert concerns a senior manager's account and you are not sure whether it is real. Best move?",
      options: ["Close it as a false positive to keep the queue clean", "Escalate with your evidence and what you already checked", "Wait and see if more alerts appear"], answer: 1,
      explain: "When impact is high and certainty is low, escalate with evidence — that is what Tier 1 is for." },
  },
  phishmail: {
    skill: "security", title: "Spotting & handling phishing",
    concept: "Phishing is a deceptive message that tries to steal credentials, run malware or trick someone into paying. Business e-mail compromise (CEO fraud) skips malware entirely and just asks for money.",
    why: "People are the most common way in. Technical controls (SPF, DKIM, DMARC, link scanning) catch a lot but never everything, so users and analysts both need the habit of checking: real sender domain, Reply-To, link target, attachment type, urgency and secrecy.",
    irl: [
      "Read the full headers: `Authentication-Results` shows spf/dkim/dmarc pass or fail. Look up a suspicious URL in a sandbox before anyone clicks it.",
      "Respond: search every mailbox for the same message and remove it (Microsoft Purview content search), block the domain, and force a password reset plus session revocation for anyone who entered credentials.",
      "Treat reporting as a good thing: a 'report phish' button feeds the SOC and builds the right habit.",
    ],
    pitfalls: [
      "Replying to the sender, or forwarding the sample to colleagues as a normal e-mail.",
      "Shaming users who clicked — they will stop reporting next time.",
      "Judging only by logos and grammar; modern phishing is polished. Check the domain and the request.",
    ],
    sim: "The training mails use simplified, obvious signs. Real phishing is often a perfect copy of a real login page and arrives from a hijacked, trusted account.",
    hint: "Compare the sender's domain with pixlcorp.local, hover the link, and ask what the mail wants you to do — and how quickly.",
    check: { q: "The 'CEO' writes from an Outlook.com address and asks for a secret, urgent payment. What do you do?",
      options: ["Pay it — the boss asked", "Reply and ask for more details", "Verify by phone using a known number and report it as phishing"], answer: 2,
      explain: "Free-mail sender, urgency and secrecy are the BEC pattern. Verify through a second channel and report." },
  },
};

/* Rosetta: príkaz z hry → ako to vyzerá v reálnom svete */
const ROSETTA = [
  ["net user <u> /active:yes", "Domain: `Unlock-ADAccount` / `Enable-ADAccount`. Local accounts: `net user <u> /active:yes`."],
  ["net user <u> <pass> /add", "Domain: `New-ADUser -Name ... -AccountPassword (Read-Host -AsSecureString)`. Local: `net user /add`."],
  ["net group <g> <u> /add", "`Add-ADGroupMember -Identity <g> -Members <u>` (or `net group <g> <u> /add /domain`)."],
  ["icacls <path>", "Real tool, same name. Also `Get-Acl`, and the Effective Access tab in Explorer."],
  ["get-service / start-service", "Real cmdlets. GUI: `services.msc`. Remote: `-ComputerName`."],
  ["ipconfig /renew", "Real command (`/release`, `/all`). Also `Get-NetIPConfiguration`."],
  ["ping / nslookup", "Real commands. Also `Test-NetConnection host -Port 443` and `Resolve-DnsName`."],
  ["eventlog security", "`Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4625}` or Event Viewer."],
  ["block-ip <ip>", "`New-NetFirewallRule -Direction Inbound -RemoteAddress <ip> -Action Block` (plus perimeter firewall)."],
  ["wds-deploy <PC>", "Windows Deployment Services / MDT (PXE boot), or Autopilot + Intune for cloud-managed PCs."],
  ["add-computer <PC>", "`Add-Computer -DomainName pixlcorp.local -Restart` (run on the PC)."],
  ["get-mailbox / set-mailbox", "Exchange: `Get-Mailbox`, `Get-MailboxStatistics`, `Set-Mailbox -ProhibitSendQuota ...`."],
  ["robocopy <src> <dst> /E", "Real command. Often add `/COPYALL /R:1 /W:1 /LOG:file` for ACLs and a log."],
  ["reboot <PC>", "`Restart-Computer -ComputerName <PC>` or `shutdown /r /m \\\\<PC>`."],
  ["gpupdate /force <PC>", "On the PC: `gpupdate /force`; remotely `Invoke-GPUpdate -Computer <PC>`. Inspect with `gpresult /r` or `gpresult /h report.html`."],
  ["get-dnsrecord / add-dnsrecord", "`Resolve-DnsName <name>`, `Add-DnsServerResourceRecordA -Name <n> -ZoneName pixlcorp.local -IPv4Address <ip>` (DNS Manager GUI)."],
  ["get-backup / start-backup <job>", "Depends on the product: Veeam console, `wbadmin get versions` / `wbadmin start backup`, Azure Backup. Always finish with a test restore."],
  ["get-hotfix / install-patch <KB>", "Real: `Get-HotFix`; install via Windows Update / WSUS / Intune or the PSWindowsUpdate module (`Install-WindowsUpdate`). Reboot afterwards."],
  ["get-mfa / reset-mfa <user>", "Identity provider (Entra ID / Okta): clear registered methods, revoke sessions, issue a Temporary Access Pass — after verifying identity."],
];

const GLOSSARY = [
  ["Active Directory (AD)", "Microsoft's directory service: central store of users, computers and groups for a domain."],
  ["Domain controller (DC)", "A server that holds AD and answers logon requests."],
  ["OU", "Organizational Unit — a folder inside AD, used to delegate admin and apply Group Policy."],
  ["GPO", "Group Policy Object — settings pushed to users or computers (e.g. password rules, wallpaper)."],
  ["DNS", "Turns names into IP addresses. AD depends heavily on it."],
  ["DHCP", "Gives devices an IP address automatically; failure gives 169.254.x.x (APIPA)."],
  ["SLA", "Service Level Agreement — how fast a ticket must be answered or solved."],
  ["NTFS / ACL", "Windows file system permissions; an ACL is the list of who may do what."],
  ["Least privilege", "Give only the access needed for the job, nothing more."],
  ["RADIUS / NPS", "Protocol and Windows role that checks credentials for VPN and Wi-Fi."],
  ["MFA", "Multi-factor authentication — password plus something you have or are."],
  ["Phishing", "Fake messages that steal credentials or install malware."],
  ["C2 / beaconing", "Command-and-control: infected PC regularly 'phones home' to attacker."],
  ["SIEM", "Tool that collects logs from many systems and alerts on patterns."],
  ["EDR", "Endpoint Detection & Response — security agent that can isolate a PC remotely."],
  ["CIA triad", "Confidentiality, Integrity, Availability — the three goals of security."],
  ["RTO / RPO", "How fast you must recover / how much data loss is acceptable."],
  ["ITIL", "A framework of IT service management practices (incident, problem, change)."],
];

const METHOD = [
  ["1. Identify the problem", "Ask questions, check logs, find out what changed, find out the scope (one user or all?)."],
  ["2. Establish a theory", "Start with the simplest probable cause. Question the obvious."],
  ["3. Test the theory", "Prove or disprove it. If wrong, form a new theory — or escalate."],
  ["4. Plan the fix", "Think about side effects, get approval for risky changes, have a rollback."],
  ["5. Implement and verify", "Apply the fix, then confirm with the USER that it really works."],
  ["6. Document", "Write what you found and did. Tomorrow's you (or the next shift) will need it."],
];

const learn = (() => {
  const safeState = () => {
    if (!state.learn || typeof state.learn !== "object") state.learn = { seen: [], mistakes: {}, skills: {} };
    for (const k of ["seen", "quizzed"]) if (!Array.isArray(state.learn[k])) state.learn[k] = [];
    for (const k of ["mistakes", "skills"]) if (!state.learn[k] || typeof state.learn[k] !== "object") state.learn[k] = {};
    return state.learn;
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  /* escapuje a potom zmení `kód` na <code> */
  const rich = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

  function lessonKey(t) {
    if (!t) return null;
    if (t.kind && LESSONS[t.kind]) return t.kind;
    if (LEARN_STORY_MAP[t.id]) return LEARN_STORY_MAP[t.id];
    if (t.doris) return "lockout";
    return null;
  }
  function lessonFor(t) {
    const key = lessonKey(t);
    return key ? { key, ...LESSONS[key] } : null;
  }

  function markSeen(t) {
    const l = lessonFor(t);
    if (!l) return null;
    const L = safeState();
    if (!L.seen.includes(l.key)) L.seen.push(l.key);
    L.skills[l.skill] = Math.min(100000, (L.skills[l.skill] || 0) + 1);
    return l;
  }

  function debriefHtml(t) {
    const l = lessonFor(t);
    if (!l) return "";
    const L = safeState();
    const first = !L.seen.includes(l.key);
    const quizzed = L.quizzed.includes(l.key);
    const list = (arr) => `<ul>${arr.map((x) => `<li>${rich(x)}</li>`).join("")}</ul>`;
    const opts = l.check.options.map((o, i) =>
      `<button type="button" class="lrn-opt" data-i="${i}">${esc(o)}</button>`).join("");
    return `
      <div class="lrn-card" data-lesson="${esc(l.key)}">
        <div class="lrn-head">🎓 <b>What you just did — in real life</b>
          <span class="lrn-skill">${esc(LEARN_SKILLS[l.skill] || l.skill)}</span></div>
        <div class="lrn-title">${esc(l.title)}${first ? ' <span class="lrn-new">NEW</span>' : ""}</div>
        <p>${rich(l.concept)}</p>
        <details><summary>Why it works</summary><p>${rich(l.why)}</p></details>
        <details ${first ? "open" : ""}><summary>How professionals do it</summary>${list(l.irl)}</details>
        <details><summary>Common mistakes</summary>${list(l.pitfalls)}</details>
        <details><summary>Simulation vs reality</summary><p>${rich(l.sim)}</p></details>
        <div class="lrn-check">
          <div class="lrn-q">🤔 ${esc(l.check.q)}${quizzed ? ' <span class="lrn-done">✔ answered</span>' : " <i>(+5 XP)</i>"}</div>
          <div class="lrn-opts">${opts}</div>
          <div class="lrn-fb" aria-live="polite"></div>
        </div>
      </div>`;
  }

  /* vyhodnotenie odpovede: správne = +5 XP raz za lekciu */
  function answer(key, idx) {
    const l = LESSONS[key];
    if (!l) return { correct: false, explain: "" };
    const L = safeState();
    const correct = Number(idx) === l.check.answer;
    if (correct) {
      if (!L.quizzed.includes(key)) {
        L.quizzed.push(key);
        state.xp += 5;
        L.skills[l.skill] = Math.min(100000, (L.skills[l.skill] || 0) + 1);
      }
    } else {
      L.mistakes[key] = Math.min(100000, (L.mistakes[key] || 0) + 1);
    }
    saveGame();
    return { correct, explain: l.check.explain };
  }

  /* hint pri zlom `resolve` (nie pri každom pokuse: 1., 3., 5. …) */
  const failCount = {};
  function onFail(t) {
    const l = lessonFor(t);
    if (!l) return;
    failCount[t.id] = (failCount[t.id] || 0) + 1;
    const L = safeState();
    L.mistakes[l.key] = Math.min(100000, (L.mistakes[l.key] || 0) + 1);
    if (failCount[t.id] % 2 === 1 && typeof termPrint === "function") {
      termPrint(`💡 Think: ${l.hint}`, "t-warn");
      termPrint("   (Method: identify → theory → test → fix → verify → document. See the Learn app.)", "t-dim");
    }
  }

  /* `explain <príkaz>` v termináli */
  function explain(arg) {
    const q = String(arg || "").trim().toLowerCase();
    if (!q) {
      return ["EXPLAIN — what a command looks like in the real world:", ...ROSETTA.map((r) => `  ${r[0]}`),
        "Usage: explain <command>   e.g.  explain net user    ·   learn → opens topic list"];
    }
    const hit = ROSETTA.filter((r) => r[0].toLowerCase().includes(q));
    if (!hit.length) return [`No real-world note for '${q}'. Try 'explain' for the list.`];
    return hit.flatMap((r) => [`${r[0]}`, `  Real world: ${r[1].replace(/`/g, "")}`]);
  }

  function skillSummary() {
    const L = safeState();
    return Object.keys(LEARN_SKILLS).map((id) => {
      const count = L.skills[id] || 0;
      return { id, label: LEARN_SKILLS[id], count, level: count >= 12 ? "Solid" : count >= 5 ? "Practised" : count >= 1 ? "Started" : "—" };
    });
  }

  /* ---------- aplikácia Learn ---------- */
  function mountApp(body) {
    let tab = "lessons";
    const render = () => {
      const L = safeState();
      const tabs = [["lessons", "📘 Lessons"], ["method", "🧭 Method"], ["cmds", "⌨ Commands"], ["gloss", "📖 Glossary"], ["skills", "📈 Skills"]];
      let inner = "";
      if (tab === "lessons") {
        inner = Object.keys(LESSONS).map((k) => {
          const seen = L.seen.includes(k);
          const l = LESSONS[k];
          return `<details class="lrn-item ${seen ? "" : "locked"}"><summary>${seen ? "📘" : "🔒"} ${esc(l.title)}
              <span class="lrn-skill">${esc(LEARN_SKILLS[l.skill])}</span></summary>
              ${seen ? `<p>${rich(l.concept)}</p><p><b>Why:</b> ${rich(l.why)}</p><b>In real life</b><ul>${l.irl.map((x) => `<li>${rich(x)}</li>`).join("")}</ul>
              <b>Avoid</b><ul>${l.pitfalls.map((x) => `<li>${rich(x)}</li>`).join("")}</ul><p class="lrn-sim"><b>Simulation vs reality:</b> ${rich(l.sim)}</p>`
              : `<p class="lrn-lock">Solve a ticket of this kind to unlock the lesson.</p>`}</details>`;
        }).join("");
      } else if (tab === "method") {
        inner = `<p>Every professional troubleshooting process looks like this (CompTIA A+ calls it the troubleshooting methodology):</p>` +
          METHOD.map((m) => `<div class="lrn-step"><b>${esc(m[0])}</b><span>${esc(m[1])}</span></div>`).join("") +
          `<p class="lrn-sim">Tip: when you are stuck for more than ~15 minutes on a real job, escalating with good notes is the professional move.</p>`;
      } else if (tab === "cmds") {
        inner = `<p>The game's commands and what they map to in a real Windows environment:</p>` +
          ROSETTA.map((r) => `<div class="lrn-step"><b><code>${esc(r[0])}</code></b><span>${rich(r[1])}</span></div>`).join("");
      } else if (tab === "gloss") {
        inner = GLOSSARY.map((g) => `<div class="lrn-step"><b>${esc(g[0])}</b><span>${esc(g[1])}</span></div>`).join("");
      } else {
        inner = `<p>Skills grow as you solve tickets and answer the reflection questions.</p>` +
          skillSummary().map((s) => `<div class="lrn-skillrow"><span>${esc(s.label)}</span>
            <div class="lrn-bar"><i style="width:${Math.min(100, s.count * 8)}%"></i></div><b>${esc(s.level)}</b></div>`).join("");
      }
      body.innerHTML = `<div class="lrn-app"><div class="lrn-tabs">${tabs.map((t) =>
        `<button class="lrn-tab ${t[0] === tab ? "active" : ""}" data-tab="${t[0]}">${t[1]}</button>`).join("")}</div>
        <div class="lrn-pane">${inner}</div></div>`;
      body.querySelectorAll(".lrn-tab").forEach((b) => { b.onclick = () => { tab = b.dataset.tab; if (typeof SFX !== "undefined") SFX.click(); render(); }; });
    };
    render();
    body._learnRender = render;
  }

  /* delegovaný klik na odpoveď v debriefe (notes modal) */
  function bindCard(root) {
    if (!root || root._lrnBound) return;
    root._lrnBound = true;
    root.addEventListener("click", (e) => {
      const b = e.target.closest(".lrn-opt");
      if (!b) return;
      const card = b.closest(".lrn-card");
      if (!card || card.dataset.answered === "1") return;
      const res = answer(card.dataset.lesson, b.dataset.i);
      card.querySelectorAll(".lrn-opt").forEach((x) => { x.disabled = true; });
      b.classList.add(res.correct ? "ok" : "bad");
      const fb = card.querySelector(".lrn-fb");
      fb.textContent = (res.correct ? "✔ Correct. " : "✘ Not quite. ") + res.explain;
      if (res.correct) {
        card.dataset.answered = "1";
        if (typeof renderTopbar === "function") renderTopbar();
        if (typeof SFX !== "undefined") SFX.ding();
      } else {
        // pri zlej odpovedi môže hráč skúsiť znova
        setTimeout(() => card.querySelectorAll(".lrn-opt").forEach((x) => { x.disabled = false; x.classList.remove("bad"); }), 900);
        if (typeof SFX !== "undefined") SFX.err();
      }
    });
  }

  /* ---------- hodnotenie odpovede používateľovi (profesionálna komunikácia) ---------- */
  function gradeReply(text) {
    const t = String(text || "");
    const checks = [
      { label: "Greeting / polite tone", ok: /\b(hi|hello|dear|good (morning|afternoon)|hey)\b/i.test(t) },
      { label: "Says what you did", ok: /\b(i have|i['’]ve|we have|we['’]ve|unlocked|reset|restarted|started|fixed|checked|added|created|disabled|renewed|raised|blocked|resolved|deployed|granted)\b/i.test(t) },
      { label: "Next step / asks for confirmation", ok: /\b(please|let me know|confirm|try again|if (it|the problem|this) (still|persists)|contact|call me|reply)\b/i.test(t) },
      { label: "Enough detail (60+ characters)", ok: t.trim().length >= 60 },
    ];
    const leak = /\b(pass(word)?|pwd)\s*(is|:|=)\s*\S{4,}/i.test(t) || /\b[A-Za-z]+\d{3,}!/.test(t);
    const score = checks.filter((c) => c.ok).length;
    return { checks, leak, score, xp: leak ? 0 : score * 2 };
  }

  return { gradeReply, lessonFor, debriefHtml, markSeen, answer, onFail, explain, skillSummary, mountApp, bindCard };
})();
