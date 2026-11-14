/* ===== TicketQuest — visual novel cutscénový engine ===== */

const cutscene = (() => {
  const overlay = document.getElementById("cutscene-overlay");
  const cv = document.getElementById("cutscene-canvas");
  const stage = document.getElementById("cs-stage");
  const cv3d = document.getElementById("cutscene-3d");
  const ctx = cv.getContext("2d");
  // plátno je fyzicky 960×540, ale kreslíme v pôvodných súradniciach 480×270
  // → ostrá HD grafika bez pixelov, kód zostáva čitateľný
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
  let renderer3d = null;
  let world3d = null;
  let camera3d = null;
  let active3dScene = null;
  let active3dPlayerName = null;
  let actors3d = [];
  let raf3d = null;
  let speakerWho = null;     // kto práve hovorí (pre kameru a animácie postáv)
  let sceneStart = 0;
  let camBase = null;        // { pos, look } — základ pre dolly/kameru
  let shakeUntil = 0;
  let titleEl = null;

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

  /* ---------- pozadia (procedurálny pixel-art) ---------- */
  function px(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  const BACKGROUNDS = {
    /* reception — bright lobby, smooth shapes */
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

    bossoffice() {
      const wall = ctx.createLinearGradient(0, 0, 0, 172);
      wall.addColorStop(0, "#344c48"); wall.addColorStop(1, "#1c2a28");
      ctx.fillStyle = wall; ctx.fillRect(0, 0, 480, 172);

      const windowGlow = ctx.createLinearGradient(0, 22, 0, 130);
      windowGlow.addColorStop(0, "#9cbeb4"); windowGlow.addColorStop(1, "#526e69");
      ctx.fillStyle = "#111b1b"; ctx.fillRect(24, 20, 148, 112);
      ctx.fillStyle = windowGlow; ctx.fillRect(29, 25, 138, 102);
      ctx.fillStyle = "rgba(241, 247, 225, .5)";
      ctx.beginPath(); ctx.arc(135, 49, 16, 0, Math.PI * 2); ctx.fill();
      for (const [x, y, w, h] of [[35, 83, 24, 44], [63, 66, 31, 61], [99, 91, 22, 36], [126, 74, 35, 53]]) {
        ctx.fillStyle = "#344b48"; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "rgba(245, 196, 91, .42)";
        for (let wy = y + 7; wy < y + h - 4; wy += 12) ctx.fillRect(x + 5, wy, 4, 5);
      }
      ctx.fillStyle = "rgba(230, 243, 230, .45)";
      ctx.fillRect(94, 24, 3, 104);
      ctx.fillRect(27, 76, 142, 3);

      ctx.fillStyle = "#263936"; ctx.fillRect(399, 106, 52, 65);
      ctx.fillStyle = "#a8875c"; ctx.fillRect(404, 112, 42, 3);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = ["#577f72", "#c78c53", "#667b9a", "#a35f48", "#d2b776"][i];
        ctx.fillRect(406 + (i % 2) * 17, 119 + Math.floor(i / 2) * 14, 12, 12);
      }

      const floor = ctx.createLinearGradient(0, 170, 0, 270);
      floor.addColorStop(0, "#73634d"); floor.addColorStop(1, "#40392f");
      ctx.fillStyle = floor; ctx.fillRect(0, 172, 480, 98);
      ctx.fillStyle = "rgba(255,255,255,.07)";
      for (let x = 0; x < 480; x += 48) ctx.fillRect(x, 172, 1, 98);
      ctx.fillStyle = "#9b7955"; ctx.fillRect(0, 168, 480, 5);
    },

    /* office — desks, monitors, daylight */
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

    /* server room at night — dark, glowing racks */
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

    /* Night city around PIXL Corp HQ. */
    nightcity() {
      ctx.fillStyle = "#05070f"; ctx.fillRect(0, 0, 480, 270);
      // mesiac + halo
      ctx.fillStyle = "rgba(230,240,255,.08)";
      ctx.beginPath(); ctx.arc(398, 46, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#e8eef8";
      ctx.beginPath(); ctx.arc(398, 46, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#05070f";
      ctx.beginPath(); ctx.arc(406, 41, 15, 0, Math.PI * 2); ctx.fill();
      // Glow above the skyline.
      const sky = ctx.createLinearGradient(0, 60, 0, 170);
      sky.addColorStop(0, "rgba(40,60,140,.25)");
      sky.addColorStop(1, "rgba(10,14,30,0)");
      ctx.fillStyle = sky; ctx.fillRect(0, 60, 480, 110);
      // Skyline buildings.
      const bldgs = [[0, 120, 52], [46, 92, 40], [92, 140, 46], [142, 104, 38], [184, 150, 50], [238, 88, 42], [284, 128, 48], [336, 96, 44], [384, 138, 52], [440, 112, 40]];
      for (const [x, h, w] of bldgs) {
        ctx.fillStyle = "#0b0e18";
        ctx.fillRect(x, 270 - h, w, h);
        // Deterministic lit-window pattern based on coordinates.
        for (let wy = 270 - h + 8; wy < 258; wy += 12) {
          for (let wx = x + 5; wx < x + w - 6; wx += 10) {
            const on = ((wx * 7 + wy * 13) % 11) < 4;
            ctx.fillStyle = on ? "rgba(120,170,255,.5)" : "rgba(255,255,255,.05)";
            ctx.fillRect(wx, wy, 5, 6);
          }
        }
      }
      // PIXL Corp HQ tower.
      ctx.fillStyle = "#0d1120";
      ctx.fillRect(204, 64, 74, 206);
      ctx.strokeStyle = "rgba(76,194,255,.4)"; ctx.lineWidth = 1.5;
      ctx.strokeRect(204, 64, 74, 206);
      // Logo and antenna.
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
      // HQ windows, mostly illuminated.
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

    /* POV 1st person — looking at a monitor at night */
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

  /* ---------- kompozícia scény ---------- */
  function drawCinematicFinish(scene) {
    const tint = {
      reception: "rgba(82, 205, 177, .12)",
      office: "rgba(255, 197, 104, .10)",
      serverroom: "rgba(74, 226, 160, .11)",
      nightcity: "rgba(89, 143, 222, .12)",
      deskpov: "rgba(69, 216, 159, .10)",
    }[scene.bg] || "rgba(98, 217, 192, .08)";
    const wash = ctx.createRadialGradient(240, 112, 16, 240, 136, 310);
    wash.addColorStop(0, tint);
    wash.addColorStop(1, "rgba(2, 5, 9, .18)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, 480, 270);

    ctx.fillStyle = "rgba(4, 7, 11, .055)";
    for (let y = 1; y < 270; y += 6) ctx.fillRect(0, y, 480, 0.3);

    ctx.strokeStyle = "rgba(229, 244, 238, .17)";
    ctx.lineWidth = 0.7;
    ctx.strokeRect(7, 7, 466, 256);
    ctx.fillStyle = "rgba(245, 196, 91, .8)";
    for (const [x, y, sx, sy] of [[12, 12, 1, 1], [468, 12, -1, 1], [12, 258, 1, -1], [468, 258, -1, -1]]) {
      ctx.fillRect(x, y, 11 * sx, 1);
      ctx.fillRect(x, y, 1, 11 * sy);
    }
  }

  function drawSceneForeground(scene) {
    if (scene.foreground !== "executiveDesk") return;

    ctx.fillStyle = "rgba(8, 12, 11, .38)";
    ctx.beginPath(); ctx.ellipse(240, 258, 240, 15, 0, 0, Math.PI * 2); ctx.fill();

    const panel = ctx.createLinearGradient(0, 198, 0, 270);
    panel.addColorStop(0, "#4a3728"); panel.addColorStop(1, "#241f1a");
    ctx.fillStyle = panel;
    ctx.beginPath(); ctx.moveTo(29, 198); ctx.lineTo(451, 198); ctx.lineTo(470, 270); ctx.lineTo(10, 270); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(231, 195, 139, .3)"; ctx.lineWidth = 1;
    ctx.strokeRect(42, 211, 396, 45);
    ctx.fillStyle = "#d8c29e"; ctx.font = "700 8px 'Segoe UI'";
    ctx.textAlign = "center";
    ctx.fillText("PIXL CORP  |  IT OPERATIONS", 240, 240);
    ctx.textAlign = "left";

    const top = ctx.createLinearGradient(0, 180, 0, 204);
    top.addColorStop(0, "#c59b67"); top.addColorStop(1, "#806040");
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.moveTo(16, 180); ctx.lineTo(464, 180); ctx.lineTo(451, 202); ctx.lineTo(29, 202); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255, 231, 184, .55)";
    ctx.beginPath(); ctx.moveTo(20, 182); ctx.lineTo(460, 182); ctx.stroke();

    ctx.fillStyle = "#171d1c"; ctx.beginPath(); ctx.roundRect(212, 137, 56, 42, 4); ctx.fill();
    const monitor = ctx.createLinearGradient(0, 141, 0, 174);
    monitor.addColorStop(0, "#294c43"); monitor.addColorStop(1, "#14231f");
    ctx.fillStyle = monitor; ctx.fillRect(216, 141, 48, 32);
    ctx.fillStyle = "#77d6b2";
    ctx.fillRect(220, 147, 22, 2); ctx.fillRect(220, 153, 37, 2); ctx.fillRect(220, 159, 30, 2);
    ctx.fillStyle = "#282c2a"; ctx.fillRect(235, 179, 10, 5);

    ctx.fillStyle = "#f3ead7"; ctx.fillRect(88, 186, 36, 2); ctx.fillRect(89, 190, 31, 2);
    ctx.fillStyle = "#315d50"; ctx.beginPath(); ctx.roundRect(365, 185, 15, 15, 3); ctx.fill();
    ctx.fillStyle = "#d9b77d"; ctx.fillRect(395, 187, 29, 2); ctx.fillRect(395, 192, 22, 2);
  }

  function resize3d() {
    if (!renderer3d || !stage.clientWidth || !stage.clientHeight) return;
    renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer3d.setSize(stage.clientWidth, stage.clientHeight, false);
    camera3d.aspect = stage.clientWidth / stage.clientHeight;
    camera3d.updateProjectionMatrix();
  }

  function init3d() {
    if (renderer3d) return true;
    if (typeof THREE === "undefined" || !cv3d) return false;
    try {
      renderer3d = new THREE.WebGLRenderer({ canvas: cv3d, antialias: true, alpha: false });
      renderer3d.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      if (renderer3d.outputColorSpace !== undefined && THREE.SRGBColorSpace) {
        renderer3d.outputColorSpace = THREE.SRGBColorSpace;
      }
      if (THREE.ACESFilmicToneMapping !== undefined) {
        renderer3d.toneMapping = THREE.ACESFilmicToneMapping;
        renderer3d.toneMappingExposure = 1.08;
      }
      renderer3d.shadowMap.enabled = true;
      renderer3d.shadowMap.type = THREE.PCFSoftShadowMap;
      camera3d = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 100);
      stage.classList.add("three-ready");
      window.addEventListener("resize", resize3d);
      resize3d();
      return true;
    } catch (error) {
      console.warn("3D cutscenes unavailable; using the illustrated fallback.", error);
      return false;
    }
  }

  function disposeWorld3d() {
    if (!world3d) return;
    world3d.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (!object.material) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (material.map) material.map.dispose();
        material.dispose();
      });
    });
    world3d.clear();
    world3d = null;
    actors3d = [];
  }

  function addBox3d(parent, size, position, color, options = {}) {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.78,
      metalness: options.metalness ?? 0,
      emissive: options.emissive ?? 0x000000,
      emissiveIntensity: options.emissiveIntensity ?? 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;
    parent.add(mesh);
    return mesh;
  }

  function makeSignTexture3d(title, subtitle) {
    const canvas = document.createElement("canvas");
    canvas.width = 768; canvas.height = 192;
    const g = canvas.getContext("2d");
    const gradient = g.createLinearGradient(0, 0, 768, 192);
    gradient.addColorStop(0, "#172b27"); gradient.addColorStop(1, "#263b35");
    g.fillStyle = gradient; g.fillRect(0, 0, 768, 192);
    g.strokeStyle = "rgba(245,196,91,.65)"; g.lineWidth = 5; g.strokeRect(7, 7, 754, 178);
    g.fillStyle = "#f5c45b"; g.font = "700 58px Segoe UI"; g.textAlign = "center";
    g.fillText(title, 384, 88);
    g.fillStyle = "#d8e5de"; g.font = "500 25px Segoe UI";
    g.fillText(subtitle, 384, 137);
    const texture = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace && "colorSpace" in texture) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function addOffice3d(scene, withDesk) {
    const wall = new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: .94 });
    addBox3d(scene, [15, 7, .35], [0, 3.5, -3.6], 0xd8d2c2, { receiveShadow: true });
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 14),
      new THREE.MeshStandardMaterial({ color: 0x89795e, roughness: .9 })
    );
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 2); floor.receiveShadow = true;
    scene.add(floor);

    addBox3d(scene, [4.6, 3.0, .08], [-4.4, 4.2, -3.38], 0x304844, { emissive: 0x3c7664, emissiveIntensity: .22, metalness: .1 });
    for (const x of [-6.75, -2.05]) addBox3d(scene, [.13, 3.25, .16], [x, 4.2, -3.24], 0x4b5148);
    addBox3d(scene, [4.75, .13, .16], [-4.4, 4.2, -3.24], 0x4b5148);
    addBox3d(scene, [.13, 3.25, .16], [-4.4, 4.2, -3.24], 0x4b5148);
    addBox3d(scene, [4.75, .13, .16], [-4.4, 4.2, -3.24], 0x4b5148);
    addBox3d(scene, [15, .16, .3], [0, .12, -3.28], 0x746b59);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 1.1),
      new THREE.MeshBasicMaterial({ map: makeSignTexture3d("PIXL CORP", "INFORMATION TECHNOLOGY"), toneMapped: false })
    );
    sign.position.set(.9, 5.85, -3.36);
    scene.add(sign);

    addBox3d(scene, [1.4, 2.8, .65], [6.15, 1.4, -3.0], 0x534b3e);
    for (let i = 0; i < 5; i++) {
      addBox3d(scene, [.28, .82, .18], [5.65 + (i % 3) * .34, 1.7 + Math.floor(i / 3) * .9, -2.62],
        [0x648377, 0xb88253, 0x65768d, 0xa26250, 0xc3ac77][i]);
    }

    if (!withDesk) {
      for (const [x, z] of [[-5.8, -2.6], [5.8, -2.2]]) {
        addBox3d(scene, [1.4, 1.6, .18], [x, .8, z], 0x8c785f);
        addBox3d(scene, [.9, .7, .06], [x, 1.55, z + .14], 0x182b28, { emissive: 0x28604c, emissiveIntensity: .18 });
      }
    }

    if (withDesk) {
      addBox3d(scene, [8.8, .2, 1.9], [0, 1.25, .25], 0x9a7049, { roughness: .42, castShadow: true });
      addBox3d(scene, [8.4, 1.1, .2], [0, .62, 1.12], 0x543b2b, { roughness: .65 });
      for (const x of [-3.75, 3.75]) addBox3d(scene, [.16, 1.2, 1.4], [x, .6, .25], 0x60462f);
      addBox3d(scene, [1.45, .92, .12], [0, 2.02, -.35], 0x171d1c, { metalness: .25 });
      addBox3d(scene, [1.28, .72, .025], [0, 2.03, -.275], 0x18352e, { emissive: 0x1f664d, emissiveIntensity: .25 });
      for (let i = 0; i < 4; i++) addBox3d(scene, [.75 - i * .06, .035, .02], [-.3, 2.28 - i * .14, -.25], 0x63d2aa, { emissive: 0x22684f, emissiveIntensity: .22 });
      addBox3d(scene, [.9, .08, .38], [0, 1.58, .36], 0x292f30, { roughness: .45 });
      for (const x of [-3.25, 3.25]) {
        const mug = new THREE.Mesh(new THREE.CylinderGeometry(.13, .11, .23, 16), new THREE.MeshStandardMaterial({ color: x < 0 ? 0x557c70 : 0x9f624b, roughness: .38 }));
        mug.position.set(x, 1.46, .45); mug.castShadow = true; scene.add(mug);
      }
      addBox3d(scene, [1.05, .025, .48], [-2.2, 1.37, .4], 0xe9e1d1, { roughness: .95 });
      addBox3d(scene, [.8, .025, .42], [2.05, 1.37, .42], 0xc6b891, { roughness: .95 });
    }
  }

  function addServerRoom3d(scene) {
    addBox3d(scene, [16, 8, .4], [0, 4, -3.5], 0x171c22);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 14), new THREE.MeshStandardMaterial({ color: 0x252b30, roughness: .85 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 2); floor.receiveShadow = true; scene.add(floor);
    for (const x of [-4.4, 0, 4.4]) {
      addBox3d(scene, [2.35, 5.6, .75], [x, 2.8, -2.85], 0x20272d, { metalness: .45, roughness: .4 });
      for (let row = 0; row < 7; row++) {
        addBox3d(scene, [2.0, .55, .08], [x, .65 + row * .75, -2.42], 0x10161b, { metalness: .25, roughness: .5 });
        addBox3d(scene, [.09, .09, .04], [x - .78, .68 + row * .75, -2.35], row % 3 ? 0x55d79c : 0xf0b95e, { emissive: row % 3 ? 0x27a76b : 0xb87b22, emissiveIntensity: .8 });
        for (let vent = 0; vent < 4; vent++) addBox3d(scene, [.19, .035, .025], [x - .35 + vent * .3, .7 + row * .75, -2.34], 0x55616a, { castShadow: false });
      }
    }
  }

  function addNightCity3d(scene) {
    addBox3d(scene, [80, .2, 80], [0, -.2, -12], 0x11151d, { castShadow: false });
    const buildings = [[-8, 7, 4], [-4.8, 5, 2.5], [-1.6, 9, 3], [2, 6, 3], [5.2, 8, 3], [8, 5, 3]];
    buildings.forEach(([x, h, w], i) => {
      addBox3d(scene, [w, h, 2], [x, h / 2, -14 - (i % 2) * 2], i === 2 ? 0x243b3a : 0x17212a, { roughness: .9 });
      for (let row = 0; row < Math.floor(h / 1.15); row++) {
        for (let col = 0; col < Math.max(1, Math.floor(w / .7)); col++) {
          if ((row * 3 + col * 5 + i) % 4 === 0) continue;
          addBox3d(scene, [.25, .32, .03], [x - w / 2 + .35 + col * .65, .75 + row * 1.05, -12.96 - (i % 2) * 2],
            (row + col) % 3 ? 0x547e89 : 0xd7ae69, { emissive: (row + col) % 3 ? 0x1c3741 : 0x5c3c17, emissiveIntensity: .7, castShadow: false });
        }
      }
    });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(.75, 24, 16), new THREE.MeshBasicMaterial({ color: 0xe9e4ca }));
    moon.position.set(5, 8, -15); scene.add(moon);
  }

  function makeCharacter3d(who, x, phase) {
    const outfit = outfitOf(who);
    const actor = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: .72 });
    const top = new THREE.MeshStandardMaterial({ color: outfit.t, roughness: .72 });
    const hair = new THREE.MeshStandardMaterial({ color: outfit.h, roughness: .82 });
    const pants = new THREE.MeshStandardMaterial({ color: outfit.p, roughness: .82 });
    const frontZ = .08;

    addBox3d(actor, [.82, 1.28, .5], [0, 1.55, 0], outfit.t, { roughness: .68 });
    addBox3d(actor, [.32, .24, .08], [0, 2.18, frontZ], 0xe9e5d7, { roughness: .9, castShadow: false });
    addBox3d(actor, [.2, .62, .08], [-.58, 1.55, 0], outfit.t, { roughness: .75 });
    addBox3d(actor, [.2, .62, .08], [.58, 1.55, 0], outfit.t, { roughness: .75 });
    for (const handX of [-.58, .58]) {
      const hand = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), skin);
      hand.position.set(handX, 1.22, .06); actor.add(hand);
    }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.15, .17, .24, 12), skin);
    neck.position.y = 2.28; actor.add(neck);
    const headGroup = new THREE.Group(); headGroup.position.y = 2.68; actor.add(headGroup);
    const eyeMeshes = [];
    const head = new THREE.Mesh(new THREE.SphereGeometry(.43, 24, 18), skin);
    head.position.y = 0; head.castShadow = true; headGroup.add(head);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.45, 24, 14, 0, Math.PI * 2, 0, Math.PI * .58), hair);
    cap.position.y = .13; cap.castShadow = true; headGroup.add(cap);
    for (const eyeX of [-.14, .14]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf7f5ea, roughness: .4 }));
      eye.position.set(eyeX, 0, .365); headGroup.add(eye); eyeMeshes.push(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(.028, 10, 8), new THREE.MeshStandardMaterial({ color: 0x20272a, roughness: .35 }));
      pupil.position.set(eyeX, 0, .423); headGroup.add(pupil); eyeMeshes.push(pupil);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), skin);
    nose.scale.set(.8, 1, .8); nose.position.set(0, -.12, .405); headGroup.add(nose);
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(.105, .014, 6, 18, Math.PI), new THREE.MeshStandardMaterial({ color: 0x704b3a, roughness: .8 }));
    mouth.position.set(0, -.2, .37); mouth.rotation.z = Math.PI; headGroup.add(mouth);

    const legGeo = new THREE.BoxGeometry(.27, .7, .38);
    for (const legX of [-.22, .22]) {
      const leg = new THREE.Mesh(legGeo, pants);
      leg.position.set(legX, .58, 0); actor.add(leg);
    }
    if (who === "boss") {
      const tie = new THREE.Mesh(new THREE.ConeGeometry(.11, .42, 4), new THREE.MeshStandardMaterial({ color: 0xb95745, roughness: .55 }));
      tie.position.set(0, 1.82, .32); tie.rotation.x = .18; actor.add(tie);
    }
    actor.position.set(x, 0, -.78);
    actor.rotation.y = x < 0 ? .08 : -.08;
    actor.userData.bobPhase = phase;
    actor.userData.who = who;
    actor.userData.head = headGroup;
    actor.userData.mouth = mouth;
    actor.userData.eyes = eyeMeshes;
    actor.userData.mats = [skin, top, hair, pants];
    actor.userData.baseX = x;
    actor.userData.nextBlink = 1 + Math.random() * 3;
    return actor;
  }

  function buildWorld3d(sceneData) {
    if (world3d) disposeWorld3d();
    world3d = new THREE.Scene();
    const colors = { serverroom: 0x111820, nightcity: 0x0b111a, deskpov: 0x101a17 };
    world3d.background = new THREE.Color(colors[sceneData.bg] || 0x263936);
    world3d.fog = new THREE.Fog(world3d.background, 24, 48);

    const hemi = new THREE.HemisphereLight(0xfff4df, 0x41494b, sceneData.bg === "serverroom" ? .7 : 1.0);
    world3d.add(hemi);
    const key = new THREE.DirectionalLight(0xffe5c4, 2.2);
    key.position.set(-5, 8, 7); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    world3d.add(key);
    const fill = new THREE.PointLight(sceneData.bg === "serverroom" ? 0x63dfb2 : 0xf2c987, 24, 20, 2);
    fill.position.set(4, 5, 3); world3d.add(fill);
    world3d.userData.fill = fill;
    world3d.userData.fillBase = 24;
    world3d.userData.flicker = sceneData.bg === "serverroom";

    const isOffice = ["bossoffice", "reception", "office"].includes(sceneData.bg);
    if (isOffice) addOffice3d(world3d, sceneData.foreground === "executiveDesk" || sceneData.bg === "bossoffice");
    else if (sceneData.bg === "serverroom") addServerRoom3d(world3d);
    else if (sceneData.bg === "nightcity") addNightCity3d(world3d);
    else addOffice3d(world3d, false);

    if (sceneData.bg === "deskpov") {
      const monitorMaterial = new THREE.MeshStandardMaterial({ color: 0x172c25, emissive: 0x174d37, emissiveIntensity: .7, roughness: .35 });
      addBox3d(world3d, [8.6, .22, 3.4], [0, .82, 0], 0x5c4937, { roughness: .5 });
      addBox3d(world3d, [7.6, 4.5, .3], [0, 3.2, -3], 0x111a17, { roughness: .4 });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.7, 3.1), monitorMaterial);
      screen.position.set(0, 3.35, -2.82); world3d.add(screen);
      for (let i = 0; i < 5; i++) addBox3d(world3d, [3.2 - (i % 2) * .4, .045, .025], [-1.4, 4.25 - i * .42, -2.78], i === 2 ? 0xe9bc63 : 0x74d6a8, { emissive: 0x185b40, emissiveIntensity: .65, castShadow: false });
      camera3d.position.set(0, 3.15, 8.5); camera3d.lookAt(0, 2.5, -2.3);
    } else if (sceneData.bg === "nightcity") {
      camera3d.position.set(0, 5.5, 20); camera3d.lookAt(0, 3.2, -10);
    } else {
      if (sceneData.bg === "serverroom") {
        for (const [index, sprite] of (sceneData.sprites || []).entries()) {
          const x = sprite.pos === "right" ? 2.2 : -2.2;
          const actor = makeCharacter3d(sprite.who, x, index * 1.5);
          world3d.add(actor); actors3d.push(actor);
        }
      } else {
        for (const [index, sprite] of (sceneData.sprites || []).entries()) {
          const x = sprite.pos === "right" ? 2.35 : -2.35;
          const actor = makeCharacter3d(sprite.who, x, index * 1.5);
          world3d.add(actor); actors3d.push(actor);
        }
      }
      camera3d.position.set(0, 3.8, 10.8);
      camera3d.lookAt(0, 2.5, -.35);
    }
    addAtmosphere3d(sceneData);
    const lookFor = { deskpov: [0, 2.5, -2.3], nightcity: [0, 3.2, -10] }[sceneData.bg] || [0, 2.5, -.35];
    camBase = { pos: camera3d.position.clone(), look: new THREE.Vector3(...lookFor) };
    sceneStart = performance.now();
    active3dScene = sceneData;
    active3dPlayerName = state.player.name || "";
    resize3d();
  }

  /* atmosféra: prach v kancelárii, dážď v meste, lietajúce čiastočky v serverovni */
  function addAtmosphere3d(sceneData) {
    if (!world3d || typeof THREE === "undefined") return;
    const bg = sceneData.bg;
    if (bg === "nightcity") {
      const n = 260, pos = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) {
        const x = (Math.random() - .5) * 40, y = Math.random() * 18, z = -2 - Math.random() * 22;
        pos.set([x, y, z, x, y - .7, z], i * 6);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9cc2ff, transparent: true, opacity: .35 }));
      rain.userData.kind = "rain";
      world3d.add(rain);
    } else {
      const n = 90, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) pos.set([(Math.random() - .5) * 16, Math.random() * 7, -3 + Math.random() * 7], i * 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const color = bg === "serverroom" ? 0x63dfb2 : 0xffe2b0;
      const dust = new THREE.Points(g, new THREE.PointsMaterial({ color, size: .045, transparent: true, opacity: .55, depthWrite: false }));
      dust.userData.kind = "dust";
      world3d.add(dust);
    }
  }

  function animate3d() {
    if (overlay.classList.contains("hidden") || !renderer3d || !world3d) { raf3d = null; return; }
    const now = performance.now();
    const time = now / 1000;
    const since = (now - sceneStart) / 1000;
    const talking = !!(typing && !typing.done);

    actors3d.forEach((actor) => {
      const u = actor.userData;
      const speaking = !!speakerWho && u.who === speakerWho;
      const target = speaking ? 1.04 : 1.0;
      const k = actor.scale.x + (target - actor.scale.x) * .12;
      actor.scale.setScalar(k);
      actor.position.y = Math.sin(time * 1.25 + u.bobPhase) * .018;
      // hovoriaci sa mierne nakloní dopredu a hýbe hlavou; ostatní počúvajú
      const lean = speaking ? .05 : 0;
      actor.rotation.x += (lean - actor.rotation.x) * .1;
      if (u.head) {
        const nod = speaking && talking ? Math.sin(time * 9 + u.bobPhase) * .05 : Math.sin(time * .8 + u.bobPhase) * .015;
        u.head.rotation.x = nod;
        u.head.rotation.y = speaking ? Math.sin(time * 1.7) * .09 : (speakerWho ? (u.baseX < 0 ? -.18 : .18) : 0);  // ostatní sa pozerajú na rečníka
      }
      if (u.mouth) u.mouth.scale.y = speaking && talking ? .6 + Math.abs(Math.sin(time * 16 + u.bobPhase)) * 1.9 : 1;
      // žmurkanie
      if (u.eyes && time > u.nextBlink) {
        u.eyes.forEach((e) => { e.scale.y = .08; });
        if (time > u.nextBlink + .13) { u.eyes.forEach((e) => { e.scale.y = 1; }); u.nextBlink = time + 2.5 + Math.random() * 3.5; }
      }
      // zvýraznenie rečníka jemným teplým svetlom na materiáloch
      (u.mats || []).forEach((m) => { if (m.emissive) { m.emissive.setHex(speaking ? 0x2a1d0c : 0x000000); } });
    });

    // atmosféra
    world3d.children.forEach((o) => {
      if (o.userData.kind === "rain") {
        const a = o.geometry.attributes.position;
        for (let i = 0; i < a.count; i += 2) {
          let y = a.getY(i) - .45;
          if (y < 0) y += 18;
          a.setY(i, y); a.setY(i + 1, y - .7);
        }
        a.needsUpdate = true;
      } else if (o.userData.kind === "dust") {
        const a = o.geometry.attributes.position;
        for (let i = 0; i < a.count; i++) {
          let y = a.getY(i) + .0025 + (i % 5) * .0004;
          if (y > 7) y = 0;
          a.setY(i, y); a.setX(i, a.getX(i) + Math.sin(time * .4 + i) * .0009);
        }
        a.needsUpdate = true;
      }
    });
    const fill = world3d.userData.fill;
    if (fill && world3d.userData.flicker) fill.intensity = world3d.userData.fillBase * (.82 + Math.random() * .22);

    // kamera: pomalý dolly + plynulé natočenie k rečníkovi + otras
    if (camBase) {
      const speaker = actors3d.find((a) => a.userData.who === speakerWho);
      const sx = speaker ? speaker.userData.baseX * .22 : 0;
      const dolly = Math.min(since * .035, .9);
      const tx = camBase.pos.x + sx, tz = camBase.pos.z - dolly;
      camera3d.position.x += (tx - camera3d.position.x) * .04;
      camera3d.position.z += (tz - camera3d.position.z) * .04;
      camera3d.position.y = camBase.pos.y + Math.sin(time * .35) * .04;
      if (now < shakeUntil) {
        const power = (shakeUntil - now) / 450 * .16;
        camera3d.position.x += (Math.random() - .5) * power;
        camera3d.position.y += (Math.random() - .5) * power;
      }
      const lookX = camBase.look.x + sx * .55;
      camera3d.lookAt(lookX, camBase.look.y, camBase.look.z);
    }
    renderer3d.render(world3d, camera3d);
    raf3d = requestAnimationFrame(animate3d);
  }

  function renderThreeScene(sceneData) {
    if (!init3d()) return false;
    const playerName = state.player.name || "";
    if (active3dScene !== sceneData || active3dPlayerName !== playerName) buildWorld3d(sceneData);
    if (!raf3d) raf3d = requestAnimationFrame(animate3d);
    return true;
  }

  function renderScene(scene) {
    povTag.textContent = scene.pov === "1st" ? "◉ 1ST PERSON" : "◎ 3RD PERSON";
    if (renderThreeScene(scene)) return;

    (BACKGROUNDS[scene.bg] || BACKGROUNDS.office)();
    if (scene.pov === "1st") {
      povTag.textContent = "◉ 1ST PERSON";
      drawCinematicFinish(scene);
      return; // no sprites in 1st person
    }
    povTag.textContent = "◎ 3RD PERSON";

    /* kto práve hovorí? → rečník je plne zviditeľný, ostatní stmavený */
    const line = currentLine();
    const activeWho = line ? line.who : null;
    (scene.sprites || []).forEach((sp) => {
      const left = sp.pos === "right";
      const speaking = activeWho === sp.who || (activeWho === "you" && sp.who === "player");
      const speakerIsVisible = (scene.sprites || []).some((sprite) =>
        sprite.who === activeWho || (activeWho === "you" && sprite.who === "player")
      );
      const dim = speakerIsVisible && scene.sprites.length > 1 && !speaking;
      const x = left ? 348 : 122;
      const focus = ctx.createRadialGradient(x, 184, 4, x, 184, speaking ? 112 : 78);
      focus.addColorStop(0, speaking ? "rgba(255, 218, 150, .16)" : "rgba(0, 0, 0, .02)");
      focus.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = focus;
      ctx.fillRect(x - 120, 74, 240, 190);
      drawCharSmooth(ctx, left ? 348 : 122, 362, 340, outfitOf(sp.who), {
        dim,
        look: left ? 1 : -1,      // pozerajú na druhého
        mood: speaking ? undefined : "neutral",
      });
    });
    drawSceneForeground(scene);
    drawCinematicFinish(scene);
  }

  /* ---------- typewriter ---------- */
  function showTitle(scene) {
    if (!scene || !scene.title) return;
    if (!titleEl) {
      titleEl = document.createElement("div");
      titleEl.id = "cs-title";
      stage.appendChild(titleEl);
    }
    const [main, sub] = String(scene.title).split("·").map((t) => t.trim());
    titleEl.innerHTML = escHtml(main) + (sub ? `<small>${escHtml(sub)}</small>` : "");
    titleEl.classList.remove("show");
    void titleEl.offsetWidth;
    titleEl.classList.add("show");
  }

  function doShake() {
    shakeUntil = performance.now() + 450;
    stage.classList.remove("shake");
    void stage.offsetWidth;
    stage.classList.add("shake");
  }

  function currentLine() {
    const sc = scenes[sceneIdx];
    return sc && sc.lines ? sc.lines[lineIdx] : null;
  }

  function showLine() {
    const line = currentLine();
    if (!line) { nextScene(); return; }
    const who = line.who;
    speakerWho = who === "you" ? "player" : (who === "narr" || who === "thought") ? null : who;
    renderScene(scenes[sceneIdx]);
    if (line.shake) doShake();
    inputWrap.classList.add("hidden");
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

  /* ---------- input krok (meno hráča) ---------- */
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
    if (!val) { inputEl.placeholder = "Type your name…"; return; }
    state.player.name = sanitizeName(val);
    state.player.login = val.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
    saveGame();
    inputWrap.classList.add("hidden");
    inputEl.value = "";
    activeInput = null;
    thunk();
    renderScene(scenes[sceneIdx]); // re-render (avatar má meno)
    lineIdx++;
    showLine();
  }

  /* ---------- posun ---------- */
  function advance() {
    if (activeInput) return; // čakáme na meno
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
    showTitle(sc);
    if (sc.input && sc.input.immediate) { startInput(); return; }
    showLine();
  }

  function end() {
    overlay.classList.add("hidden");
    const cb = onDone; onDone = null;
    scenes = [];
    if (cb) cb();
  }

  /* ---------- verejné API ---------- */
  function play(sceneList, done) {
    scenes = sceneList;
    sceneIdx = 0; lineIdx = 0;
    onDone = done;
    overlay.classList.remove("hidden");
    skipBtn.onclick = () => { end(); };
    renderScene(scenes[0]);
    showTitle(scenes[0]);
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
