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
  reviewDone: false,
  quiz: { aplus: false },
  chill: false,
  promotedTo: 0,
  tutorialDone: false,
  story: { mystery1: false, introDone: false, nightEvidence: false },
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

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    // hĺbkové zlúčenie — aby staré save-ky nez stratili nové polia
    deepMerge(state, data);
    return true;
  } catch (e) { return false; }
}

function deepMerge(target, src) {
  for (const k of Object.keys(src)) {
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
