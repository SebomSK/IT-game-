/* ===== TicketQuest — reputácia, následky a drobné XP odmeny ===== */
/* Zanedbané tickety majú dôsledky: nahnevané e-maily, pokles dôvery oddelení,
   a pri nízkej dôvere rozhovor so šéfom. Dobrá práca dôveru zvyšuje. */

function repAdd(n) {
  state.rep = Math.max(0, Math.min(100, (Number.isFinite(state.rep) ? state.rep : 70) + n));
  saveGame();
}

function repLabel() {
  const r = Number.isFinite(state.rep) ? state.rep : 70;
  if (r >= 85) return "Trusted";
  if (r >= 60) return "Solid";
  if (r >= 35) return "Shaky";
  return "At risk";
}

/* malé XP (SOC konzola, phishing tréning) — povýšenie rieši bežný ticket tick */
function awardXp(n, label) {
  state.xp += n;
  saveGame();
  if (typeof renderTopbar === "function") renderTopbar();
  if (label && typeof toast === "function") toast(`⭐ +${n} XP — ${label}`, "toast-ticket");
}

/* herný čas smeny (rovnaký princíp ako hodiny na paneli) */
function shiftTimeLabel() {
  if (!state.stats || !state.stats.startedAt) return "9:00 AM";
  const mins = Math.floor((Date.now() - state.stats.startedAt) / 60000);
  const h = 9 + Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = ((h - 1) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 && h < 24 ? "PM" : "AM"}`;
}

function pushMail(m) {
  if (!state.mail) state.mail = { flagged: [], archived: [], replied: [], replies: {}, read: [], extra: [], phish: {} };
  if (!Array.isArray(state.mail.extra)) state.mail.extra = [];
  const entry = {
    id: "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    from: String(m.from || "Unknown"),
    subj: String(m.subj || "(no subject)"),
    body: String(m.body || ""),
    time: shiftTimeLabel(),
  };
  state.mail.extra.unshift(entry);
  if (state.mail.extra.length > 40) state.mail.extra.length = 40;
  saveGame();
  if (typeof apps !== "undefined") apps.updateBadges();
  if (typeof notify === "function") notify({ icon: "✉️", title: entry.from.split("<")[0].trim(), body: entry.subj });
  return entry;
}

const COMPLAINTS = [
  (n, id) => `Hi, ticket #${id} is still open and I've been waiting a long time. I can't work like this. Can someone please look at it?\n— ${n}`,
  (n, id) => `Following up on #${id}. I was told "soon". It's no longer soon.\n— ${n}`,
  (n, id) => `I have escalated #${id} to my manager. Please advise. (Yes, I'm cc'ing Mr. Pixel.)\n— ${n}`,
];

/* volá sa raz pri každom prekročení SLA */
function onSlaMiss(t) {
  repAdd(-4);
  if (!t) return;
  const sender = String(t.from || "A colleague");
  const name = sender.split(",")[0].split("(")[0].trim() || "A colleague";
  const slug = name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "") || "user";
  pushMail({
    from: `${name} <${slug}@pixlcorp.local>`,
    subj: `Re: #${t.id} — still waiting`,
    body: COMPLAINTS[Math.floor(Math.random() * COMPLAINTS.length)](name, t.id),
  });
  if (state.rep < 35 && !state.story.repTalk) {
    state.story.repTalk = true;
    pushMail({
      from: "Mr. Pixel <pixel@pixlcorp.local>",
      subj: "A conversation about the queue",
      body: "I have noticed several departments complaining about response times.\n\nI expect tickets to be closed within their SLA — or escalated honestly when you are stuck. Both are acceptable. Silence is not.\n\nMy door is open. — M. Pixel",
    });
  }
}

/* volá sa po vyriešení ticketu */
function onTicketReputation(t) {
  if (!t) return;
  repAdd(state.overdue && state.overdue[t.id] ? 1 : 3);
}
