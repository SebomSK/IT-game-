// Headless test: kvíz po kapitole, replay, premiešavanie A+ kvízu, skupina Sales (save roundtrip).
const fs = require("fs");
const path = require("path");
const store = {};
global.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
global.termPrint = () => {};
const rd = (f) => fs.readFileSync(path.join(__dirname, "..", "js", f), "utf8");
const src = [rd("state.js"), rd("ranks.js"), rd("tickets.js"), rd("grind.js"), rd("binder.js"), rd("chapters.js")].join("\n")
  .replace("const state =", "global.state =").replace("const SAVE_KEY =", "global.SAVE_KEY =")
  .replace("const GRIND_KINDS =", "global.GRIND_KINDS =").replace("const GRIND_GROUPS =", "global.GRIND_GROUPS =").replace("const TICKETS =", "global.TICKETS =")
  .replace("const CURRICULUM =", "global.CURRICULUM =").replace("const CHAPTER_EXTRAS =", "global.CHAPTER_EXTRAS =")
  .replace("const FRESH_STATE =", "global.FRESH_STATE =")
  .replace("function chapterGrade", "global.chapterGrade = chapterGrade;\nfunction chapterGrade")
  .replace("function chapterReplay(", "global.chapterReplay = chapterReplay;\nfunction chapterReplay(")
  .replace("function chapterBuildQuestions", "global.chapterBuildQuestions = chapterBuildQuestions;\nfunction chapterBuildQuestions")
  .replace("function shuffleIdx", "global.shuffleIdx = shuffleIdx;\nfunction shuffleIdx")
  .replace("function saveGame", "global.saveGame = saveGame;\nfunction saveGame")
  .replace("function loadGame", "global.loadGame = loadGame;\nfunction loadGame")
  .replace("function newGameState", "global.newGameState = newGameState;\nfunction newGameState");
(0, eval)(src);

const res = [];
const expect = (n, c) => res.push({ n, ok: !!c });

// 1) každá kapitola s ticketom má kvíz s 3 platnými otázkami a replay druh existuje
const titles = CURRICULUM.flatMap((p) => p.chapters).filter((c) => c.tickets && c.tickets.length).map((c) => c.title);
for (const t of titles) {
  const e = CHAPTER_EXTRAS[t];
  expect(`kapitola '${t}' má kvíz`, e && e.quiz.length === 3 && e.quiz.every((q) => q.a.length === 3 && q.c >= 0 && q.c < 3));
  expect(`kapitola '${t}': replay druh existuje (alebo je null)`, e && (e.replay === null || !!GRIND_KINDS[e.replay]));
}
expect("kľúče kapitol sú unikátne", new Set(Object.values(CHAPTER_EXTRAS).map((e) => e.key)).size === Object.keys(CHAPTER_EXTRAS).length);

// 2) premiešanie drží správnu odpoveď a mení pozície
const e = CHAPTER_EXTRAS["Windows services (e.g. printing)"];
const pos = new Set();
let stable = true;
for (let i = 0; i < 60; i++) {
  const qs = chapterBuildQuestions(e);
  qs.forEach((q, k) => { if (q.a[q.correct] !== e.quiz[k].a[e.quiz[k].c]) stable = false; });
  pos.add(qs[0].correct);
}
expect("po premiešaní ukazuje correct stále na správnu odpoveď", stable);
expect("správna odpoveď mení pozíciu", pos.size >= 2);

// 3) XP iba raz
state.xp = 0;
let g = chapterGrade(e, 1);
expect("1/3 = nepreukázané, 0 XP", !g.passed && g.xp === 0 && state.xp === 0);
g = chapterGrade(e, 3);
expect("3/3 = +15 XP", g.passed && g.xp === 15 && state.xp === 15);
g = chapterGrade(e, 3);
expect("druhýkrát bez XP", g.xp === 0 && state.xp === 15);

// 4) replay: vyžaduje rank >= 1, vytvorí riešiteľný ticket s inými parametrami
state.rank = 0;
expect("replay na ranku 0 sa nespustí", chapterReplay(e) === null);
state.rank = 1;
const users = new Set();
let kindOk = true;
for (let i = 0; i < 40; i++) {
  const t = chapterReplay(e);
  users.add(JSON.stringify([t.params.svc, t.params.full]));
  if (t.kind !== "service") kindOk = false;
  state.resolved.push(t.id);            // uvoľni queue
}
expect("všetky replay tickety sú správneho druhu", kindOk);
expect("replay generuje rôzne chyby/používateľov", users.size > 4);
expect("počítadlo replayov", state.replays === 40);

// 5) save roundtrip: kvíz + Sales skupina (prázdna aj plná)
state.server.groups.Sales = ["elena.novak"];
state.server.groups.Marketing = ["marek", "tomas.kovac"];
saveGame();
newGameState();
expect("newGameState vyčistil kvíz", Object.keys(state.chapterQuiz).length === 0);
expect("load OK", loadGame() === true);
expect("chapterQuiz prežil save", state.chapterQuiz.c3 === 3);
expect("Sales skupina existuje a členovia prežili save", Array.isArray(state.server.groups.Sales) && state.server.groups.Sales[0] === "elena.novak");
expect("členovia Marketing prežili", state.server.groups.Marketing.length === 2);

// 6) každá skupina z grind generátora existuje na serveri (inak by ticket nešiel vyriešiť)
newGameState();
for (const g2 of GRIND_GROUPS) expect(`skupina '${g2}' existuje na serveri`, Array.isArray(state.server.groups[g2]));

// 7) shuffleIdx je permutácia
const p = shuffleIdx(5).slice().sort().join("");
expect("shuffleIdx je permutácia", p === "01234");

let fail = 0;
for (const r of res) { console.log((r.ok ? "PASS " : "FAIL ") + r.n); if (!r.ok) fail++; }
console.log(fail ? `\n${fail} FAILED ❌` : "\nALL PASS ✅");
process.exit(fail ? 1 : 0);
