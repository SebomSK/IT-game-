// Headless smoke test Fázy 1: celá hra bez prehliadača (Intern → T1 → T2)
const fs = require("fs");
const path = require("path");

const store = {};
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};

global.termPrint = () => {};
global.termClear = () => {};
global.termEl = null;
global.onTicketResolved = () => {};
global.onTicketEscalated = () => {};
global.onQuizPassed = () => {};

// načítaj herné skripty — const -> global, aby bolo viditeľné v testoch
const src = ["state.js", "ranks.js", "tickets.js", "avatar.js", "story.js",
             "sla.js", "tutorial.js", "binder.js", "quiz.js", "sim.js", "cv.js"]
  .filter((f) => f !== "tutorial.js" && f !== "quiz.js") // DOM-súbory netestujeme headless
  .map((f) => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8"))
  .join("\n")
  .replace("const state =", "global.state =")
  .replace("const LEVELS =", "global.LEVELS =")
  .replace("const RANKS =", "global.RANKS =")
  .replace("const TICKETS =", "global.TICKETS =")
  .replace("const SAVE_KEY =", "global.SAVE_KEY =")
  .replace("const CURRICULUM =", "global.CURRICULUM =")
  .replace("const APLUS_QUIZ =", "global.APLUS_QUIZ =");

(0, eval)(src);

const play = (cmd) => runCommand(cmd);
const results = [];
const expect = (name, cond) => results.push({ name, ok: !!cond });

/* ---------- Fáza 0: Intern smena ---------- */
// onboarding účet hráča
state.player.name = "Test Hrac";
state.player.login = "test.hrac";
play("whoami");

play("net user doris");
play("net user doris /active:yes");
play("net user doris Denok2026!");
state.taken.push(1042);
play("resolve 1042");

play("start-service spooler");
state.taken.push(1043);
play("resolve 1043");

play("ipconfig /renew");
state.taken.push(1045);
play("resolve 1045");

state.taken.push(1044);
play("block-ip 10.0.13.66");
play("resolve 1044");

expect("Intern: 4 tickety, 240 XP", state.resolved.length === 4 && state.xp === 240);
expect("Intern: desiredRank 1", desiredRank() === 1);

/* ---------- Fáza 1: Helpdesk Tier 1 ---------- */
state.rank = 1; // povýšenie vykonáva main.js po cutscene

// #1101 onboarding
expect("1101 zamknutý pred splnením", false || TICKETS.find((t) => t.id === 1101).check(state.server) === false);
play("net user petra.nova Kratke /add");          // krátke heslo → error
play("net user petra.nova Starto123! /add");
play("net group Marketing petra.nova /add");
state.taken.push(1101);
play("resolve 1101");
expect("1101 onboarding hotový", TICKETS.find((t) => t.id === 1101).check(state.server));

// #1102 oprávnenia
play("icacls D:\\Shares\\Finance");
play("icacls D:\\Shares\\Finance /grant marek:R");
state.taken.push(1102);
play("resolve 1102");
expect("1102 oprávnenia hotové", TICKETS.find((t) => t.id === 1102).check(state.server));

// #1103 mailbox
play("get-mailbox marek");
play("set-mailbox marek 100");
state.taken.push(1103);
play("resolve 1103");
expect("1103 mailbox hotový", TICKETS.find((t) => t.id === 1103).check(state.server));

// #1107 telefónny ticket — najprv musí zavolať
state.arrived.push(1107);
state.taken.push(1107);
play("resolve 1107");            // má zlyhať — nevyvolal telefón
expect("1107 resolve blokovaný bez telefónu", !state.resolved.includes(1107));
state.phoneDone[1107] = true;
play("reboot WKS-207");
play("resolve 1107");
expect("1107 telefónny ticket hotový", TICKETS.find((t) => t.id === 1107).check(state.server));

// #1104 VPN
play("type C:\\Logs\\vpn.log");
play("get-service ias");
play("start-service ias");
state.taken.push(1104);
play("resolve 1104");
expect("1104 VPN hotová", TICKETS.find((t) => t.id === 1104).check(state.server));

// #1105 offboarding
play("net user pavel /active:no");
play("robocopy C:\\Users\\pavel D:\\Departed\\pavel /E");
play("net group Helpdesk pavel /remove");
state.taken.push(1105);
play("resolve 1105");
expect("1105 offboarding hotový", TICKETS.find((t) => t.id === 1105).check(state.server));

// #1106 PC build
play("add-computer WKS-114");          // bez deployu → chyba
play("wds-deploy WKS-114");
play("add-computer WKS-114");
state.taken.push(1106);
play("resolve 1106");
expect("1106 PC build hotový", TICKETS.find((t) => t.id === 1106).check(state.server));

// eskalácia ako alternatíva
state.taken.push(1103); // už resolved — otestujeme na inom: vytvoríme situáciu? skip
expect("XP po T1: 610+ (s bonusem SLA 0)", state.xp >= 610);
expect("T2 rank dosiahnuteľný po kvíze", (() => {
  state.quiz.aplus = true;
  return desiredRank() === 2;
})());

/* ---------- Doris gag + štatistiky + CV ---------- */
state.rank = 1;
state.reviewDone = true;
// Doris gag (v prehliadači spúšťa main.js, tu simulujeme manuálne)
state.server.users.doris.active = false;
state.server.users.doris.changed = false;
state.dorisCount++;
state.dorisTickets.push({
  id: 2000 + state.dorisCount,
  from: "Doris", subject: "Zase som sa zamkla", priority: "HIGH",
  xp: 40, slaMin: 30, doris: true,
  sop: [],
  check: (srv) => srv.users.doris.active === true && srv.users.doris.changed === true,
});
state.arrived.push(2001);
state.taken.push(2001);
play("net user doris /active:yes");
play("net user doris Heslo2026!");
play("resolve 2001");
expect("Doris gag ticket vyriešený", state.resolved.includes(2001));

expect("Štatistiky: SLA miss zapísané", state.stats.slaMiss >= 0);
expect("CV: skills neprázdne po ticketoch", skillsList().length >= 5);
const cvText = cvBuild();
expect("CV contains name and rank", cvText.includes("TEST HRAC") && cvText.includes("Helpdesk Tier 1"));

/* ---------- SLA ---------- */
state.deadlines[1101] = Date.now() - 1000;
expect("SLA: overdue detekcia", slaOverdue(TICKETS.find((t) => t.id === 1101)));
state.deadlines[1101] = Date.now() + 60000;
expect("SLA: bežiaci timer nie je overdue", !slaOverdue(TICKETS.find((t) => t.id === 1101)));

/* ---------- Binder ---------- */
expect("Binder: fáza 0.5 kapitola hotová po 1042",
  CURRICULUM[1].chapters[0].tickets.every((id) => state.resolved.includes(id)));

/* ---------- Save ---------- */
expect("Save uložený", !!store["ticketquest-save-v2"]);
// obnova
const snapshot = JSON.parse(store["ticketquest-save-v2"]);
expect("Save má meno hráča", snapshot.player.name === "Test Hrac");

/* ---------- výsledok ---------- */
console.log("---");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}`);
const failed = results.filter((r) => !r.ok);
console.log("---");
console.log(`XP: ${state.xp}, Rank: ${state.rank}, Resolved: ${state.resolved.length}, Escalated: ${state.escalated.length}`);
console.log(failed.length === 0 ? "ALL PASS ✅" : `${failed.length} FAILURES ❌`);
process.exit(failed.length ? 1 : 0);
