// UI test v reálnom prehliadači (Playwright): otvorí každú appku z plochy aj zo Start menu,
// overí vzdelávací debrief a že na stránke nevznikla žiadna JS chyba.
// Spustenie: npm run test:ui   (vyžaduje `npm i` kvôli playwright)
const { chromium } = require("playwright");
const { createServer } = require("../dev-server");

const SAVE = {
  player: { name: "Test", login: "test", salary: 0 }, xp: 300, rank: 1, deskSeen: true,
  tutorialDone: true, resolved: [1042, 1043, 1044, 1045], reviewDone: false,
  arrived: [1042, 1043, 1044, 1045, 1101, 1102],
  stats: { startedAt: Date.now() - 600000, slaMiss: 0, notesGood: 0, totalMin: 0, reviews: 0 },
};

(async () => {
  const server = createServer().listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/supabase|favicon|ERR_|Failed to load resource/i.test(m.text())) errors.push("console: " + m.text()); });
  await page.addInitScript((save) => {
    if (!localStorage.getItem("ticketquest-save-v2")) localStorage.setItem("ticketquest-save-v2", JSON.stringify(save));
  }, SAVE);

  const results = [];
  const check = (name, ok) => { results.push([name, !!ok]); };
  const visible = (sel) => page.locator(sel).first().isVisible().catch(() => false);

  await page.goto(url);
  await page.click("#mm-continue");
  await page.click("#btn-sitdown");
  check("desktop sa zobrazil", await visible("#desktop-view"));

  // 1) každá ikona na ploche otvorí okno
  const apps = await page.$$eval("#desktop-icons .dicon", (els) => els.map((e) => e.dataset.app));
  const closeAll = () => page.evaluate(() => document.querySelectorAll(".appwin").forEach((w) => os.closeApp(w.dataset.app)));
  for (const id of apps) {
    await closeAll();
    await page.click(`#desktop-icons .dicon[data-app="${id}"]`);
    await page.waitForTimeout(120);
    const overlayApps = ["training"];
    const ok = overlayApps.includes(id) ? await visible("#binder-overlay:not(.hidden)") : await visible(`.appwin[data-app="${id}"]`);
    check(`ikona '${id}' otvorí appku`, ok);
    if (overlayApps.includes(id)) await page.click("#binder-close").catch(() => {});
    await page.evaluate(() => { try { cutscene.end(); } catch (e) {} });   // napr. SOC konzola pri prvej návšteve pustí úvodnú cutscénu
  }

  // 2) každá appka zo Start menu
  await page.click(".tb-start");
  const smApps = await page.$$eval("#start-menu .sm-app", (els) => els.map((e) => e.dataset.app));
  check("Start menu obsahuje appky", smApps.length >= 8);
  for (const id of smApps) {
    await closeAll();
    if (!(await visible("#start-menu"))) await page.click(".tb-start");
    await page.click(`#start-menu .sm-app[data-app="${id}"]`);
    await page.waitForTimeout(120);
    const ok = id === "training" ? await visible("#binder-overlay:not(.hidden)") : await visible(`.appwin[data-app="${id}"]`);
    check(`Start menu: '${id}'`, ok);
    if (id === "training") await page.click("#binder-close").catch(() => {});
  }

  // 3) vzdelávací debrief po vyriešení ticketu
  await page.evaluate(() => {
    state.taken.push(1101);
    runCommand("net user petra.nova Starto123! /add");
    runCommand("net group Marketing petra.nova /add");
    runCommand("resolve 1101");
  });
  await page.waitForSelector("#notes-overlay:not(.hidden) .lrn-card", { timeout: 3000 }).catch(() => {});
  check("po resolve sa zobrazí debrief", await visible("#notes-learn .lrn-card"));
  const xpBefore = await page.evaluate(() => state.xp);
  const correct = await page.evaluate(() => LESSONS.onboard.check.answer);
  await page.click(`#notes-learn .lrn-opt[data-i="${correct}"]`);
  await page.waitForTimeout(150);
  check("správna odpoveď dá +5 XP", (await page.evaluate(() => state.xp)) === xpBefore + 5);
  check("lekcia je odomknutá v save", await page.evaluate(() => state.learn.seen.includes("onboard")));
  await page.click("#notes-skip");

  // 4) Learn app ukazuje odomknutú lekciu
  await page.evaluate(() => os.openApp("learn"));
  await page.waitForTimeout(150);
  check("Learn: odomknutá lekcia", await page.locator('.appwin[data-app="learn"] .lrn-item:not(.locked)').count() >= 1);

  // 5) zmena veľkosti okna ťahaním za roh
  await closeAll();
  await page.evaluate(() => os.openApp("notepad"));
  const wb = await page.locator('.appwin[data-app="notepad"]').boundingBox();
  await page.mouse.move(wb.x + wb.width - 2, wb.y + wb.height - 2);
  await page.mouse.down();
  await page.mouse.move(wb.x + wb.width + 120, wb.y + wb.height + 70, { steps: 5 });
  await page.mouse.up();
  const wa = await page.locator('.appwin[data-app="notepad"]').boundingBox();
  check("okno sa dá roztiahnuť za roh", wa.width > wb.width + 80 && wa.height > wb.height + 40);

  // 6) Start menu: vyhľadávanie (súbor, lekcia), Enter otvorí prvý výsledok, Esc zatvorí
  await closeAll();
  await page.click(".tb-start");
  await page.fill(".sm-search-input", "keeper");
  check("hľadanie nájde súbor", (await page.locator(".sm-res").count()) >= 1);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  check("Enter otvorí výsledok (Notepad)", await visible('.appwin[data-app="notepad"]'));
  await page.keyboard.press("Control+Alt+s");
  check("Ctrl+Alt+S otvorí hľadanie", await visible(".sm-search-input"));
  await page.fill(".sm-search-input", "phishing");
  check("hľadanie nájde lekciu", (await page.locator(".sm-res").filter({ hasText: "lesson" }).count()) >= 1);
  await page.keyboard.press("Escape");
  check("Esc zatvorí Start menu", !(await visible("#start-menu")));

  // 7) pravé tlačidlo: plocha + ikona
  await closeAll();
  await page.click("#windows", { button: "right", position: { x: 700, y: 300 }, force: true });
  check("kontextové menu na ploche", await visible("#ctx-menu"));
  const itemTexts = await page.locator("#ctx-menu .ctx-item").allTextContents();
  check("menu obsahuje Refresh a Personalize", itemTexts.some((t) => /Refresh/.test(t)) && itemTexts.some((t) => /Personalize/.test(t)));
  await page.keyboard.press("Escape");
  await page.click('#desktop-icons .dicon[data-app="mail"]', { button: "right" });
  check("menu na ikone: Open + Pin", (await page.locator("#ctx-menu .ctx-item").allTextContents()).some((t) => /Pin to taskbar/.test(t)));
  await page.locator("#ctx-menu .ctx-item", { hasText: "Pin to taskbar" }).click();
  check("pripnutie na taskbar", await page.locator('#tb-windows .tb-win[data-app="mail"]').count() === 1);

  // 8) skratky: Show desktop a Alt+W prepínač
  await closeAll();
  await page.evaluate(() => { os.openApp("terminal"); os.openApp("explorer"); });
  await page.keyboard.press("Control+Alt+d");
  check("Ctrl+Alt+D minimalizuje okná", (await page.locator(".appwin.minimized").count()) >= 2);
  await page.keyboard.press("Control+Alt+d");
  check("opakovane obnoví okná", (await page.locator(".appwin.minimized").count()) === 0);
  await page.keyboard.down("Alt");
  await page.keyboard.press("w");
  check("Alt+W ukáže prepínač", await visible("#alt-tab"));
  await page.keyboard.up("Alt");
  check("pustenie Alt prepínač zavrie", !(await visible("#alt-tab")));

  // 9) mobil: okná sa automaticky maximalizujú
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(200);
  await closeAll();
  await page.evaluate(() => os.openApp("helpdesk"));
  await page.waitForTimeout(150);
  const mob = await page.locator('.appwin[data-app="helpdesk"]').boundingBox();
  check("mobil: okno vyplní šírku displeja", mob.width >= 385);
  await page.setViewportSize({ width: 1280, height: 800 });

  // 10) Mail: Flag, Archive, Reply (+XP), Sent
  await closeAll();
  await page.evaluate(() => os.openApp("mail"));
  await page.click(".ol-item.flavor >> nth=0");
  await page.click("#ol-flag");
  await page.click('.ol-folder[data-folder="flagged"]');
  check("Flagged ukáže označený mail", (await page.locator(".ol-item").count()) === 1);
  await page.click(".ol-item >> nth=0");
  await page.click("#ol-reply");
  const xp0 = await page.evaluate(() => state.xp);
  await page.fill(".ol-reply-text", "Hi Zora, thanks — I've read the SOP binder and checked the queue. Please let me know if you need anything else.");
  await page.click("#ol-send");
  check("odpoveď dá XP", (await page.evaluate(() => state.xp)) > xp0);
  await page.click('.ol-folder[data-folder="sent"]');
  check("Sent ukáže odoslanú odpoveď", (await page.locator(".ol-item").count()) === 1);
  await page.click('.ol-folder[data-folder="inbox"]');
  await page.click(".ol-item >> nth=1");
  await page.click("#ol-arch");
  await page.click('.ol-folder[data-folder="archive"]');
  check("Archive ukáže archivovaný mail", (await page.locator(".ol-item").count()) === 1);

  // 11) Files: disk D: + dôkazy
  await closeAll();
  await page.evaluate(() => os.openApp("explorer"));
  await page.locator(".exp-nav", { hasText: "D:" }).click();
  check("D: obsahuje Logs a Evidence", (await page.locator(".exp-item span").allTextContents()).join(",").includes("Evidence"));
  await page.evaluate(() => { for (const f of EVIDENCE_FILES) npadShow(f, FILE_TEXT[f]); });
  check("všetky dôkazy nájdené", await page.evaluate(() => state.evidence.length === EVIDENCE_FILES.length));

  // 12) kvíz po kapitole + replay lab s inou chybou
  await closeAll();
  await page.evaluate(() => { state.binder = { downloaded: true }; binderOpen(); });
  await page.locator(".binder-ch", { hasText: "Windows services" }).click();
  check("dokončená kapitola ponúka kvíz aj replay", (await visible(".binder-cq")) && (await visible(".binder-replay")));
  await page.click(".binder-cq");
  for (let i = 0; i < 3; i++) {
    await page.locator(".cq-answers .quiz-answer").first().click();
    await page.click(".cq-next");
  }
  check("kvíz po kapitole skončí výsledkom X/3", /\/3/.test((await page.textContent("#cq-body")) || ""));
  await page.click(".cq-done");
  await page.click(".binder-replay");
  check("replay vytvorí nový ticket", await page.evaluate(() => state.replays === 1 && state.grindTickets.some((t) => /replay/i.test(t.from))));
  await page.evaluate(() => document.getElementById("binder-overlay").classList.add("hidden"));

  // 13) A+ kvíz mieša odpovede (správna odpoveď nie je stále na rovnakom mieste)
  const positions = await page.evaluate(() => {
    const seen = new Set();
    for (let i = 0; i < 40; i++) { quizOpen("aplus"); seen.add(quizState.order.indexOf(0)); }
    document.getElementById("quiz-overlay").classList.add("hidden");
    return [...seen];
  });
  check("A+ kvíz mieša odpovede", positions.length > 1);

  check("žiadne JS chyby", errors.length === 0);
  await browser.close();
  server.close();

  let fail = 0;
  for (const [n, ok] of results) { if (!ok) fail++; console.log((ok ? "PASS " : "FAIL ") + n); }
  if (errors.length) console.log("\nChyby:\n" + errors.join("\n"));
  console.log(fail ? `\n${fail} FAILED ❌` : "\nALL PASS ✅");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
