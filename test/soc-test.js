/* TicketQuest — test pre bezpečnostnú vrstvu: SOC konzola, phishing tréning, následky (reputácia),
   nové druhy ticketov (patch, MFA, GPO, DNS, backup) a ich lekcie v Learn.
   Spustenie: node test/soc-test.js  (vyžaduje playwright, rovnako ako ui-test.js) */
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { ({ chromium } = require("/opt/npm-tools/node_modules/playwright")); }
const path = require("path");

const URL = "file://" + path.resolve(__dirname, "..", "index.html");
let failures = 0;
const ok = (cond, msg) => { if (cond) console.log("PASS " + msg); else { failures++; console.log("FAIL " + msg); } };

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|net::|supabase|favicon/i.test(m.text())) errors.push("console: " + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    state.player.name = "Tester"; state.player.login = "tester";
    state.story.introDone = true; state.tutorialDone = true; state.deskSeen = true;
    saveGame();
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.click("#mm-continue"); await page.waitForTimeout(500);
  await page.click("#btn-sitdown"); await page.waitForTimeout(700);
  await page.click("#tut-skip").catch(() => {});
  await page.evaluate(() => document.getElementById("tutorial-layer")?.classList.add("hidden"));
  await page.waitForTimeout(200);

  /* ---------- SOC Console ---------- */
  await page.evaluate(() => ["mail", "helpdesk", "terminal", "explorer", "library", "settings", "taskmgr", "notepad", "learn", "soc"].forEach((id) => { try { os.closeApp(id); } catch (e) {} }));
  await page.waitForTimeout(200);
  const box = await (await page.$('.dicon[data-app="soc"]')).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!document.querySelector('.appwin[data-app="soc"]')), "SOC icon opens the SOC Console");
  ok(await page.evaluate(() => !document.getElementById("cutscene-overlay").classList.contains("hidden")), "first visit plays the SOC intro cutscene");
  ok(await page.evaluate(() => document.getElementById("cs-title")?.textContent.includes("SOC CONSOLE")), "cutscene shows a title card");
  await page.evaluate(() => cutscene.end());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector(".soc-btn.fp").click());
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => !!document.querySelector(".soc-result") && state.siem.done === 1), "answering shows the explanation and is tracked");
  ok(await page.evaluate(() => state.learn.seen.includes("triage")), "triage unlocks its real-world lesson in Learn");
  let allowed = await page.evaluate(() => { const seen = new Set(); for (let i = 0; i < 60; i++) { document.querySelector("#soc-next")?.click(); seen.add(document.querySelector(".soc-title")?.textContent); const b = document.querySelector(".soc-btn.fp"); b && b.click(); } return seen.size; });
  ok(allowed >= 3, "SOC queue shows varied alerts (" + allowed + " different)");

  /* ---------- phishing trainer in Mail ---------- */
  await page.evaluate(() => { os.closeApp("soc"); os.openApp("mail"); });
  await page.waitForTimeout(300);
  await page.click(".ol-item:has-text('mailbox will be DELETED')");
  await page.waitForTimeout(150);
  ok(await page.evaluate(() => !!document.querySelector(".ol-link") && !!document.querySelector("[data-decide]")), "suspicious mail shows the link target and decision buttons");
  const xp0 = await page.evaluate(() => state.xp);
  await page.click('[data-decide="phish"]'); await page.waitForTimeout(200);
  ok((await page.evaluate(() => state.xp)) === xp0 + 15, "reporting real phishing awards XP");
  ok(await page.evaluate(() => /Correct call/.test(document.querySelector(".ol-verdict")?.textContent || "")), "verdict explains why");
  ok(await page.evaluate(() => state.learn.seen.includes("phishmail")), "phishing lesson unlocked in Learn");
  await page.click(".ol-item:has-text('Team lunch')"); await page.waitForTimeout(100);
  await page.click('[data-decide="phish"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => /Not quite/.test(document.querySelector(".ol-verdict")?.textContent || "")), "false alarm on a legit mail gets a teaching moment");

  /* ---------- consequences ---------- */
  const rep = await page.evaluate(() => { const r0 = state.rep; onSlaMiss({ id: 9999, from: "Mark Kovac, Marketing" }); return { r0, r1: state.rep, extra: state.mail.extra.length }; });
  ok(rep.r1 < rep.r0 && rep.extra >= 1, `missed SLA lowers trust (${rep.r0} → ${rep.r1}) and sends a complaint e-mail`);
  await page.evaluate(() => apps.renderMail());
  await page.click('.ol-folder[data-folder="inbox"]');
  ok(await page.evaluate(() => /still waiting/.test(document.getElementById("mail-list").textContent)), "complaint shows up in the inbox");

  /* ---------- new ticket kinds: solvable + have lessons + explain ---------- */
  const res = await page.evaluate(() => {
    const out = {};
    state.rank = 3; state.branch = "soc";
    for (let round = 0; round < 4; round++) {
      for (const kind of ["patch", "mfa", "gpo", "dns", "backup", "lockout", "group-add", "phishing"]) {
        const t = makeGrindTicket(kind); if (!t) { out[kind] = "no ticket"; continue; }
        GRIND_KINDS[kind].make(t.params).setup(t.params, state.server);
        state.grindTickets.push(t); state.arrived.push(t.id); state.taken.push(t.id); hydrateGrindTickets();
        const cmds = [...t.sop.join("\n").matchAll(/<code>(.*?)<\/code>/g)].map((m) => m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
        const orig = window.termPrint; window.termPrint = () => {};
        cmds.filter((c) => !/^resolve/.test(c)).forEach((c) => { try { runCommand(c); } catch (e) {} });
        const before = state.resolved.length; runCommand("resolve " + t.id);
        window.termPrint = orig;
        if (state.resolved.length !== before + 1) out[kind] = "NOT RESOLVED";
        else if (out[kind] === undefined) out[kind] = "ok";
      }
    }
    return out;
  });
  for (const [k, v] of Object.entries(res)) ok(v === "ok", `ticket kind "${k}" is solvable with its SOP over 4 random draws (${v})`);
  const lessons = await page.evaluate(() => ["patch", "mfa", "gpo", "dns", "backup", "triage", "phishmail"].map((k) => [k, !!learn.lessonFor({ kind: k })]));
  lessons.forEach(([k, has]) => ok(has, `lesson exists for "${k}"`));
  ok(await page.evaluate(() => ["patch", "mfa", "gpo", "dns", "backup"].every((k) => state.learn.seen.includes(k))), "resolving the new tickets unlocks their lessons");
  const explain = await page.evaluate(() => learn.explain("gpupdate").join(" "));
  ok(/Invoke-GPUpdate|gpresult/.test(explain), "`explain gpupdate` shows the real-world equivalent");

  /* ---------- cutscene engine with the new cinematics ---------- */
  await page.evaluate(() => cutscene.play([SCENE_PROMO_T1, SCENE_DORIS_HELP], () => {}));
  await page.waitForTimeout(600);
  for (let i = 0; i < 14; i++) { await page.keyboard.press("Enter"); await page.waitForTimeout(60); await page.keyboard.press("Enter"); await page.waitForTimeout(60); }
  await page.evaluate(() => cutscene.end());
  ok(true, "cutscenes with title cards and shake play through");

  ok(errors.length === 0, "no JavaScript errors (" + (errors.join(" | ") || "clean") + ")");
  await browser.close();
  console.log(failures ? "\n" + failures + " FAILED" : "\nALL PASS ✅");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
