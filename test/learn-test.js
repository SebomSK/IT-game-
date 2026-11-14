// Headless test vzdelávacej vrstvy: každý typ ticketu má lekciu, XP za odpoveď iba raz, save roundtrip.
const fs = require("fs");
const path = require("path");
const store = {};
global.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
global.termPrint = () => {};
const rd = (f) => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
const src = [rd("state.js"), rd("ranks.js"), rd("tickets.js"), rd("grind.js"), rd("learn.js")].join("\n")
  .replace("const state =", "global.state =").replace("const SAVE_KEY =", "global.SAVE_KEY =")
  .replace("const LESSONS =", "global.LESSONS =").replace("const learn =", "global.learn =")
  .replace("const GRIND_KINDS =", "global.GRIND_KINDS =").replace("const TICKETS =", "global.TICKETS =")
  .replace("const LEARN_STORY_MAP =", "global.LEARN_STORY_MAP =");
(0, eval)(src);

const res = [];
const expect = (n, c) => res.push({ n, ok: !!c });

for (const kind of Object.keys(GRIND_KINDS)) expect(`lekcia pre grind kind '${kind}'`, !!LESSONS[kind]);
for (const t of TICKETS) expect(`lekcia pre ticket #${t.id}`, !!learn.lessonFor(t));
for (const [k, l] of Object.entries(LESSONS)) {
  const ok = l.title && l.concept && l.why && l.sim && l.hint && l.skill &&
    Array.isArray(l.irl) && l.irl.length && Array.isArray(l.pitfalls) && l.pitfalls.length &&
    l.check && l.check.options.length === 3 && l.check.answer >= 0 && l.check.answer < 3 && l.check.explain;
  expect(`lekcia '${k}' je úplná`, ok);
}
// správne odpovede nesmú byť vždy na rovnakej pozícii (nedá sa uhádnuť vzorom)
expect("odpovede sú rozptýlené", new Set(Object.values(LESSONS).map((l) => l.check.answer)).size >= 2);

state.xp = 0;
const lockout = { id: 1042, kind: undefined };
expect("1. správna odpoveď = +5 XP", learn.answer("lockout", LESSONS.lockout.check.answer).correct && state.xp === 5);
learn.answer("lockout", LESSONS.lockout.check.answer);
expect("XP iba raz", state.xp === 5);
learn.answer("service", (LESSONS.service.check.answer + 1) % 3);
expect("zlá odpoveď → chyba sa počíta, XP sa nemení", state.learn.mistakes.service === 1 && state.xp === 5);
learn.markSeen(lockout);
expect("markSeen zapíše lekciu a zručnosť", state.learn.seen.includes("lockout") && state.learn.skills.identity >= 1);
expect("debrief má HTML a je escapovaný", /lrn-card/.test(learn.debriefHtml(lockout)) && !/<script/i.test(learn.debriefHtml(lockout)));
expect("explain net user", learn.explain("net user").length > 1);

const good = learn.gradeReply("Hi Doris, I've unlocked your account and reset the password. Please try again and let me know if it still fails.");
expect("dobrá odpoveď = 4/4 → 8 XP", good.score === 4 && good.xp === 8 && !good.leak);
const leak = learn.gradeReply("Hi, I reset it. Your password is Welcome2026! please log in.");
expect("heslo v maile = 0 XP + varovanie", leak.leak && leak.xp === 0);
expect("prázdna odpoveď = 0 XP", learn.gradeReply("ok").xp === 0);

saveGame();
const snapshot = JSON.stringify(state.learn);
state.learn = { seen: [], quizzed: [], mistakes: {}, skills: {} };
expect("loadGame vráti learn stav", loadGame() && JSON.stringify(state.learn) === snapshot);

let fail = 0;
for (const r of res) { if (!r.ok) fail++; console.log((r.ok ? "PASS " : "FAIL ") + r.n); }
console.log(fail ? `\n${fail} FAILED ❌` : "\nALL PASS ✅");
process.exit(fail ? 1 : 0);
