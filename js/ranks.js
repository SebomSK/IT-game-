/* ===== TicketQuest — kariérny rebrík + výplaty (grind edition) ===== */
/* Vyššie pozície vyžadujú stovky vyriešených ticketov — reálny grind. */

const RANKS = [
  {
    name: "IT Intern",
    minXp: 0,
    salary: 0,
    salaryNote: "stáž (káva + skúsenosti)",
    reqs: null,
  },
  {
    name: "Helpdesk Tier 1",
    minXp: 240,
    salary: 2200,
    reqs: { tickets: [1042, 1043, 1045, 1044] },
  },
  {
    name: "Desktop Support Tier 2",
    minXp: 680,
    salary: 3100,
    reqs: {
      tickets: [1101, 1102, 1103, 1104, 1105, 1106, 1107],
      quiz: "aplus",
    },
  },
  {
    name: "Junior Sysadmin",
    minXp: 3200,
    salary: 3800,
    reqs: { minResolved: 60 },
  },
  {
    name: "IT Specialist Tier 3",
    minXp: 9500,
    salary: 4500,
    reqs: { minResolved: 150 },
  },
  {
    name: "Systems Administrator",
    minXp: 20000,
    salary: 5400,
    reqs: { minResolved: 300 },
  },
  {
    name: "IT Operations Lead",
    minXp: 38000,
    salary: 6800,
    reqs: { minResolved: 500 },
  },
];

/* vetvové tituly — po výbere špecializácie (rank 3) sa názvy pozícií menia */
const BRANCH_RANKS = {
  admin: { 4: "IT Specialist Tier 3", 5: "Systems Administrator", 6: "IT Operations Lead", 7: "Director of IT" },
  soc:   { 4: "SOC Analyst Tier 2",   5: "Security Engineer",     6: "SOC Lead",           7: "Head of Security" },
};

/* celý titul hráča (vetvovo citlivý) */
function rankTitle() {
  const br = state.branch && BRANCH_RANKS[state.branch] && BRANCH_RANKS[state.branch][rankIndex()];
  return br || RANKS[rankIndex()].name;
}

/* celkový počet ticketov (vyriešené + eskalované) */
function countResolved() {
  return (state.resolved?.length || 0) + (state.escalated?.length || 0);
}

/* najvyšší rank, na ktorý si hráč reálne zaslúžil */
function desiredRank() {
  let idx = 0;
  for (let i = 1; i < RANKS.length; i++) {
    const r = RANKS[i];
    let ok = state.xp >= r.minXp;
    if (ok && r.reqs) {
      if (r.reqs.tickets) {
        ok = r.reqs.tickets.every(
          (id) => state.resolved.includes(id) || state.escalated.includes(id)
        );
      }
      if (ok && r.reqs.minResolved != null) {
        ok = countResolved() >= r.reqs.minResolved;
      }
      if (ok && r.reqs.quiz) {
        ok = !!(state.quiz && state.quiz[r.reqs.quiz]);
      }
    }
    if (ok) idx = i;
    else break;
  }
  return idx;
}

function rankIndex() {
  return state.rank || 0;
}
