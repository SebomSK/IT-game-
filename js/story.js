/* ===== TicketQuest — the PIXL Corp Saga story ===== */

const STORY_CHARS = {
  zora: { label: "Zora" },
  boss: { label: "Mr. Pixel" },
  doris: { label: "Doris Pemberton" },
};

/* Intro — 3rd person, the boss asks for your name */
const SCENE_INTRO = {
  id: "intro",
  title: "PIXL CORP · FRIDAY, 7:58 AM",
  pov: "3rd",
  bg: "bossoffice",
  foreground: "executiveDesk",
  sprites: [
    { who: "player", pos: "left" },
    { who: "boss", pos: "right" },
  ],
  input: {
    immediate: false,
    afterLine: 1,
    prompt: "Type your name and press Enter…",
  },
  lines: [
    { who: "narr", text: "PIXL CORP | Friday, 7:58 AM. Your first morning as an IT intern." },
    { who: "boss", text: "You must be our new intern. Welcome to PIXL Corp. May I have your name?" },
    /* name input happens here (after line 1) */
    { who: "boss", text: "{PLAYER}, welcome aboard. Zora will introduce you to the team. I will be monitoring the service queue." },
    { who: "zora", text: "Welcome, {PLAYER}. I'm Zora, your IT mentor. I'll show you your workstation and get you oriented." },
    { who: "zora", text: "Start with the documented procedure. Verify reports against system logs before making changes." },
    { who: "zora", text: "There are four tickets waiting in the queue. Let's review them." },
  ],
};

/* Night POV scene — intro before the interactive night terminal (1st person) */
const SCENE_NIGHT = {
  id: "night",
  title: "NIGHT SHIFT · 9:43 PM",
  pov: "1st",
  bg: "deskpov",
  lines: [
    { who: "thought", text: "9:43 PM. The office is empty. I reopened the security logs before heading home." },
    { who: "thought", text: "Doris's account has been locked three times this week. That pattern needs investigation." },
    { who: "narr", text: "The terminal is ready. Type 'help' to review the available commands." },
  ],
};

/* Promotion to Tier 1 */
const SCENE_PROMO_T1 = {
  id: "promo-t1",
  title: "PROMOTION · HELPDESK TIER 1",
  pov: "3rd",
  bg: "office",
  sprites: [
    { who: "player", pos: "left" },
    { who: "zora", pos: "right" },
  ],
  lines: [
    { who: "zora", text: "{PLAYER}, you resolved four tickets in your first shift. That's a strong start." },
    { who: "zora", text: "Mr. Pixel kept his usual expression, but your service metrics caught his attention." },
    { who: "zora", text: "You're now Helpdesk Tier 1. Your queue will include onboarding, access permissions, VPN, and offboarding." },
    { who: "zora", text: "Complete the Tier 1 curriculum, and we'll schedule your certification exam." },
  ],
};

/* Promotion to Tier 2 (after the A+ quiz) */
const SCENE_PROMO_T2 = {
  id: "promo-t2",
  title: "PROMOTION · DESKTOP SUPPORT TIER 2",
  pov: "3rd",
  bg: "bossoffice",
  foreground: "executiveDesk",
  sprites: [
    { who: "player", pos: "left" },
    { who: "boss", pos: "right" },
  ],
  lines: [
    { who: "boss", text: "{PLAYER}, you passed the certification exam. Well done." },
    { who: "boss", text: "Effective today, you're Desktop Support Tier 2. You'll take on more complex issues and greater responsibility." },
    { who: "narr", text: "Mr. Pixel looks up from his monitor. From him, that is a generous celebration." },
    { who: "boss", text: "Review the security logs tomorrow evening. I want to discuss a pattern I've noticed." },
    { who: "thought", text: "He knows something about the repeated account lockouts. I'll review the logs tomorrow." },
  ],
};

/* =========== KARIÉRNE VETVY =========== */

/* Promo do špecializácie (rank 3) — hrá sa podľa vybranej vetvy */
const SCENE_PROMO_BRANCH = {
  admin: {
    id: "promo-admin",
  title: "NEW PATH · SYSTEMS ADMINISTRATION",
    pov: "3rd",
    bg: "office",
    sprites: [
      { who: "player", pos: "left" },
      { who: "zora", pos: "right" },
    ],
    lines: [
      { who: "zora", text: "Your strengths point toward systems administration, {PLAYER}. You'll work with Active Directory, PowerShell, and server infrastructure." },
      { who: "zora", text: "Your new queue will include audits, dormant accounts, and workstation deployments. Each change needs careful documentation." },
      { who: "zora", text: "Document changes as you make them. Clear notes are essential when an incident needs review." },
      { who: "narr", text: "Zora hands you a mechanical keyboard and a new set of responsibilities." },
    ],
  },
  soc: {
    id: "promo-soc",
  title: "NEW PATH · SECURITY OPERATIONS",
    pov: "3rd",
    bg: "serverroom",
    sprites: [
      { who: "player", pos: "left" },
      { who: "boss", pos: "right" },
    ],
    lines: [
      { who: "boss", text: "You blocked the brute-force attempt from 10.0.13.66 before the alert reached my desk. Good response." },
      { who: "boss", text: "You have the right instincts for security operations, {PLAYER}. You'll investigate suspicious activity and validate every finding with evidence." },
      { who: "boss", text: "The SOC will handle phishing reports, command-and-control alerts, and incident response. Your first shift starts tomorrow." },
      { who: "narr", text: "Mr. Pixel pauses at the door. 'Assume breach. Verify the evidence. Then verify it again.'" },
    ],
  },
};

/* =========== DORIS "HELP!" ARC =========== */

const SCENE_DORIS_HELP = {
  id: "doris-help",
  title: "INCIDENT · 2:47 PM",
  pov: "3rd",
  bg: "serverroom",
  sprites: [
    { who: "doris", pos: "left" },
    { who: "player", pos: "right" },
  ],
  lines: [
    { who: "narr", text: "2:47 PM. The office falls unusually quiet. A major service interruption has just begun.", shake: true },
    { who: "doris", text: "{PLAYER}, I need help. I was organizing my desktop when several files disappeared." },
    { who: "doris", text: "The shared drive is unavailable, Outlook won't open, and the printer has stopped. Is the server down?" },
    { who: "narr", text: "Monitoring shows that Netlogon and Print Spooler stopped within minutes of each other. The server-room door is unlocked.", shake: true },
    { who: "doris", text: "Could you restore the services? I'll stay at my desk and avoid touching anything." },
    { who: "thought", text: "She made the same promise last month. This time, I'll check the logs first." },
  ],
};

const SCENE_DORIS_FIXED = {
  id: "doris-fixed",
  title: "RECOVERY · 3:31 PM",
  pov: "3rd",
  bg: "office",
  sprites: [
    { who: "doris", pos: "left" },
    { who: "player", pos: "right" },
  ],
  lines: [
    { who: "narr", text: "3:31 PM. Netlogon and Print Spooler are restored. The printers are responding again." },
    { who: "doris", text: "Thank you. I brought coffee for the team. Two sugars, as requested." },
    { who: "doris", text: "And I haven't been near the server room. The door may have opened on its own." },
    { who: "thought", text: "The incident report will note configuration drift. I'll also recommend reviewing access controls." },
    { who: "narr", text: "Lesson learned: even a quiet afternoon needs a tested recovery plan." },
  ],
};

/* =========== KEEPER.PS1 ODHALENIE =========== */

const SCENE_KEEPER = {
  id: "keeper",
  title: "EVIDENCE · keeper.ps1",
  pov: "1st",
  bg: "nightcity",
  lines: [
    { who: "thought", text: "C:\\Windows\\Scripts\\keeper.ps1. Author: z. Created 14 months ago. Scheduled to run nightly at 11:00 PM." },
    { who: "thought", text: "It unlocks Doris's account overnight, then locks it again at 6:00 AM. The schedule matches every incident." },
    { who: "thought", text: "Zora has kept Doris's account in a controlled lockout cycle for over a year. I need to understand why." },
    { who: "narr", text: "A note on the monitor reads: 'Sometimes the system is the bug. Don't tell HR. — Z.'" },
    { who: "thought", text: "PIXL Corp is not what it appears to be. At least the brute-force source is blocked. One problem at a time.", shake: true },
  ],
};
