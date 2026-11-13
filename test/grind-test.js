/* temporary grind engine test (run with: node test/grind-test.js) */
const fs = require("fs");
let src = "";
for (const f of ["js/state.js", "js/ranks.js", "js/tickets.js", "js/grind.js"]) {
  src += fs.readFileSync(f, "utf8") + "\n";
}
src += `
state.rank = 1;
state.grindTickets = [];
const kinds = {};
for (let i = 0; i < 400; i++) {
  const t = makeGrindTicket();
  kinds[t.kind] = (kinds[t.kind] || 0) + 1;
  const def = GRIND_KINDS[t.kind];
  const made = def.make(t.params);
  t.check = (srv) => made.check(t.params, srv);
  if (typeof t.check(state.server) !== "boolean") throw new Error("check fail " + t.kind);
}
console.log("400 generated OK. kinds:", JSON.stringify(kinds));

// full solve cycle: take a lockout ticket, run the "commands" manually
const t = makeGrindTicket("lockout");
const def = GRIND_KINDS[t.kind];
def.make(t.params).setup(t.params, state.server);
state.server.users[t.params.user] = { active: true, changed: true };
const made = def.make(t.params);
if (!made.check(t.params, state.server)) throw new Error("lockout solve check failed");
console.log("solve cycle OK for", t.kind, "->", t.subject);

// rank gates (7-rank ladder: rank1 = story tickets, rank3 = 60 resolved, ...)
console.log("desiredRank (xp=720, resolved=5):", desiredRank(), "(expect 0 — rank1 needs story tickets)");
state.xp = 40000;
console.log("desiredRank (xp=40000, resolved=5):", desiredRank(), "(expect 0 — still no story tickets)");
state.resolved = [1042, 1043, 1045, 1044, 1101, 1102, 1103, 1104, 1105, 1106, 1107]
  .concat(Array.from({length: 60}, (_, i) => 90000 + i));
state.quiz = { aplus: true };
console.log("desiredRank (xp=40000, resolved=71):", desiredRank(), "(expect 3 — Junior Sysadmin: story tickets + A+ + 60 grind)");
state.resolved = state.resolved.concat(Array.from({length: 440}, (_, i) => 91000 + i));
console.log("desiredRank (xp=40000, resolved=504):", desiredRank(), "(expect 6 — IT Operations Lead, 504≥500 tickets & 40000≥38000 XP)");
`;
eval(src);
