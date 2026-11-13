/* ===== TicketQuest — stav hry v2 + ukladanie ===== */

const SAVE_KEY = "ticketquest-save-v2";

const state = {
  player: { name: "", login: "", salary: 0 },
  xp: 0,
  rank: 0,
  resolved: [],
  escalated: [],
  taken: [],
  takenAt: {},
  notes: {},
  overdue: {},
  deadlines: {},
  arrived: [],
  phoneDone: {},
  phoneState: {},
  dorisCount: 0,
  dorisTickets: [],      // dynamické Doris tickety (bežiaci gag)
  grindTickets: [],      // generované grind tickety (5000+)
  reviewDone: false,
  quiz: { aplus: false },
  chill: false,
  branch: null,               // "admin" | "soc" — špecializácia od ranku 3
  achievements: [],           // ids dosiahnutých achievementov
  keeper: { clues: 0, done: false },  // keeper.ps1 side-quest
  promotedTo: 0,
  tutorialDone: false,
  story: { mystery1: false, introDone: false, nightEvidence: false, dorisStarted: false, dorisArc: false, dorisTicket: null },
  stats: { startedAt: 0, slaMiss: 0, notesGood: 0, totalMin: 0, reviews: 0 },
  server: {
    users: {
      doris:       { active: false, changed: false, desc: "Doris Pemberton (Office Admin)" },
      marek:       { active: true,  changed: false, desc: "Mark Kovac (Marketing)" },
      jana:        { active: true,  changed: false, desc: "Jane White (Accounting)" },
      admin:       { active: true,  changed: false, desc: "Administrator" },
      pavel:       { active: true,  changed: false, desc: "Paul Stern (Helpdesk — leaving)" },
    },
    groups: {
      Marketing:  ["marek"],
      Accounting: ["jana"],
      Helpdesk:   ["pavel"],
    },
    services: {
      spooler:  "STOPPED",
      wuauserv: "RUNNING",
      dnscache: "RUNNING",
      netlogon: "RUNNING",
      ias:      "STOPPED",
    },
    network: {
      ip: "169.254.31.44",
      gateway: "10.0.0.1",
      dns: "10.0.0.1",
      renewed: false,
    },
    shares: {
      "D:\\Shares\\Finance": { ACL: ["Accounting:R"] },
      "D:\\Shares\\Public":  { ACL: ["Everyone:R"] },
    },
    mailbox: {
      marek: { used: 45, quota: 45 },
    },
    wds: {
      "WKS-114": { deployed: false, joined: false },
      "WKS-207": { rebooted: false },
    },
    departed: [],
    blocked: [],
    attacksBlocked: false,
  },
};

/* čerstvá kópia predvoleného stavu — pre NEW GAME bez reloadu */
const FRESH_STATE = JSON.parse(JSON.stringify(state));

function newGameState() {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, JSON.parse(JSON.stringify(FRESH_STATE)));
}

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    // hĺbkové zlúčenie — aby staré save-ky nestratili nové polia
    deepMerge(state, data);
    // bezpečnostná sanitizácia vstupov zo save-u (ochrana pred HTML injection)
    state.player.name = sanitizeName(state.player.name);
    state.player.login = sanitizeLogin(state.player.login);
    return true;
  } catch (e) { return false; }
}

/* escapuje HTML — všetko používateľské, čo ide do innerHTML, musí ísť cez escHtml */
function escHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* meno hráča: max 24 znakov, bez HTML-špeciálnych znakov */
function sanitizeName(v) {
  if (typeof v !== "string") return "";
  return v.replace(/[<>&"'`\\]/g, "").trim().slice(0, 24);
}

/* login: len bezpečné znaky */
function sanitizeLogin(v) {
  if (typeof v !== "string") return "";
  return v.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32);
}

function deepMerge(target, src) {
  const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
  for (const k of Object.keys(src)) {
    if (FORBIDDEN.has(k)) continue; // ochrana pred prototype pollution zo save-u
    if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k]) && target[k]) {
      deepMerge(target[k], src[k]);
    } else {
      target[k] = src[k];
    }
  }
}

function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}
