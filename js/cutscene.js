/* ===== TicketQuest â€” visual novel cutscÃ©novÃ½ engine ===== */

const cutscene = (() => {
  const overlay = document.getElementById("cutscene-overlay");
  const cv = document.getElementById("cutscene-canvas");
  const ctx = cv.getContext("2d");
  // plÃ¡tno je fyzicky 960Ã—540, ale kreslÃ­me v pÃ´vodnÃ½ch sÃºradniciach 480Ã—270
  // â†’ ostrÃ¡ HD grafika bez pixelov, kÃ³d zostÃ¡va ÄitateÄ¾nÃ½
  ctx.scale(2, 2);
  const nameTag = document.getElementById("cs-speaker");
  const textEl = document.getElementById("cs-text");
  const inputWrap = document.getElementById("cs-input-wrap");
  const inputEl = document.getElementById("cs-input");
  const skipBtn = document.getElementById("cs-skip");
  const povTag = document.getElementById("cs-pov");

  let scenes = [];
  let sceneIdx = 0;
  let lineIdx = 0;
  let typing = null;      // {full, shown, done, timer}
  let onDone = null;
  let activeInput = null; // {prompt, save}

  /* ---------- zvuk (WebAudio, len efekty) ---------- */
  let actx = null;
  function audio() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    return actx;
  }
  function blip() {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = "square"; o.frequency.value = 620 + Math.random() * 160;
    g.gain.value = 0.018;
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + 0.03);
  }
  function thunk() {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = "triangle"; o.frequency.value = 220;
    g.gain.value = 0.03;
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + 0.08);
  }

  /* ---------- pozadia (procedurÃ¡lny pixel-art) ---------- */
  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  const BACKGROUNDS = {
    /* reception â€” bright lobby, smooth shapes */
    reception() {
      // wall gradient
      const wall = ctx.createLinearGradient(0, 0, 0, 170);
      wall.addColorStop(0, "#262c4a"); wall.addColorStop(1, "#1a1f35");
      ctx.fillStyle = wall; ctx.fillRect(0, 0, 480, 170);
      // floor
      const floor = ctx.createLinearGradient(0, 170, 0, 270);
      floor.addColorStop(0, "#232840"); floor.addColorStop(1, "#141726");
      ctx.fillStyle = floor; ctx.fillRect(0, 170, 480, 100);
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      for (let i = 0; i < 480; i += 48) ctx.fillRect(i, 170, 1, 100);
      // glowing company sign
      ctx.fillStyle = "#10131f";
      ctx.beginPath(); ctx.roundRect(140, 22, 200, 48, 10); ctx.fill();
      ctx.strokeStyle = "rgba(76,194,255,.35)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(140, 22, 200, 48, 10); ctx.stroke();
      ctx.fillStyle = "#ffb900"; ctx.font = "700 17px 'Segoe UI'";
      ctx.textAlign = "center";
      ctx.fillText("PIXL CORP", 240, 52);
      ctx.textAlign = "left";
      // reception desk with shadow
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.beginPath(); ctx.ellipse(125, 256, 110, 10, 0, 0, Math.PI * 2); ctx.fill();
      const desk = ctx.createLinearGradient(0, 190, 0, 250);
      desk.addColorStop(0, "#3a3f52"); desk.addColorStop(1, "#2a2e3d");
      ctx.fillStyle = desk;
      ctx.beginPath(); ctx.roundRect(45, 190, 160, 62, 6); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.08)";
      ctx.fillRect(45, 190, 160, 6);
      // monitor on the desk
      ctx.fillStyle = "#0e1119";
      ctx.beginPath(); ctx.roundRect(90, 162, 56, 34, 4); ctx.fill();
      ctx.fillStyle = "#123a30";
      ctx.fillRect(94, 166, 48, 26);
      // plant
      ctx.fillStyle = "#3d3428";
      ctx.beginPath(); ctx.roundRect(410, 216, 30, 40, 5); ctx.fill();
      ctx.fillStyle = "#4cc2ff";
      ctx.beginPath(); ctx.ellipse(425, 206, 20, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#25aa85";
      ctx.beginPath(); ctx.ellipse(410, 196, 10, 8, -.4, 0, Math.PI * 2); ctx.fill();
      // window glow
      const win = ctx.createLinearGradient(0, 0, 0, 100);
      win.addColorStop(0, "rgba(120,150,255,.18)"); win.addColorStop(1, "rgba(120,150,255,0)");
      ctx.fillStyle = win; ctx.fillRect(280, 0, 200, 100);
    },

    /* office â€” desks, monitors, daylight */
    office() {
      const wall = ctx.createLinearGradient(0, 0, 0, 140);
      wall.addColorStop(0, "#2c3350"); wall.addColorStop(1, "#1c2133");
      ctx.fillStyle = wall; ctx.fillRect(0, 0, 480, 140);
      // windows with sky
      for (const x of [40, 180, 320]) {
        ctx.fillStyle = "#0e1119";
        ctx.beginPath(); ctx.roundRect(x, 16, 100, 62, 6); ctx.fill();
        const sky = ctx.createLinearGradient(0, 20, 0, 74);
        sky.addColorStop(0, "#7ea4e8"); sky.addColorStop(1, "#4b6699");
        ctx.fillStyle = sky;
        ctx.beginPath(); ctx.roundRect(x + 5, 21, 90, 52, 4); ctx.fill();
        // clouds
        ctx.fillStyle = "rgba(255,255,255,.5)";
        ctx.beginPath(); ctx.ellipse(x + 30, 40, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 62, 50, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
      }
      // floor
      const floor = ctx.createLinearGradient(0, 140, 0, 270);
      floor.addColorStop(0, "#262b3d"); floor.addColorStop(1, "#171a27");
      ctx.fillStyle = floor; ctx.fillRect(0, 140, 480, 130);
      // desks with shadows
      for (let i = 0; i < 3; i++) {
        const x = 40 + i * 140;
        ctx.fillStyle = "rgba(0,0,0,.3)";
        ctx.beginPath(); ctx.ellipse(x + 55, 254, 60, 8, 0, 0, Math.PI * 2); ctx.fill();
        const deskG = ctx.createLinearGradient(0, 196, 0, 250);
        deskG.addColorStop(0, "#3a3f52"); deskG.addColorStop(1, "#282c3b");
        ctx.fillStyle = deskG;
        ctx.beginPath(); ctx.roundRect(x, 196, 110, 54, 5); ctx.fill();
        // monitor
        ctx.fillStyle = "#0e1119";
        ctx.beginPath(); ctx.roundRect(x + 24, 160, 62, 40, 4); ctx.fill();
        const scr = ctx.createLinearGradient(0, 164, 0, 196);
        scr.addColorStop(0, "#1d6e58"); scr.addColorStop(1, "#12453a");
        ctx.fillStyle = scr;
        ctx.fillRect(x + 28, 164, 54, 32);
        // stand
        ctx.fillStyle = "#232735";
        ctx.fillRect(x + 50, 200, 10, 6);
      }
      // cabinet
      ctx.fillStyle = "#2a2e3d";
      ctx.beginPath(); ctx.roundRect(428, 150, 40, 108, 5); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.06)";
      ctx.strokeRect(433, 156, 30, 44);
    },

    /* server room at night â€” dark, glowing racks */
    serverroom() {
      ctx.fillStyle = "#07090f"; ctx.fillRect(0, 0, 480, 270);
      // soft ambient glow
      const glow = ctx.createRadialGradient(240, 140, 40, 240, 140, 300);
      glow.addColorStop(0, "rgba(76,194,255,.07)"); glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 480, 270);
      // racks
      for (const rx of [70, 260]) {
        ctx.fillStyle = "#12151f";
        ctx.beginPath(); ctx.roundRect(rx, 36, 150, 208, 6); ctx.fill();
        ctx.fillStyle = "#0b0d15";
        ctx.beginPath(); ctx.roundRect(rx + 5, 41, 140, 198, 4); ctx.fill();
        for (let i = 0; i < 8; i++) {
          const y = 50 + i * 24;
          // server unit
          ctx.fillStyle = "#161a26";
          ctx.beginPath(); ctx.roundRect(rx + 10, y, 130, 16, 3); ctx.fill();
          // LED strip
          const led = i % 3 === 0 ? "#4cc2ff" : i % 2 ? "#4cc2ff" : "#ffb900";
          ctx.fillStyle = led;
          ctx.beginPath(); ctx.arc(rx + 18, y + 8, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(76,194,255,.25)";
          ctx.beginPath(); ctx.arc(rx + 18, y + 8, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#3949ab";
          ctx.fillRect(rx + 30, y + 6, 4, 4);
          // vent lines
          ctx.fillStyle = "rgba(255,255,255,.05)";
          for (let v = 0; v < 5; v++) ctx.fillRect(rx + 45 + v * 18, y + 5, 12, 2);
        }
      }
      // corner screen
      ctx.fillStyle = "#0e1119";
      ctx.beginPath(); ctx.roundRect(424, 176, 46, 34, 4); ctx.fill();
      ctx.fillStyle = "#0f3d2a";
      ctx.fillRect(428, 180, 38, 26);
    },

    /* night city — PIXL Corp HQ večer (keeper odhalenie, Doris arch veselo) */
    nightcity() {
      ctx.fillStyle = "#05070f"; ctx.fillRect(0, 0, 480, 270);
      // mesiac + halo
      ctx.fillStyle = "rgba(230,240,255,.08)";
      ctx.beginPath(); ctx.arc(398, 46, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e8eef8";
      ctx.beginPath(); ctx.arc(398, 46, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#05070f";
      ctx.beginPath(); ctx.arc(406, 41, 15, 0, Math.PI * 2); ctx.fill();
      // sky glow nad mestom
      const sky = ctx.createLinearGradient(0, 60, 0, 170);
      sky.addColorStop(0, "rgba(40,60,140,.25)");
      sky.addColorStop(1, "rgba(10,14,30,0)");
      ctx.fillStyle = sky; ctx.fillRect(0, 60, 480, 110);
      // skyline — budovy
      const bldgs = [[0, 120, 52], [46, 92, 40], [92, 140, 46], [142, 104, 38], [184, 150, 50], [238, 88, 42], [284, 128, 48], [336, 96, 44], [384, 138, 52], [440, 112, 40]];
      for (const [x, h, w] of bldgs) {
        ctx.fillStyle = "#0b0e18";
        ctx.fillRect(x, 270 - h, w, h);
        // okná — rozsvietené náhodne (stabilný vzor podľa x)
        for (let wy = 270 - h + 8; wy < 258; wy += 12) {
          for (let wx = x + 5; wx < x + w - 6; wx += 10) {
            const on = ((wx * 7 + wy * 13) % 11) < 4;
            ctx.fillStyle = on ? "rgba(120,170,255,.5)" : "rgba(255,255,255,.05)";
            ctx.fillRect(wx, wy, 5, 6);
          }
        }
      }
      // PIXL Corp HQ — dominantná veža
      ctx.fillStyle = "#0d1120";
      ctx.fillRect(204, 64, 74, 206);
      ctx.strokeStyle = "rgba(76,194,255,.4)"; ctx.lineWidth = 1.5;
      ctx.strokeRect(204, 64, 74, 206);
      // logo + anténa
      ctx.fillStyle = "#ffb900";
      ctx.fillRect(222, 78, 38, 14);
      ctx.fillStyle = "#0d1120";
      ctx.font = "700 9px 'Segoe UI'";
      ctx.textAlign = "center";
      ctx.fillText("PIXL", 241, 88);
      ctx.textAlign = "left";
      ctx.fillStyle = "#3949ab";
      ctx.fillRect(240, 40, 2, 24);
      ctx.fillStyle = "#ff4d6a";
      ctx.beginPath(); ctx.arc(241, 38, 2.5, 0, Math.PI * 2); ctx.fill();
      // okná HQ (modrasté, viac rozsvietené)
      for (let wy = 96; wy < 258; wy += 13) {
        for (let wx = 211; wx < 268; wx += 12) {
          const on = ((wx * 5 + wy * 7) % 9) < 5;
          ctx.fillStyle = on ? "rgba(76,194,255,.45)" : "rgba(76,194,255,.08)";
          ctx.fillRect(wx, wy, 7, 8);
        }
      }
      // ulica vpredu
      ctx.fillStyle = "#07090f";
      ctx.fillRect(0, 258, 480, 12);
      ctx.fillStyle = "rgba(255,200,90,.35)";
      for (let x = 10; x < 480; x += 44) ctx.fillRect(x, 263, 18, 2);
      // vignette
      const vig = ctx.createRadialGradient(240, 140, 130, 240, 140, 330);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,.5)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, 480, 270);
    },

    /* POV 1st person â€” looking at a monitor at night */
    deskpov() {
      ctx.fillStyle = "#05070c"; ctx.fillRect(0, 0, 480, 270);
      // monitor bezel
      ctx.fillStyle = "#0d0f16";
      ctx.beginPath(); ctx.roundRect(34, 62, 412, 192, 10); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.06)";
      ctx.beginPath(); ctx.roundRect(34, 62, 412, 192, 10); ctx.stroke();
      // screen
      const scr = ctx.createLinearGradient(0, 70, 0, 250);
      scr.addColorStop(0, "#081410"); scr.addColorStop(1, "#050b09");
      ctx.fillStyle = scr;
      ctx.beginPath(); ctx.roundRect(44, 72, 392, 172, 6); ctx.fill();
      // terminal lines
      ctx.font = "12px 'Consolas', monospace";
      const rows = [
        ["PS C:\\> eventlog security", "#9fe8c4"],
        ["4625 failed logon  source=10.0.13.66", "#9fe8c4"],
        ["4640 account locked user=doris", "#ffb900"],
        ["4624 logon  source=INTERNAL", "#ffb900"],
        ["_", "#9fe8c4"],
      ];
      rows.forEach(([r, c], i) => {
        ctx.fillStyle = c;
        ctx.fillText(r, 62, 102 + i * 20);
      });
      // vignette
      const vig = ctx.createRadialGradient(240, 160, 140, 240, 160, 340);
      vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,.55)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, 480, 270);
      // sticky note
      ctx.fillStyle = "#ffb900";
      ctx.save();
      ctx.translate(366, 44); ctx.rotate(-0.05);
      ctx.fillRect(0, 0, 64, 30);
      ctx.fillStyle = "#3a2a00";
      ctx.font = "10px 'Segoe UI'";
      ctx.fillText("lock = K?", 8, 13);
      ctx.fillText("check logs", 8, 24);
      ctx.restore();
      // coffee
      ctx.fillStyle = "#2a2e3d";
      ctx.beginPath(); ctx.roundRect(14, 210, 30, 40, 4); ctx.fill();
      ctx.fillStyle = "#6b4a2f";
      ctx.beginPath(); ctx.ellipse(29, 218, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
      // steam
      ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(26, 210); ctx.quadraticCurveTo(22, 200, 26, 192); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(34, 210); ctx.quadraticCurveTo(38, 200, 34, 192); ctx.stroke();
    },
  };

  /* ---------- kompozÃ­cia scÃ©ny ---------- */
  function renderScene(scene) {
    (BACKGROUNDS[scene.bg] || BACKGROUNDS.office)();
    if (scene.pov === "1st") {
      povTag.textContent = "â—‰ 1ST PERSON";
      return; // no sprites in 1st person
    }
    povTag.textContent = "â—Ž 3RD PERSON";

    /* kto prÃ¡ve hovorÃ­? â†’ reÄnÃ­k je plne zviditeÄ¾nÃ½, ostatnÃ­ stmavenÃ½ */
    const line = currentLine();
    const activeWho = line ? line.who : null;
    (scene.sprites || []).forEach((sp) => {
      const left = sp.pos === "right";
      const speaking = activeWho === sp.who || (activeWho === "you" && sp.who === "player");
      const dim = scene.sprites.length > 1 && !speaking;
      const look = speaking && left ? 1 : speaking && !left ? -1 : 0;
      drawCharSmooth(ctx, left ? 348 : 122, 362, 340, outfitOf(sp.who), {
        dim,
        look: left ? 1 : -1,      // pozerajÃº na druhÃ©ho
        mood: speaking ? undefined : "neutral",
      });
      // jemnÃ© znÃ¡zornenie reÄnÃ­ka â€” menovka
      if (scene.sprites.length > 1) {
        const ch = STORY_CHARS[sp.who];
        ctx.font = "600 11px 'Segoe UI'";
        ctx.textAlign = "center";
        ctx.fillStyle = speaking ? "rgba(76,194,255,.95)" : "rgba(230,234,242,.4)";
        ctx.fillText(ch ? ch.label.split(" ")[0] : sp.who, left ? 348 : 122, 66);
        ctx.textAlign = "left";
      }
    });
  }

  /* ---------- typewriter ---------- */
  function currentLine() {
    const sc = scenes[sceneIdx];
    return sc && sc.lines ? sc.lines[lineIdx] : null;
  }

  function showLine() {
    const line = currentLine();
    if (!line) { nextScene(); return; }
    inputWrap.classList.add("hidden");
    const who = line.who;
    let speaker = "";
    let cls = "";
    if (who === "narr") { speaker = ""; cls = "t-dim"; }
    else if (who === "you") { speaker = state.player.name || "You"; }
    else if (who === "thought") { speaker = "You (thinking)"; cls = "cs-thought"; }
    else {
      const ch = STORY_CHARS[who];
      speaker = ch ? ch.label : who;
    }
    nameTag.textContent = speaker;
    nameTag.style.display = speaker ? "" : "none";
    textEl.className = cls;
    let text = line.text.replaceAll("{PLAYER}", state.player.name || "you");
    startTyping(text);
  }

  function startTyping(text) {
    textEl.textContent = "";
    typing = { full: text, i: 0 };
    const timer = setInterval(() => {
      typing.i++;
      textEl.textContent = typing.full.slice(0, typing.i);
      if (typing.i % 3 === 0) blip();
      if (typing.i >= typing.full.length) {
        clearInterval(timer);
        typing.done = true;
      }
    }, 22);
    typing.timer = timer;
  }

  function finishTyping() {
    clearInterval(typing.timer);
    textEl.textContent = typing.full;
    typing.done = true;
  }

  /* ---------- input krok (meno hrÃ¡Äa) ---------- */
  function startInput() {
    activeInput = scenes[sceneIdx].input;
    nameTag.textContent = "";
    nameTag.style.display = "none";
    textEl.className = "";
    textEl.textContent = activeInput.prompt.replaceAll("{PLAYER}", "");
    inputWrap.classList.remove("hidden");
    setTimeout(() => inputEl.focus(), 30);
  }

  function submitInput() {
    const val = inputEl.value.trim();
    if (!val) { inputEl.placeholder = "Type your nameâ€¦"; return; }
    state.player.name = sanitizeName(val);
    state.player.login = val.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
    saveGame();
    inputWrap.classList.add("hidden");
    inputEl.value = "";
    activeInput = null;
    thunk();
    renderScene(scenes[sceneIdx]); // re-render (avatar mÃ¡ meno)
    lineIdx++;
    showLine();
  }

  /* ---------- posun ---------- */
  function advance() {
    if (activeInput) return; // ÄakÃ¡me na meno
    if (typing && !typing.done) { finishTyping(); return; }
    thunk();
    const sc = scenes[sceneIdx];
    lineIdx++;
    if (sc.input && lineIdx === sc.input.afterLine) { startInput(); return; }
    if (lineIdx >= sc.lines.length) { nextScene(); return; }
    showLine();
  }

  function nextScene() {
    sceneIdx++;
    lineIdx = 0;
    if (sceneIdx >= scenes.length) { end(); return; }
    const sc = scenes[sceneIdx];
    renderScene(sc);
    if (sc.input && sc.input.immediate) { startInput(); return; }
    showLine();
  }

  function end() {
    overlay.classList.add("hidden");
    const cb = onDone; onDone = null;
    scenes = [];
    if (cb) cb();
  }

  /* ---------- verejnÃ© API ---------- */
  function play(sceneList, done) {
    scenes = sceneList;
    sceneIdx = 0; lineIdx = 0;
    onDone = done;
    overlay.classList.remove("hidden");
    skipBtn.onclick = () => { end(); };
    renderScene(scenes[0]);
    if (scenes[0].input && scenes[0].input.immediate) startInput();
    else showLine();
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === skipBtn || inputWrap.contains(e.target)) return;
    advance();
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitInput();
    e.stopPropagation();
  });
  document.addEventListener("keydown", (e) => {
    if (overlay.classList.contains("hidden")) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); }
  });

  return { play, end };
})();
