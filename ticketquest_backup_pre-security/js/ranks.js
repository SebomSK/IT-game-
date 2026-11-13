/* ===== TicketQuest — kariérny rebrík + výplaty ===== */

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
];

/* najvyšší rank, na ktorý si hráč reálne zaslúžil */
function desiredRank() {
  let idx = 0;
  for (let i = 1; i < RANKS.length; i++) {
    const r = RANKS[i];
    const ticketsOk = r.reqs.tickets.every(
      (id) => state.resolved.includes(id) || state.escalated.includes(id)
    );
    const quizOk = !r.reqs.quiz || (state.quiz && state.quiz[r.reqs.quiz]);
    if (state.xp >= r.minXp && ticketsOk && quizOk) idx = i;
    else break;
  }
  return idx;
}

function rankIndex() {
  return state.rank || 0;
}
