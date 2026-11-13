/* ===== TicketQuest — the PIXL Corp Saga story ===== */

const STORY_CHARS = {
  zora: { label: "Zora" },
  boss: { label: "Mr. Pixel" },
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
