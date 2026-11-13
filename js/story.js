/* ===== TicketQuest — the PIXL Corp Saga story ===== */

const STORY_CHARS = {
  zora: { label: "Zora" },
  boss: { label: "Mr. Pixel" },
  doris: { label: "Doris Pemberton" },
};

/* Intro — 3rd person, the boss asks for your name */
const SCENE_INTRO = {
  id: "intro",
  pov: "3rd",
  bg: "reception",
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
    { who: "narr", text: "PIXL CORP — Friday, 7:58 AM. First day at a new job." },
    { who: "boss", text: "Ah, you must be the new intern. Sorry — what's your name?" },
    /* name input happens here (after line 1) */
    { who: "boss", text: "{PLAYER}? Hm. Good name. Zora will take it from here — I don't do small talk, I do tickets." },
    { who: "zora", text: "Welcome, {PLAYER}! I'm Zora, your mentor. Come, I'll show you your desk. The one by the window is yours." },
    { who: "zora", text: "Rule #1: the user is always right. Rule #2: see rule #1 — but still verify it in the logs. 😄" },
    { who: "zora", text: "Tickets are already waiting for you in the system. Let's go, {PLAYER}!" },
  ],
};

/* Night POV scene — intro before the interactive night terminal (1st person) */
const SCENE_NIGHT = {
  id: "night",
  pov: "1st",
  bg: "deskpov",
  lines: [
    { who: "thought", text: "9:43 PM. Everyone went home. I opened the logs one more time..." },
    { who: "thought", text: "Doris got locked out three times this week. Three times. Not normal, even for a forgetful person." },
    { who: "narr", text: "(The terminal is waiting. Look for yourself — type 'help'.)" },
  ],
};

/* Promotion to Tier 1 */
const SCENE_PROMO_T1 = {
  id: "promo-t1",
  pov: "3rd",
  bg: "office",
  sprites: [
    { who: "player", pos: "left" },
    { who: "zora", pos: "right" },
  ],
  lines: [
    { who: "zora", text: "{PLAYER}, four tickets in a single shift? You don't see that every day." },
    { who: "zora", text: "Mr. Pixel didn't smile, but his eyes looked pleased. For him, that's a celebration." },
    { who: "zora", text: "You're officially Helpdesk Tier 1 now. Harder cases are waiting — onboarding, permissions, VPN, offboarding." },
    { who: "zora", text: "And when you finish all of them... I have an exam for you. 😉" },
  ],
};

/* Promotion to Tier 2 (after the A+ quiz) */
const SCENE_PROMO_T2 = {
  id: "promo-t2",
  pov: "3rd",
  bg: "office",
  sprites: [
    { who: "player", pos: "left" },
    { who: "boss", pos: "right" },
  ],
  lines: [
    { who: "boss", text: "{PLAYER}. You passed the exam. Above my expectations." },
    { who: "boss", text: "You're Desktop Support Tier 2 now. More responsibility, better pay, more ha... more challenges." },
    { who: "narr", text: "Mr. Pixel looks away from his monitor for a second. That's almost an emotion." },
    { who: "boss", text: "And {PLAYER}... tomorrow night, when you're still in the building — look into the logs. Once more." },
    { who: "thought", text: "Does he know something? About the account lockouts? ... Tomorrow. I'll leave it for tomorrow." },
  ],
};

/* =========== KARIÉRNE VETVY =========== */

/* Promo do špecializácie (rank 3) — hrá sa podľa vybranej vetvy */
const SCENE_PROMO_BRANCH = {
  admin: {
    id: "promo-admin",
    pov: "3rd",
    bg: "office",
    sprites: [
      { who: "player", pos: "left" },
      { who: "zora", pos: "right" },
    ],
    lines: [
      { who: "zora", text: "{PLAYER}, infrastructure chose you. Active Directory, PowerShell, servers that never sleep — that's your territory now." },
      { who: "zora", text: "From today you get admin tickets: audits, stale accounts, full setups. The kind nobody else wants to touch." },
      { who: "zora", text: "One tip from an old admin: write the note BEFORE the ticket, not after the incident." },
      { who: "narr", text: "Zora hands you a mechanical keyboard. It's heavier than it looks. Like responsibility." },
    ],
  },
  soc: {
    id: "promo-soc",
    pov: "3rd",
    bg: "serverroom",
    sprites: [
      { who: "player", pos: "left" },
      { who: "boss", pos: "right" },
    ],
    lines: [
      { who: "boss", text: "The brute-forcer from 10.0.13.66? You stopped it before I even read the alert. Interesting." },
      { who: "boss", text: "You're Security Analyst material, {PLAYER}. Logs that lie, users that click, attackers that persist. That's your playground now." },
      { who: "boss", text: "Phishing reports, C2 beacons, incident response. The SOC desk is yours." },
      { who: "narr", text: "Mr. Pixel walks away, then stops: 'Rule #3: assume breach. Verify. Assume again.'" },
    ],
  },
};

/* =========== DORIS "HELP!" ARC =========== */

const SCENE_DORIS_HELP = {
  id: "doris-help",
  pov: "3rd",
  bg: "serverroom",
  sprites: [
    { who: "doris", pos: "left" },
    { who: "player", pos: "right" },
  ],
  lines: [
    { who: "narr", text: "2:47 PM. The building goes quiet in the wrong way — the way it does when something big just broke." },
    { who: "doris", text: "{PLAYER}! {PLAYER}!! I was just cleaning my desktop and things started DISAPPEARING!" },
    { who: "doris", text: "First the sharedrive, then Outlook, then the printer! Am I fired? Am I a ghost??" },
    { who: "narr", text: "Monitoring confirms: Netlogon and the Print Spooler just died. And the server room door is suspiciously unlocked." },
    { who: "doris", text: "You're the IT genius! Fix it and I promise — PROMISE — no more lockout tickets!" },
    { who: "thought", text: "She said that last time. And the time before that. Well. A promise is a ticket." },
  ],
};

const SCENE_DORIS_FIXED = {
  id: "doris-fixed",
  pov: "3rd",
  bg: "office",
  sprites: [
    { who: "doris", pos: "left" },
    { who: "player", pos: "right" },
  ],
  lines: [
    { who: "narr", text: "3:31 PM. Netlogon up, Spooler up, printers singing. Order restored." },
    { who: "doris", text: "My heroes! I brought you coffee. Two sugars. And I did NOT touch the server room again." },
    { who: "doris", text: "...the door just opened by itself, probably." },
    { who: "thought", text: "The incident report will say 'configuration drift'. Between us: it was Doris. It's always Doris." },
    { who: "narr", text: "Official lesson learned: even the quiet afternoons deserve a backup plan." },
  ],
};

/* =========== KEEPER.PS1 ODHALENIE =========== */

const SCENE_KEEPER = {
  id: "keeper",
  pov: "1st",
  bg: "nightcity",
  lines: [
    { who: "thought", text: "C:\\Windows\\Scripts\\keeper.ps1. Author: z. Created 14 months ago. Runs every night at 11 PM." },
    { who: "thought", text: "It unlocks Doris's account at night... and re-locks it at 6 AM. Every single day. Like a clockwork." },
    { who: "thought", text: "Zora has been KEEPING Doris in a controlled lockout loop for over a year. Why?" },
    { who: "narr", text: "(A sticky note on the monitor: 'Sometimes the system IS the bug. Don't tell HR. — Z')" },
    { who: "thought", text: "PIXL Corp is stranger than it looks. At least the brute-forcer is blocked. Small wins. ..." },
  ],
};
