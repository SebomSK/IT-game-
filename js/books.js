/* ===== TicketQuest — IT Library: učebné knihy na tvojom desktope ===== */
/* Každá kniha = súbor .book v C:\Books + čitateľné kapitoly v Library app. */

const BOOKS = [
  {
    file: "it-fundamentals.book",
    title: "IT Fundamentals",
    desc: "How computers actually work — the base everything else stands on.",
    chapters: [
      { t: "1. How a computer works", body:
`A computer is a machine that follows instructions, very fast, one at a time.

CPU — the brain. Executes instructions (billions per second).
RAM — short-term memory. Fast, but empty when power goes off.
Disk (SSD/HDD) — long-term memory. Slow, but keeps data.
Motherboard — everything is plugged into it.

When you "open a program": the OS copies it from disk into RAM, the CPU
executes it. When a machine "has no RAM free", it starts swapping to disk
→ everything becomes slow. 90% of "my PC is slow" = RAM or disk full.

Helpdesk rule: slow ≠ broken. Check Task Manager before reinstalling anything.` },
      { t: "2. Operating systems", body:
`The OS (Windows, Linux, macOS) is a manager between hardware and programs.

It handles:
- Processes (who gets CPU time)
- Memory (which program owns which RAM)
- Files (folders, permissions, the file system)
- Drivers (how to talk to hardware)

Windows uses NTFS for its file system, Linux mostly ext4. Windows hides
extensions by default (.txt vs .txt.exe — a classic malware trick).

As helpdesk you live in Windows: Services, Event Viewer, Device Manager,
Task Manager. Learn where things are — speed matters in real jobs.` },
      { t: "3. Files, users & permissions", body:
`Every file has an owner and permissions. Windows: NTFS ACLs (Read,
Modify, Full Control). Linux: rwx for user/group/others.

Users can be:
- Local (only on that machine)
- Domain (central server — Active Directory)

Least privilege principle: give everyone the MINIMUM access they need.
An accountant does not need admin rights. Neither does the CEO.
This one rule prevents most security disasters.` },
      { t: "4. Backups — the last line of defense", body:
`Hardware dies. Users delete things. Ransomware encrypts everything.

The 3-2-1 rule:
- 3 copies of important data
- 2 different storage types (disk + cloud/tape)
- 1 copy OFFSITE (other building / cloud)

A backup you never tested is a hope, not a backup. Real IT teams run
restore drills. When a user says "I deleted my file", you are the hero
with the backup — if you set it up on a calm day.` },
    ],
  },
  {
    file: "networking.book",
    title: "Networking Basics",
    desc: "IP addresses, DHCP, DNS — decode 'the internet is down'.",
    chapters: [
      { t: "1. IP addresses", body:
`Every device on a network has an IP address — like a postal address.

IPv4 example: 10.0.0.57 (four numbers, 0–255).
Private ranges (offices, homes): 10.x.x.x, 172.16–31.x.x, 192.168.x.x.
Public IPs are what the whole internet sees.

Subnet mask (255.255.255.0) says which part is "network" and which is
"device". Gateway = the door out of your network (usually the router).
DNS = the phonebook translating names → IPs.

ipconfig shows all of it. Learn to read it like a doctor reads blood
results — every line is a clue.` },
      { t: "2. DHCP & APIPA", body:
`DHCP automatically gives devices their IP configuration.

When a PC boots it asks: "any DHCP around?" — the server leases it an
address for some time.

If NO DHCP answers, Windows invents its own address: 169.254.x.x —
called APIPA. If you ever see 169.254 in ipconfig, you KNOW the machine
never reached a DHCP server. That is not a guess, it's a fact.

Fixes: ipconfig /renew, check the cable, check the switch port, check
whether the DHCP service is running.` },
      { t: "3. DNS — the phonebook of the internet", body:
`Nobody types 93.184.216.34 — you type example.com. DNS translates.

Order of operations when "the internet doesn't work":
1. Can I ping 8.8.8.8?      → YES = IP works, DNS is broken
2. Can I ping 10.0.0.1?     → YES = LAN works, gateway problem
3. Is the cable/switch OK?  → NO = physical layer first, always

nslookup shows what the DNS server answers. If DNS is down, browsers
say "server not found" even though the network is fine — the most
misdiagnosed problem in helpdesk history.` },
      { t: "4. Troubleshooting method", body:
`Professionals don't guess — they narrow down layers, bottom-up:

1. Physical — cable plugged in? lights on the port?
2. Link — does ipconfig show a valid IP (not 169.254)?
3. Local — ping the gateway.
4. Internet — ping 8.8.8.8.
5. Name — ping google.com.
6. Application — only ONE website broken? It's the website.

The user says "internet is broken". The log says which layer is broken.
Remember Zora's rule: what the user says is a theory. What the test
shows is a fact.` },
    ],
  },
  {
    file: "windows-server.book",
    title: "Windows Server & Active Directory",
    desc: "Users, groups, services, permissions — the heart of corporate IT.",
    chapters: [
      { t: "1. Active Directory & domain", body:
`Active Directory (AD) is the company's database of everything:
users, groups, computers, printers. A DOMAIN is the network managed
by AD — one login works on every PC.

The server holding AD is the Domain Controller (DC). In this game it's
SRV-DC01. "net user" talks to it.

Life cycle of an employee:
- Onboarding: create account, add to groups, deploy a PC
- Transfer: change groups
- Offboarding: DISABLE the account (never delete first — data and
  audit history matter)` },
      { t: "2. Users & groups", body:
`Users = identities. Groups = containers of permissions.

NEVER assign permissions to individual users — assign to GROUPS, and
put users in groups. Accounting needs the Finance share? Make an
Accounting group, grant the group, and every accountant gets access
automatically. One change, zero chaos.

Useful commands:
  net user <name>                     — inspect an account
  net user <name> <pass> /add         — create
  net user <name> /active:yes|no      — enable/disable
  net group <g> <name> /add|/remove   — group membership` },
      { t: "3. Windows services", body:
`Services are background programs: printing, DNS, VPN authentication...

They have states: RUNNING, STOPPED, PAUSED. Half of all "the system is
down" incidents = a stopped service.

  get-service <name>     — status
  start-service <name>   — start it
  restart-service <name> — restart

Print Spooler (spooler) is the most rebooted service in human history.
If a printer "does nothing", check the spooler BEFORE touching hardware.
The classic order: service → driver → cable. In that order, every time.` },
      { t: "4. NTFS permissions & shares", body:
`A SHARE is a folder offered over the network (D:\\Shares\\Finance).
Permissions decide who can read (R), modify (M) or fully control (F).

  icacls <path>               — view ACL
  icacls <path> /grant user:R — grant read
  icacls <path> /remove user  — remove access

Access denied ≠ broken. It means permissions work exactly as set —
just not in the user's favor. Read the ACL before granting anything.
And audit: who had access to salaries folder? Only Accounting. Forever.` },
    ],
  },
  {
    file: "powershell.book",
    title: "PowerShell for Helpdesk",
    desc: "The real superpower of modern IT admins — start with Get-*.",
    chapters: [
      { t: "1. Why PowerShell", body:
`PowerShell is a shell + scripting language built around OBJECTS, not
text. cmd.exe prints words; PowerShell hands you live objects you can
sort, filter and count.

Command names are Verb-Noun and consistent:
  Get-Service, Get-Process, Get-EventLog, Start-Service, Stop-Process

Learn Get-* first. You cannot break anything by asking questions —
that's the beauty of read commands. Power comes later from pipelines.` },
      { t: "2. The pipeline — the big idea", body:
`The pipe | sends the output of one command into the next:

  Get-Service | Where Status -eq 'Stopped'
  → all stopped services, right now

  Get-Process | Sort CPU -Descending | Select -First 5
  → top 5 CPU hogs in one line

  Get-EventLog Security -Newest 20 | Format-Table -AutoSize

Once you think in pipes, you write less and find more. Every real
sysadmin's muscle memory is: Get → Where → Sort → Select.` },
      { t: "3. Everyday helpdesk PowerShell", body:
`Real one-liners used in offices daily:

  Get-Service spooler                     — is printing alive?
  Restart-Service spooler                 — restart printing
  Get-EventLog System -Newest 50          — recent system events
  Get-ComputerInfo | Select CsName, OsArchitecture
  Get-ADUser elena.novak -Properties LockedOut   (on a DC with AD module)

In this game the terminal uses classic commands (net user, get-service)
— but when you land a real job, these PowerShell lines are what your
seniors actually type. Practice them whenever you can.` },
      { t: "4. Safe scripting", body:
`Rules that keep you employed:

1. Read the command out loud before pressing Enter. If you can't
   explain what it does — don't run it.
2. -WhatIf is your friend: many commands support
   Remove-Item C:\\Temp -Recurse -WhatIf  → preview, no damage.
3. Never copy-paste from random websites into an admin shell. One
   character can turn "cleanup" into "delete the disk".
4. Test on a test machine. Every senior has a story about a command
   they ran once. Ask them — the stories are excellent and instructive.` },
    ],
  },
  {
    file: "security.book",
    title: "Security Essentials",
    desc: "Passwords, logs, social engineering — think like the SOC.",
    chapters: [
      { t: "1. Passwords & MFA", body:
`Weak passwords are the #1 way into companies. Modern guidance (NIST):
- length beats complexity: Passphrase > Tr0ub4dor&3
- no forced 90-day rotation (it makes people choose Password23!)
- never reuse across systems

MFA (multi-factor) = password + phone/app code. It kills 99% of
password theft attacks. If you can enable MFA for one thing, make it
the admin accounts and the VPN.

Password resets are the most frequent helpdesk ticket — and a favorite
social engineering target. Always verify WHO is asking.` },
      { t: "2. Reading event logs", body:
`Windows writes everything to event logs. Event Viewer → Security log:

  4624 — successful logon
  4625 — FAILED logon ← your best friend
  4740 — account locked out
  4720 — user created
  4726 — user deleted

Dozens of 4625 for one account from one IP = brute-force attack in
progress. That's exactly the ticket #1044 you solved. Real SOC teams
live in these numbers — SIEM tools just aggregate them.

Correlate: same IP hitting many accounts = password spray. Block the
IP, audit the accounts, alert the team.` },
      { t: "3. Social engineering", body:
`The strongest firewall loses to a friendly phone call.

Attacker calls: "Hi, IT here — I need your password for an urgent sync."
Real IT NEVER asks for your password. Never. Not once. We RESET it,
we don't ASK for it.

Red flags: urgency ("now or you're fired!"), authority ("CEO needs
it"), fear ("your account will be deleted"), unusual channel (helpdesk
via personal WhatsApp).

In tickets and calls, verify identity through a known channel before
any change. Being "annoying" here is being professional.` },
      { t: "4. Least privilege & zero trust", body:
`Two ideas that rule modern security:

Least privilege — everyone gets the minimum access to do their job.
Admin rights? Only for IT, on separate accounts. The intern who can
also wipe the payroll share is an accident scheduled for Friday.

Zero trust — "internal network" is not automatically friendly. Verify
every access: who, from where, to what. VPN + MFA + logging on
everything. The office LAN is no longer a safe zone — laptops travel,
attackers get in. Assume breach, verify always.

Your job as IT is not "make everything work". It is: make it work
safely, provably, and repeatable.` },
    ],
  },
];

function findBook(fileOrTitle) {
  return BOOKS.find((b) => b.file === fileOrTitle) ||
         BOOKS.find((b) => b.title === fileOrTitle) || null;
}

/* ---------- Library reader (used by the desktop app) ---------- */
const library = {
  book: null,
  ch: 0,
};

function libraryRender() {
  const body = document.getElementById("library-body");
  if (!body) return;
  body.innerHTML = "";

  if (!library.book) {
    const head = document.createElement("div");
    head.className = "lib-head";
    head.textContent = "📖 IT Library — your books (C:\\Books)";
    body.appendChild(head);

    const list = document.createElement("div");
    list.className = "lib-list";
    for (const b of BOOKS) {
      const item = document.createElement("button");
      item.className = "lib-book";
      item.innerHTML = `<div class="lib-book-title">📘 ${b.title}</div>
        <div class="lib-book-desc">${b.desc}</div>
        <div class="lib-book-meta">${b.chapters.length} chapters · ${b.file}</div>`;
      item.onclick = () => { SFX.click(); library.book = b; library.ch = 0; libraryRender(); };
      list.appendChild(item);
    }
    body.appendChild(list);

    const tip = document.createElement("div");
    tip.className = "lib-tip";
    tip.textContent = "💡 Tip: read the SOP Binder before every new ticket type — and the books whenever a concept is new. That's how real IT people level up.";
    body.appendChild(tip);
    return;
  }

  const b = library.book;
  const head = document.createElement("div");
  head.className = "lib-head";
  head.innerHTML = `<button id="lib-back" class="lib-btn">◂ All books</button>
    <span class="lib-book-title big">📘 ${b.title}</span>`;
  body.appendChild(head);
  head.querySelector("#lib-back").onclick = () => { SFX.click(); library.book = null; libraryRender(); };

  const chapters = document.createElement("div");
  chapters.className = "lib-chapters";
  b.chapters.forEach((c, i) => {
    const btn = document.createElement("button");
    btn.className = "lib-btn ch" + (i === library.ch ? " active" : "");
    btn.textContent = c.t;
    btn.onclick = () => { SFX.click(); library.ch = i; libraryRender(); };
    chapters.appendChild(btn);
  });
  body.appendChild(chapters);

  const content = document.createElement("pre");
  content.className = "lib-content";
  content.textContent = b.chapters[library.ch].body;
  body.appendChild(content);

  const nav = document.createElement("div");
  nav.className = "lib-nav";
  const prev = document.createElement("button");
  prev.className = "lib-btn";
  prev.textContent = "◂ PREV";
  prev.disabled = library.ch === 0;
  prev.onclick = () => { SFX.click(); library.ch--; libraryRender(); };
  const next = document.createElement("button");
  next.className = "lib-btn";
  next.textContent = "NEXT ▸";
  next.disabled = library.ch === b.chapters.length - 1;
  next.onclick = () => { SFX.click(); library.ch++; libraryRender(); };
  nav.append(prev, next);
  body.appendChild(nav);
}

function openLibrary(fileOrTitle) {
  if (fileOrTitle) {
    const b = findBook(fileOrTitle);
    if (b) { library.book = b; library.ch = 0; }
  }
  os.openApp("library");
}
