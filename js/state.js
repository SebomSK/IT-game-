/* ===== TicketQuest — stav hry v2 + ukladanie ===== */

const SAVE_KEY = "ticketquest-save-v2";
const MAX_SAVE_BYTES = 2 * 1024 * 1024;
const MAX_SAVE_ARRAY_LENGTH = 10000;
const MAX_SAVED_TICKETS = 100;
const MAX_SAVE_STRING_LENGTH = 8192;

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
  mail: { flagged: [], archived: [], replied: [], replies: {}, read: [], extra: [], phish: {} },  // kľúče "flavor:2" / "ticket:1042"
  evidence: [],               // nájdené dôkazy k nočnej záhade (Files D:\\)
  rep: 70,                    // dôvera oddelení (0-100): SLA a spokojnosť používateľov
  siem: { done: 0, correct: 0, streak: 0, best: 0 },   // SOC konzola (triáž alertov)
  learn: { seen: [], quizzed: [], mistakes: {}, skills: {} },   // vzdelávací pokrok: videné lekcie, chyby, zručnosti
  promotedTo: 0,
  tutorialDone: false,
  deskSeen: false,            // desktop už bol raz otvorený (tutoriál sa neopakuje)
  story: { siemIntro: false, mystery1: false, introDone: false, nightEvidence: false, dorisStarted: false, dorisArc: false, dorisTicket: null },
  stats: { startedAt: 0, slaMiss: 0, notesGood: 0, totalMin: 0, reviews: 0 },
  chapterQuiz: {},            // kľúč kapitoly ("c<index>") -> najlepšie skóre v kvíze po kapitole
  replays: 0,                 // koľko "replay" ticketov hráč spustil
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
      Sales:      [],
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
    gpo: {}, dns: {}, backups: {}, patches: {}, mfa: {},   // security hygiene tickety
    attacksBlocked: false,
  },
};

/* Fresh copy of default state — for NEW GAME without reload */
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
    if (!raw || raw.length > MAX_SAVE_BYTES) return false;
    const data = JSON.parse(raw);
    if (!isPlainObject(data) || !isPlainObject(data.player) || !Number.isFinite(data.xp)) return false;
    const candidate = JSON.parse(JSON.stringify(state));
    deepMerge(candidate, data);
    // bezpečnostná sanitizácia vstupov zo save-u (ochrana pred HTML injection)
    candidate.player.name = sanitizeName(candidate.player.name);
    candidate.player.login = sanitizeLogin(candidate.player.login);
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, candidate);
    return true;
  } catch (e) { return false; }
}

/* Fisher–Yates — odpovede sa pri každom zobrazení premiešajú, takže sa kvíz nedá naučiť na pamäť */
function shuffleIdx(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function sanitizeSaveValue(value, depth = 0) {
  if (depth > 24) return undefined;
  if (typeof value === "string") return value.slice(0, MAX_SAVE_STRING_LENGTH);
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_SAVE_ARRAY_LENGTH)
      .map((item) => sanitizeSaveValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) return undefined;

  const result = {};
  for (const key of Object.keys(value)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) continue;
    const item = sanitizeSaveValue(value[key], depth + 1);
    if (item !== undefined) result[key] = item;
  }
  return result;
}

function sanitizeSaveArray(key, current, incoming) {
  const isTicketList = key === "dorisTickets" || key === "grindTickets";
  const maxLength = isTicketList ? MAX_SAVED_TICKETS : MAX_SAVE_ARRAY_LENGTH;
  const values = incoming.slice(0, maxLength)
    .map((item) => sanitizeSaveValue(item))
    .filter((item) => item !== undefined);

  if (isTicketList) return values.filter((ticket) => {
    if (!isPlainObject(ticket) || !Number.isSafeInteger(ticket.id) ||
        typeof ticket.from !== "string" || typeof ticket.subject !== "string" ||
        typeof ticket.body !== "string" || !Array.isArray(ticket.sop) ||
        !ticket.sop.every((line) => typeof line === "string")) return false;
    if (key === "dorisTickets") return ticket.doris === true;
    return typeof ticket.kind === "string" && isPlainObject(ticket.params);
  });

  const sample = current.find((item) => item !== null && item !== undefined);
  if (sample !== undefined) {
    if (typeof sample === "number") return values.filter(Number.isFinite);
    if (typeof sample === "string") return values.filter((item) => typeof item === "string");
    if (isPlainObject(sample)) return values.filter(isPlainObject);
    return [];
  }
  if (["resolved", "escalated", "taken", "arrived"].includes(key)) {
    return values.filter(Number.isSafeInteger);
  }
  if (["achievements", "departed", "blocked", "flagged", "archived", "replied", "read", "evidence", "seen", "quizzed"].includes(key)) {
    return values.filter((item) => typeof item === "string");
  }
  /* členovia AD skupín (aj prázdna skupina po načítaní musí zostať poľom reťazcov) */
  if (["Marketing", "Accounting", "Helpdesk", "Sales"].includes(key)) {
    return values.filter((item) => typeof item === "string" && /^[a-z0-9._-]{1,32}$/.test(item));
  }
  return [];
}

function sanitizeDynamicMapEntry(mapName, key, value) {
  if (["__proto__", "constructor", "prototype"].includes(key)) return undefined;
  if (["timestamp", "boolean", "note", "phoneState"].includes(mapName) && !/^\d{1,10}$/.test(key)) return undefined;
  if (mapName === "timestamp" && Number.isFinite(value)) return Math.max(0, Math.min(value, 8640000000000000));
  if (mapName === "boolean" && typeof value === "boolean") return value;
  if (mapName === "note" && typeof value === "string") return value.slice(0, MAX_SAVE_STRING_LENGTH);
  if (mapName === "reply" && /^[a-z]{3,10}:\d{1,10}$/.test(key) && typeof value === "string") return value.slice(0, 600);
  if (mapName === "chapterquiz" && /^c\d{1,3}$/.test(key) && Number.isFinite(value)) return Math.max(0, Math.min(Math.floor(value), 10));
  if (mapName === "counter" && /^[a-z0-9_-]{1,40}$/.test(key) && Number.isFinite(value)) return Math.max(0, Math.min(value, 100000));
  if (mapName === "phoneState" && isPlainObject(value) &&
      Number.isSafeInteger(value.step) && Number.isSafeInteger(value.mistakes)) {
    return {
      step: Math.max(0, Math.min(value.step, 1000)),
      mistakes: Math.max(0, Math.min(value.mistakes, 10000)),
    };
  }
  if (!isPlainObject(value)) return undefined;
  if (mapName === "users" && /^[a-z0-9._-]{1,32}$/.test(key)) {
    return {
      active: value.active === true,
      changed: value.changed === true,
      desc: typeof value.desc === "string" ? value.desc.slice(0, MAX_SAVE_STRING_LENGTH) : key,
    };
  }
  if (mapName === "wds" && /^[A-Z0-9-]{1,32}$/.test(key)) {
    return {
      deployed: value.deployed === true,
      joined: value.joined === true,
      rebooted: value.rebooted === true,
    };
  }
  if (mapName === "mailbox" && /^[a-z0-9._-]{1,32}$/.test(key) &&
      Number.isFinite(value.used) && Number.isFinite(value.quota)) {
    return {
      used: Math.max(0, Math.min(value.used, 1000000)),
      quota: Math.max(0, Math.min(value.quota, 1000000)),
    };
  }
  return undefined;
}

function deepMerge(target, src) {
  function merge(targetObject, sourceObject, dynamicMap = null) {
    if (!isPlainObject(targetObject) || !isPlainObject(sourceObject)) return;
    const forbidden = new Set(["__proto__", "constructor", "prototype"]);
    for (const k of Object.keys(sourceObject)) {
      if (forbidden.has(k)) continue;
      const incoming = sourceObject[k];
      const current = targetObject[k];

      if (Array.isArray(current)) {
        if (Array.isArray(incoming)) targetObject[k] = sanitizeSaveArray(k, current, incoming);
      } else if (isPlainObject(current)) {
        if (isPlainObject(incoming)) {
          const nextDynamicMap = {
            users: "users", wds: "wds", mailbox: "mailbox",
            takenAt: "timestamp", deadlines: "timestamp",
            overdue: "boolean", phoneDone: "boolean",
            notes: "note", phoneState: "phoneState", chapterQuiz: "chapterquiz", replies: "reply", mistakes: "counter", skills: "counter",
          }[k] || null;
          merge(current, incoming, nextDynamicMap);
        }
      } else if (current === null) {
        if (incoming === null || ["string", "number", "boolean"].includes(typeof incoming)) {
          const safe = sanitizeSaveValue(incoming);
          if (safe !== undefined) targetObject[k] = safe;
        }
      } else if (typeof incoming === typeof current) {
        const safe = sanitizeSaveValue(incoming);
        if (safe !== undefined) targetObject[k] = safe;
      } else if (current === undefined && dynamicMap) {
        const safe = sanitizeDynamicMapEntry(dynamicMap, k, incoming);
        if (safe !== undefined) targetObject[k] = safe;
      }
    }
  }

  merge(target, src);
}

function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
}
