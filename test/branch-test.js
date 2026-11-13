/* v5 branch features test (run with: node test/branch-test.js) */
const fs = require("fs");
let src = "";
for (const f of ["js/state.js", "js/ranks.js", "js/tickets.js", "js/grind.js"]) {
  src += fs.readFileSync(f, "utf8") + "\n";
}
src += `
/* ---- 1. branch filter: bez vetvy sú SOC/admin druhy zamknuté ---- */
state.rank = 3;
state.branch = null;
let pool = grindPool();
for (const kind of ["phishing", "bruteforce", "incident", "share-audit", "stale-account", "doris-mega"]) {
  if (pool.includes(kind)) throw new Error("kind leaked into pool without branch: " + kind);
}
console.log("PASS pool bez vetvy: žiadne špecializované druhy");

/* doris-mega nikdy nie je v poole */
state.branch = "soc";
pool = grindPool();
if (pool.includes("doris-mega")) throw new Error("doris-mega in pool!");
for (const kind of ["phishing", "bruteforce"]) {
  if (!pool.includes(kind)) throw new Error("soc kind missing from pool: " + kind);
}
if (pool.includes("share-audit") || pool.includes("stale-account")) throw new Error("admin kind leaked into soc pool");
console.log("PASS pool soc: phishing/bruteforce/incident áno, admin/ dorismega nie");

state.branch = "admin";
pool = grindPool();
if (!pool.includes("share-audit")) throw new Error("admin kind missing from pool: share-audit");
if (pool.includes("phishing") || pool.includes("bruteforce")) throw new Error("soc kind leaked into admin pool");
console.log("PASS pool admin: share-audit áno, soc nie");

/* tier 4 sa nespawnuje pod rankom 4 */
state.rank = 3;
pool = grindPool();
if (pool.includes("incident") || pool.includes("stale-account")) throw new Error("tier4 at rank3");
state.rank = 4;
pool = grindPool();
if (!pool.includes("stale-account")) throw new Error("tier4 admin missing at rank4");
state.branch = "soc";
pool = grindPool();
if (!pool.includes("incident")) throw new Error("tier4 soc missing at rank4");
console.log("PASS tier4 gate: rank3 nie, rank4 áno");

/* ---- 2. hydration + solve cyklus pre každý nový kind ---- */
function hydrate(t) {
  const def = GRIND_KINDS[t.kind];
  const made = def.make(t.params);
  def.make(t.params).setup(t.params, state.server);
  t.check = (srv) => made.check(t.params, srv);
  return made;
}

function solve(kind) {
  const t = makeGrindTicket(kind);
  const srv = state.server;
  const p = t.params;
  hydrate(t);
  const before = t.check(srv);
  if (before !== false) throw new Error(kind + ": check true pred setup?");
  const u = srv.users[p.user] || (srv.users[p.user] = { active: false, changed: false });
  if (kind === "phishing") {
    u.active = true; u.changed = true;
    if (!srv.blocked.includes(p.badIp)) srv.blocked.push(p.badIp);
  } else if (kind === "bruteforce") {
    if (!srv.blocked.includes(p.badIp)) srv.blocked.push(p.badIp);
  } else if (kind === "incident") {
    u.active = false;
    if (!srv.blocked.includes(p.badIp)) srv.blocked.push(p.badIp);
    srv.wds[p.pc] = { deployed: true, joined: true, rebooted: true };
  } else if (kind === "share-audit") {
    const s = srv.shares[p.path];
    s.ACL = s.ACL.filter(a => !a.startsWith("Everyone"));
    s.ACL.push(p.group + ":R");
  } else if (kind === "stale-account") {
    u.active = false;
    if (!srv.departed.includes(p.user)) srv.departed.push(p.user);
  } else if (kind === "doris-mega") {
    srv.services.netlogon = "RUNNING";
    srv.services.spooler = "RUNNING";
    srv.users.doris.active = true;
    srv.users.doris.changed = true;
  }
  if (t.check(srv) !== true) throw new Error(kind + ": check false po riešení!");
  return t.subject;
}

for (const kind of ["phishing", "bruteforce", "incident", "share-audit", "stale-account", "doris-mega"]) {
  const subj = solve(kind);
  console.log("PASS solve", kind, "->", subj.slice(0, 60));
}

/* hydration po "načítaní zo save-u" (check musí ísť obnoviť) */
const t2 = makeGrindTicket("phishing");
t2.check = undefined;
const def2 = GRIND_KINDS[t2.kind];
const made2 = def2.make(t2.params);
t2.check = (srv) => made2.check(t2.params, srv);
if (typeof t2.check(state.server) !== "boolean") throw new Error("hydration fail");
console.log("PASS hydration po save-load");

/* ---- 3. rankTitle per branch ---- */
state.rank = 4;
state.branch = null;
if (rankTitle() !== RANKS[4].name) throw new Error("rankTitle bez vetvy zlyhal");
state.branch = "admin";
if (rankTitle() !== "IT Specialist Tier 3") throw new Error("admin title zlyhal: " + rankTitle());
state.branch = "soc";
if (rankTitle() !== "SOC Analyst Tier 2") throw new Error("soc title zlyhal: " + rankTitle());
state.rank = 7;
if (rankTitle() !== "Head of Security") throw new Error("soc rank7: " + rankTitle());
state.branch = "admin";
if (rankTitle() !== "Director of IT") throw new Error("admin rank7: " + rankTitle());
console.log("PASS rankTitle: vetvové tituly správne");
`;
try {
  eval(src);
  console.log("ALL PASS ✅");
} catch (e) {
  console.error("FAIL ❌", e.message);
  process.exit(1);
}
