/* ===== TicketQuest — the office: 3D walkable floor (Three.js, low-poly) ===== */

const NPCS = {
  doris: { label: "Doris Pemberton", role: "Office Admin", outfit: "doris" },
  marek: { label: "Mark Kovac",      role: "Marketing",     outfit: "marek" },
  jana:  { label: "Jane White",      role: "Accounting",    outfit: "jana"  },
  zora:  { label: "Zora",            role: "Your mentor · IT", outfit: "zora" },
  boss:  { label: "Mr. Pixel",       role: "CTO",           outfit: "boss"  },
};

/* ---------- dialogue pools ---------- */
const NPC_LINES = {
  doris: [
    "Oh hi! Quick question — is your password 'password123'? No? Smart. Mine was. Once.",
    "The printer hates me. It only eats MY documents. Everyone else prints fine.",
    "I wrote my password on a sticky note, like, super securely. On the monitor. Don't tell IT.",
    "You're the new IT person, right? So young! Back in my day we had ONE computer for the whole floor.",
  ],
  marek: [
    "Hey! Is the Wi-Fi slow today, or is it just my imagination? ...It's my imagination, isn't it.",
    "I think my PC has a virus. It's definitely a virus. It made a weird noise ONE time.",
    "Can you make Excel open faster? My spreadsheets are important. Very important.",
    "If something breaks, it's not my fault. I just press things until it works. That's normal, right?",
  ],
  jana: [
    "Good morning! I do invoices all day, so if the internet dies, money literally stops moving.",
    "I work from home on Fridays. If the VPN breaks, I will email you. A lot.",
    "You fixed my internet last week? You're basically a wizard. Thank you again.",
    "Tip from accounting: always check twice. Rebooting something twice is still cheaper than one lost invoice.",
  ],
  zora: [
    "Welcome to the floor, {PLAYER}! Your desk is the one by the window — walk up to it and press E to sit down.",
    "Read the SOP Binder before every new type of ticket. Later you won't need it — that's the goal.",
    "The golden rule: what the user says happened is a theory. What the log says happened is a fact.",
    "Don't be afraid to escalate a ticket. Knowing your limits IS a professional skill.",
    "Watch the SLA timers on Tier 1 tickets. Users don't mind waiting for a fix — but HR minds late tickets.",
  ],
  boss: [
    "Hm.",
    "The servers better be running.",
    "I don't do small talk. I do uptime.",
    "Hm. (This one means 'good job'. Probably.)",
  ],
};

/* state-dependent extra lines */
function npcExtraLines(who) {
  const extra = [];
  if (who === "doris") {
    if (state.dorisCount > 0) {
      extra.push(
        `Locked out again? Me? Never. Okay yes. That's like, ${state.dorisCount} times. The coffee here is SO strong.`,
        "New password every time is exhausting. I liked 'doris2019'. It had character."
      );
    }
    if (!state.server.users.doris.active) {
      extra.push("Hmm, my computer says 'account locked'. Sounds like a YOU problem, honestly. 😇");
    }
  }
  if (who === "marek") {
    if (state.resolved.includes(1107)) extra.push("The cable. It was the CABLE. In the wall. I'm still thinking about it.");
    if (state.resolved.includes(1103)) extra.push("My mailbox is clean now. I feel... lighter. Spiritually.");
  }
  if (who === "jana") {
    if (state.resolved.includes(1104)) extra.push("VPN works again! I processed forty invoices from my sofa. Technology!");
  }
  if (who === "zora") {
    if (state.story.nightEvidence) {
      extra.push(
        "You're still here? It's late, {PLAYER}. Go home.",
        "...You found something in the logs? Show me tomorrow. First thing. And {PLAYER} — only me. Not Mr. Pixel. Not yet."
      );
    } else if (state.rank >= 1) {
      extra.push("Tier 1 suits you. Keep the SLA green and the notes long.");
    }
  }
  if (who === "boss" && state.rank >= 2) {
    extra.push("Tier 2. Acceptable. Don't make me say it twice.");
  }
  return extra;
}

/* ---------- chat UI ---------- */
const officeChat = { who: null, lines: [], idx: 0 };

const office = (() => {
  let THREE_OK = typeof THREE !== "undefined";
  let renderer, scene, camera, container;
  let playerGroup, npcs = [], raycaster;
  const SIZE = 30;                 // room width (x), depth 18.75 (z)
  const DEPTH = 18.75;
  const SPEED = 6.5;               // units per second
  const INTERACT_DIST = 2.6;

  /* desks: {x, z, w, d, who?, mine?} in units (converted from the old 32px grid) */
  const desks = [
    { x: 5.8,  z: 5.0, w: 4.7, d: 2.2, who: "doris" },
    { x: 12.0, z: 5.0, w: 4.7, d: 2.2, who: "marek" },
    { x: 5.8,  z: 11.4,w: 4.7, d: 2.2, who: "jana"  },
    { x: 12.0, z: 11.4,w: 4.7, d: 2.2 },
    { x: 19.6, z: 5.0, w: 4.7, d: 2.2 },
    { x: 25.2, z: 4.2, w: 4.1, d: 2.2, who: "boss"  },
    { x: 19.6, z: 11.4,w: 4.7, d: 2.2, mine: true },
  ];
  const zoraSpot = { who: "zora", x: 15.6, z: 13.8 };
  const plants = [ { x: 27.5, z: 14.7 }, { x: 2.0, z: 15.0 } ];

  /* solid rects for collision (x/z, 2D top-down) */
  const solids = [];
  function addSolid(x, z, w, d) { solids.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 }); }

  const player = { x: 22.8, z: 15.6, vx: 0, vz: 0, bob: 0, frame: 0 };
  let near = null;
  let keys = {};
  let clock, rafId = null;

  /* ---------- materials ---------- */
  const MAT = {
    floor:  null, // canvas texture
    wall:   new THREE.MeshStandardMaterial({ color: 0xe9e5f2, roughness: .9 }),
    desk:   new THREE.MeshStandardMaterial({ color: 0xcbb98a, roughness: .8 }),
    deskTop:new THREE.MeshStandardMaterial({ color: 0xd8c79a, roughness: .7 }),
    dark:   new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: .5 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x79c0ff, emissive: 0x3a7bd5, emissiveIntensity: .6, roughness: .3 }),
    metal:  new THREE.MeshStandardMaterial({ color: 0xb9bec9, roughness: .35, metalness: .6 }),
    plant:  new THREE.MeshStandardMaterial({ color: 0x2ea86a, roughness: .8 }),
    pot:    new THREE.MeshStandardMaterial({ color: 0x8c4a2f, roughness: .9 }),
    chair:  new THREE.MeshStandardMaterial({ color: 0x3d3f4d, roughness: .7 }),
    white:  new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: .8 }),
    glass:  new THREE.MeshStandardMaterial({ color: 0x9ec8ff, emissive: 0x9ec8ff, emissiveIntensity: .5, roughness: .1 }),
    /* --- polish wave: new props --- */
    wood:     new THREE.MeshStandardMaterial({ color: 0xb5885e, roughness: .85 }),
    counter:  new THREE.MeshStandardMaterial({ color: 0x9c7a52, roughness: .8 }),
    appliance:new THREE.MeshStandardMaterial({ color: 0x23252d, roughness: .4, metalness: .3 }),
    mugRed:   new THREE.MeshStandardMaterial({ color: 0xd95f43, roughness: .6 }),
    mugBlue:  new THREE.MeshStandardMaterial({ color: 0x4a7fb5, roughness: .6 }),
    mugGreen: new THREE.MeshStandardMaterial({ color: 0x2ea86a, roughness: .6 }),
    cabinet:  new THREE.MeshStandardMaterial({ color: 0x8d9099, roughness: .55, metalness: .35 }),
    server:   new THREE.MeshStandardMaterial({ color: 0x1a1c24, roughness: .5, metalness: .4 }),
    doorDark: new THREE.MeshStandardMaterial({ color: 0x3a3f4d, roughness: .6, metalness: .3 }),
    ceiling:  new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: .95 }),
    lamp:     new THREE.MeshStandardMaterial({ color: 0xfffbe8, emissive: 0xfff3c4, emissiveIntensity: .9, roughness: .4 }),
    ledGreen: new THREE.MeshBasicMaterial({ color: 0x2aff8a }),
    ledAmber: new THREE.MeshBasicMaterial({ color: 0xffb020 }),
    waterBlue:new THREE.MeshStandardMaterial({ color: 0x66b8ff, roughness: .15, metalness: .1 }),
  };

  /* sky seen through the windows (day, soft gradient + sun) */
  function makeColorTexture(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace && "colorSpace" in texture) texture.colorSpace = THREE.SRGBColorSpace;
    else if (THREE.sRGBEncoding !== undefined && "encoding" in texture) texture.encoding = THREE.sRGBEncoding;
    return texture;
  }

  function makeSkyTexture() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, "#6ea8e8"); grad.addColorStop(.55, "#a7cdf5"); grad.addColorStop(1, "#e8f2fc");
    g.fillStyle = grad; g.fillRect(0, 0, 256, 128);
    g.fillStyle = "rgba(255,250,220,.95)";
    g.beginPath(); g.arc(196, 34, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,255,255,.75)";
    for (const [x, y, s] of [[52,40,26],[92,58,20],[150,44,24],[228,72,18]]) {
      g.beginPath(); g.ellipse(x, y, s, s * .42, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x + s * .7, y + 3, s * .7, s * .3, 0, 0, Math.PI * 2); g.fill();
    }
    return makeColorTexture(c);
  }

  /* PIXL Corp wall poster */
  function makePosterTexture() {
    const c = document.createElement("canvas"); c.width = 128; c.height = 160;
    const g = c.getContext("2d");
    g.fillStyle = "#2f2a22"; g.fillRect(0, 0, 128, 160);
    g.fillStyle = "#f2ead8"; g.fillRect(6, 6, 116, 148);
    g.fillStyle = "#4d7266"; g.fillRect(6, 6, 116, 54);
    g.fillStyle = "#f2ead8"; g.font = "800 26px 'Segoe UI'"; g.textAlign = "center";
    g.fillText("PIXL", 64, 34);
    g.font = "600 11px 'Segoe UI'"; g.fillText("CORP", 64, 50);
    g.fillStyle = "#2f2a22"; g.font = "700 13px 'Segoe UI'";
    g.fillText("RESET. REBOOT.", 64, 84);
    g.fillText("REPEAT.", 64, 100);
    g.fillStyle = "#e8823c"; g.fillRect(30, 116, 68, 8);
    g.fillStyle = "#2f2a22"; g.font = "600 9px 'Segoe UI'";
    g.fillText("IT CAREERS · FLOOR 3", 64, 142);
    return makeColorTexture(c);
  }

  function makeMonitorTexture() {
    const c = document.createElement("canvas"); c.width = 512; c.height = 320;
    const g = c.getContext("2d");
    g.fillStyle = "#111916"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#26352f"; g.fillRect(0, 0, 512, 38);
    g.fillStyle = "#9de2c7"; g.font = "700 18px Segoe UI";
    g.fillText("PIXL CORP  /  IT SERVICE DESK", 20, 25);
    g.fillStyle = "#18221e"; g.fillRect(0, 38, 112, 282);
    g.fillStyle = "#84bba5"; g.font = "600 14px Segoe UI";
    for (const [label, y] of [["INBOX", 72], ["TICKETS", 108], ["USERS", 144], ["SYSTEM", 180]]) {
      g.fillText(label, 18, y);
    }
    g.fillStyle = "#26352f"; g.fillRect(132, 58, 360, 42);
    g.fillStyle = "#d9e7df"; g.font = "600 15px Segoe UI";
    g.fillText("Service queue", 148, 84);
    g.fillStyle = "#62d9c0"; g.fillRect(414, 72, 58, 14);
    g.fillStyle = "#14231e"; g.font = "700 10px Segoe UI";
    g.fillText("ONLINE", 423, 83);
    const rows = ["INC-1042   Account access", "INC-1043   Printer offline", "INC-1044   Network review"];
    rows.forEach((row, i) => {
      const y = 124 + i * 48;
      g.fillStyle = i === 0 ? "#1c2b26" : "#17211d";
      g.fillRect(132, y, 360, 40);
      g.fillStyle = i === 0 ? "#f2c56b" : "#b8c8bf";
      g.font = "13px Segoe UI";
      g.fillText(row, 146, y + 25);
    });
    g.fillStyle = "#31453c"; g.fillRect(132, 280, 248, 8);
    g.fillStyle = "#62d9c0"; g.fillRect(132, 280, 174, 8);
    const texture = makeColorTexture(c);
    texture.anisotropy = 4;
    return texture;
  }

  /* round rug under the open-space */
  function makeRugTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#4d7266"; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "rgba(242,234,216,.28)"; g.lineWidth = 10;
    g.beginPath(); g.arc(128, 128, 108, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(128, 128, 74, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "rgba(242,234,216,.16)";
    g.beginPath(); g.arc(128, 128, 40, 0, Math.PI * 2); g.fill();
    const tex = makeColorTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function makeFloorTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const boards = ["#887a5e", "#918268", "#83765a", "#97876b"];
    for (let row = 0; row < 4; row++) {
      const y = row * 64;
      const offset = row % 2 ? 32 : 0;
      for (let x = -64 + offset; x < 256; x += 64) {
        g.fillStyle = boards[(row + Math.floor((x + 64) / 64)) % boards.length];
        g.fillRect(x, y, 64, 64);
        g.fillStyle = "rgba(255,255,255,.035)";
        for (let grain = 0; grain < 5; grain++) {
          g.fillRect(x + 7, y + 10 + grain * 11, 48, 1);
        }
        g.strokeStyle = "rgba(27,24,18,.2)";
        g.lineWidth = 2;
        g.strokeRect(x + 1, y + 1, 62, 62);
      }
    }
    const tex = makeColorTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 5);
    return tex;
  }

  /* ---------- characters ---------- */
  function makeCharacter(outfit, sitting) {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: .7 });
    const top = new THREE.MeshStandardMaterial({ color: new THREE.Color(outfit.t), roughness: .7 });
    const hair = new THREE.MeshStandardMaterial({ color: new THREE.Color(outfit.h), roughness: .8 });
    const pants = new THREE.MeshStandardMaterial({ color: new THREE.Color(outfit.p), roughness: .8 });

    const bodyH = sitting ? 0.62 : 0.78;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, bodyH, 0.34), top);
    body.position.y = sitting ? 0.31 : 0.39 + (sitting ? 0.45 : 0);
    body.castShadow = true; body.userData.hit = true;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), skin);
    head.position.y = (sitting ? 0.31 : 0.39) + bodyH / 2 + 0.24;
    head.castShadow = true; head.userData.hit = true;
    g.add(head);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x25252b, roughness: .8 });
    for (const eyeX of [-0.08, 0.08]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeMat);
      eye.position.set(eyeX, head.position.y + 0.015, 0.255);
      g.add(eye);
    }
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.16, 0.025),
      new THREE.MeshStandardMaterial({ color: 0xf5c451, metalness: .25, roughness: .45 })
    );
    badge.position.set(0.14, body.position.y + 0.06, 0.18);
    g.add(badge);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    cap.position.y = head.position.y + 0.03;
    g.add(cap);

    if (!sitting) {
      const legGeo = new THREE.BoxGeometry(0.18, 0.5, 0.2);
      const l1 = new THREE.Mesh(legGeo, pants); l1.position.set(-0.15, 0.25, 0);
      const l2 = new THREE.Mesh(legGeo, pants); l2.position.set(0.15, 0.25, 0);
      l1.castShadow = l2.castShadow = true;
      g.add(l1, l2);
      const armGeo = new THREE.BoxGeometry(0.13, 0.5, 0.16);
      const a1 = new THREE.Mesh(armGeo, top); a1.position.set(-0.36, 0.45, 0);
      const a2 = new THREE.Mesh(armGeo, top); a2.position.set(0.36, 0.45, 0);
      a1.castShadow = a2.castShadow = true;
      g.add(a1, a2);
      g.userData.walkParts = { leftLeg: l1, rightLeg: l2, leftArm: a1, rightArm: a2 };
    }
    return g;
  }

  function makeNameSprite(text) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(20,22,30,.82)";
    const w = g.measureText(text).width;
    g.font = "600 30px 'Segoe UI'";
    const tw = Math.max(90, g.measureText(text).width + 36);
    g.beginPath();
    if (g.roundRect) g.roundRect(128 - tw / 2, 8, tw, 44, 22); else g.rect(128 - tw / 2, 8, tw, 44);
    g.fill();
    g.fillStyle = "#f2ead8";
    g.font = "600 30px 'Segoe UI'";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, 128, 31);
    const tex = makeColorTexture(c);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    spr.scale.set(2.4, 0.6, 1);
    spr.renderOrder = 10;
    return spr;
  }

  /* ---------- furniture ---------- */
  function makeDesk(d) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(d.w, 0.12, d.d), MAT.deskTop);
    top.position.y = 0.78; top.castShadow = true; top.receiveShadow = true;
    g.add(top);
    const legGeo = new THREE.BoxGeometry(0.12, 0.78, 0.12);
    for (const [lx, lz] of [[-d.w/2+.2, -d.d/2+.2], [d.w/2-.2, -d.d/2+.2], [-d.w/2+.2, d.d/2-.2], [d.w/2-.2, d.d/2-.2]]) {
      const leg = new THREE.Mesh(legGeo, MAT.desk);
      leg.position.set(lx, 0.39, lz);
      g.add(leg);
    }
    // monitor
    const mon = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.9, 0.07), MAT.dark);
    mon.position.set(0, 1.35, -d.d / 2 + 0.28); mon.castShadow = true;
    g.add(mon);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), MAT.screen);
    scr.position.set(0, 1.35, -d.d / 2 + 0.32);
    g.add(scr);
    // keyboard
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.32), MAT.white);
    kb.position.set(0, 0.88, 0.25);
    g.add(kb);
    // mug + paper clutter (random per desk)
    const mugMats = [MAT.mugRed, MAT.mugBlue, MAT.mugGreen];
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.18, 10), mugMats[Math.floor(Math.random() * 3)]);
    mug.position.set(d.w / 2 - 0.6, 0.93, d.d / 2 - 0.45); mug.castShadow = true;
    g.add(mug);
    const sheets = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.58), new THREE.MeshStandardMaterial({ color: 0xfaf6ec, roughness: .9 }));
    sheets.position.set(-d.w / 2 + 0.55, 0.85, d.d / 2 - 0.4);
    sheets.rotation.y = Math.random() * 0.4 - 0.2;
    g.add(sheets);
    // chair (in front of desk)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.6), MAT.chair);
    seat.position.set(0, 0.55, d.d / 2 + 0.55); seat.castShadow = true;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.65, 0.12), MAT.chair);
    back.position.set(0, 0.95, d.d / 2 + 0.82); back.castShadow = true;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), MAT.dark);
    pole.position.set(0, 0.3, d.d / 2 + 0.55);
    g.add(seat, back, pole);

    g.position.set(d.x, 0, d.z);
    return g;
  }

  function makePlant(p) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.5, 10), MAT.pot);
    pot.position.y = 0.25; pot.castShadow = true;
    g.add(pot);
    for (const [ox, oy, s] of [[0, 1.0, 0.55], [-0.3, 0.8, 0.4], [0.3, 0.85, 0.42]]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), MAT.plant);
      leaf.position.set(ox, oy, 0); leaf.castShadow = true;
      g.add(leaf);
    }
    g.position.set(p.x, 0, p.z);
    return g;
  }

  /* ---------- polish wave: new props ---------- */
  function makeCoffeeCorner() {
    const g = new THREE.Group();
    // counter along the left wall
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.95, 3.4), MAT.counter);
    base.position.y = 0.475; base.castShadow = true; base.receiveShadow = true;
    g.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 3.55), MAT.deskTop);
    top.position.y = 0.985; top.castShadow = true;
    g.add(top);
    // coffee machine
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.55), MAT.appliance);
    body.position.set(0, 1.4, -1.0); body.castShadow = true;
    g.add(body);
    const drip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.35), MAT.mugRed);
    drip.position.set(0, 1.12, -0.95);
    g.add(drip);
    // mugs on the counter
    for (const [mz, m] of [[0.1, MAT.mugBlue], [0.6, MAT.mugGreen], [1.1, MAT.mugRed]]) {
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.2, 10), m);
      mug.position.set(0.18, 1.12, mz); mug.castShadow = true;
      g.add(mug);
    }
    // cookie plate
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 14), MAT.white);
    plate.position.set(0.15, 1.06, 1.55);
    g.add(plate);
    g.position.set(1.15, 0, 8.4);
    return g;
  }

  function makePrinterStand() {
    const g = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.0), MAT.cabinet);
    cab.position.y = 0.425; cab.castShadow = true; cab.receiveShadow = true;
    g.add(cab);
    const printer = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.8), MAT.white);
    shell.position.y = 0.28; shell.castShadow = true;
    printer.add(shell);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.65), MAT.appliance);
    lid.position.set(0, 0.6, -0.02); lid.castShadow = true;
    printer.add(lid);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.3), new THREE.MeshStandardMaterial({ color: 0xfaf6ec, roughness: .9 }));
    tray.position.set(0, 0.14, 0.45);
    printer.add(tray);
    printer.position.y = 0.85;
    g.add(printer);
    // a couple of sheets on the cabinet
    for (let i = 0; i < 3; i++) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.008, 0.5), new THREE.MeshStandardMaterial({ color: 0xfaf6ec, roughness: .9 }));
      sheet.position.set(-0.5 + Math.random() * 0.3, 0.9 + i * 0.01, -0.25 + Math.random() * 0.15);
      sheet.rotation.y = Math.random() * 0.5 - 0.25;
      g.add(sheet);
    }
    g.position.set(28.0, 0, 9.2);
    return g;
  }

  function makeWaterCooler() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.25, 0.5), MAT.white);
    body.position.y = 0.625; body.castShadow = true;
    g.add(body);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.5, 12), MAT.waterBlue);
    bottle.position.y = 1.5; bottle.castShadow = true;
    g.add(bottle);
    const tap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), MAT.waterBlue);
    tap.position.set(0, 0.95, 0.27);
    g.add(tap);
    g.position.set(17.9, 0, 16.9);
    return g;
  }

  /* server room door on the left wall + blinking LEDs */
  const serverLeds = [];
  function makeServerDoor() {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.7, 2.0), MAT.doorDark);
    frame.position.set(0, 1.35, 0); frame.castShadow = true;
    g.add(frame);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 1.7), MAT.server);
    door.position.set(0.12, 1.25, 0);
    g.add(door);
    // SERVER ROOM sign
    const signC = document.createElement("canvas"); signC.width = 256; signC.height = 64;
    const sg = signC.getContext("2d");
    sg.fillStyle = "#1a1c24"; sg.fillRect(0, 0, 256, 64);
    sg.fillStyle = "#2aff8a"; sg.font = "800 30px Consolas, monospace";
    sg.textAlign = "center"; sg.textBaseline = "middle";
    sg.fillText("SERVER ROOM", 128, 34);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.42),
      new THREE.MeshBasicMaterial({ map: makeColorTexture(signC) })
    );
    sign.rotation.y = Math.PI / 2;
    sign.position.set(0.28, 2.85, 0);
    g.add(sign);
    // LED strips on the door
    for (let i = 0; i < 6; i++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), i % 3 === 2 ? MAT.ledAmber : MAT.ledGreen);
      led.position.set(0.22, 1.9 - i * 0.22, 0.55);
      g.add(led);
      serverLeds.push({ mesh: led, phase: i * 0.7 });
    }
    g.position.set(0.2, 0, 3.4);
    g.rotation.y = -Math.PI / 2;
    return g;
  }

  /* ceiling with recessed light panels + warm point lights */
  const roomLights = [];
  function makeCeiling() {
    const g = new THREE.Group();
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, DEPTH), MAT.ceiling);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.2;
    g.add(ceil);
    // lamp grid
    for (let lx = 4; lx < SIZE - 2; lx += 7.5) {
      for (let lz = 3.5; lz < DEPTH - 2; lz += 6.5) {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), MAT.lamp);
        panel.rotation.x = Math.PI / 2;
        panel.position.set(lx, 3.17, lz);
        g.add(panel);
        const pl = new THREE.PointLight(0xfff0d8, 14, 9, 1.8);
        pl.position.set(lx, 3.0, lz);
        g.add(pl);
        roomLights.push(pl);
      }
    }
    return g;
  }

  /* ---------- scene build ---------- */
  function build() {
    container = document.getElementById("office-3d");
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (renderer.outputColorSpace !== undefined && THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    if (THREE.ACESFilmicToneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    MAT.screen.map = makeMonitorTexture();
    MAT.screen.color.set(0xffffff);
    MAT.screen.emissive.set(0x173b30);
    MAT.screen.emissiveIntensity = 0.35;
    MAT.screen.needsUpdate = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111614);

    camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 120);
    camera.position.set(player.x, 9.5, player.z + 10);

    // lights — ceiling panels do most of the work, hemi+sun fill and shade
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x6b7280, 0.55);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.15);
    sun.position.set(12, 20, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
    scene.add(sun);

    // floor
    const floorTex = makeFloorTexture();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(SIZE, DEPTH),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: .95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // outer floor (beyond walls, for windows view)
    const outer = new THREE.Mesh(
      new THREE.PlaneGeometry(SIZE + 60, DEPTH + 60),
      new THREE.MeshBasicMaterial({ color: 0x111614 })
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.02;
    scene.add(outer);

    // walls
    const wallH = 3.2, t = 0.3;
    const mkWall = (w, h, d, x, y, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MAT.wall);
      m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = true;
      scene.add(m);
      addSolid(x, z, w + 0.4, d + 0.4);
    };
    mkWall(SIZE, wallH, t, SIZE / 2, wallH / 2, 0);                 // back (north, z=0)
    mkWall(SIZE, wallH, t, SIZE / 2, wallH / 2, DEPTH);            // front (south, z=DEPTH)
    mkWall(t, wallH, DEPTH, 0, wallH / 2, DEPTH / 2);              // left
    mkWall(t, wallH, DEPTH, SIZE, wallH / 2, DEPTH / 2);           // right

    // windows on north wall — sky visible through them
    const skyTex = makeSkyTexture();
    for (const wx of [5, 12, 19]) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 1.7),
        new THREE.MeshBasicMaterial({ map: skyTex })
      );
      win.position.set(wx, 1.85, 0.2);
      scene.add(win);
      // window frame
      const fr = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.9, 0.08), MAT.wall);
      fr.position.set(wx, 1.85, 0.14); fr.receiveShadow = true;
      scene.add(fr);
      const frIn = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.8), new THREE.MeshBasicMaterial({ color: 0x2f2a22 }));
      frIn.position.set(wx, 1.85, 0.185);
      scene.add(frIn);
      // whiteboards between windows
      const wb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.15), MAT.white);
      wb.position.set(wx + 3.6, 1.9, 0.2);
      scene.add(wb);
    }
    // posters on the south wall
    const posterMat = new THREE.MeshStandardMaterial({ map: makePosterTexture(), roughness: .85 });
    for (const px of [8.5, 22.5]) {
      const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.62), posterMat);
      poster.position.set(px, 1.9, DEPTH - 0.21);
      poster.rotation.y = Math.PI;
      scene.add(poster);
    }

    // ceiling + warm interior lights
    scene.add(makeCeiling());

    // coffee corner (left wall) + printer (right wall) + water cooler (south)
    scene.add(makeCoffeeCorner());
    addSolid(1.15, 8.4, 2.0, 4.2);
    scene.add(makePrinterStand());
    addSolid(28.0, 9.2, 1.8, 1.3);
    scene.add(makeWaterCooler());
    addSolid(17.9, 16.9, 0.8, 0.8);

    // server room door (left wall, north end)
    scene.add(makeServerDoor());
    addSolid(0.4, 3.4, 1.2, 2.2);

    // round rug in the open-space middle
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 40),
      new THREE.MeshStandardMaterial({ map: makeRugTexture(), roughness: 1 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(15.2, 0.012, 8.2);
    rug.receiveShadow = true;
    scene.add(rug);

    // elevator on south wall (right side)
    const elev = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 0.15), MAT.metal);
    elev.position.set(SIZE - 5, 1.25, DEPTH - 0.1);
    scene.add(elev);
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.06), MAT.metal);
    doorL.position.set(SIZE - 5.6, 1.25, DEPTH - 0.28);
    const doorR = doorL.clone(); doorR.position.x = SIZE - 4.4;
    scene.add(doorL, doorR);

    // desks + NPCs
    for (const d of desks) {
      scene.add(makeDesk(d));
      addSolid(d.x, d.z, d.w, d.d + 1.5); // include chair area
      if (d.who) {
        const ch = makeCharacter(outfitOf(NPCS[d.who].outfit), true);
        ch.position.set(d.x, 0, d.z - d.d / 2 - 0.35);
        ch.rotation.y = Math.PI; // face the desk/room
        const ns = makeNameSprite(NPCS[d.who].label.split(" ")[0]);
        ns.position.y = 2.15;
        ch.add(ns);
        scene.add(ch);
        npcs.push({ who: d.who, x: d.x, z: d.z + 0.6, group: ch, bob: Math.random() * 6 });
      }
    }
    // Zora standing
    {
      const ch = makeCharacter(outfitOf(NPCS.zora.outfit), false);
      ch.position.set(zoraSpot.x, 0, zoraSpot.z);
      const ns = makeNameSprite("Zora"); ns.position.y = 2.3;
      ch.add(ns);
      scene.add(ch);
      npcs.push({ who: "zora", x: zoraSpot.x, z: zoraSpot.z, group: ch, bob: Math.random() * 6 });
    }
    // plants
    plants.forEach((p) => { scene.add(makePlant(p)); addSolid(p.x, p.z, 0.7, 0.7); });

    // player
    playerGroup = makeCharacter(playerOutfit(), false);
    playerGroup.position.set(player.x, 0, player.z);
    scene.add(playerGroup);
    // golden marker ring under player
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.05, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xf5c451 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    playerGroup.add(ring);

    raycaster = new THREE.Raycaster();
    clock = new THREE.Clock();
  }

  /* ---------- collision ---------- */
  function blocked(nx, nz) {
    const r = 0.32;
    for (const s of solids) {
      if (nx + r > s.x0 && nx - r < s.x1 && nz + r > s.z0 && nz - r < s.z1) return true;
    }
    return false;
  }

  function findNear() {
    near = null;
    let best = INTERACT_DIST;
    for (const n of npcs) {
      const dist = Math.hypot(player.x - n.x, player.z - n.z);
      if (dist < best) {
        best = dist;
        near = { type: "npc", who: n.who };
      }
    }
    for (const d of desks) {
      if (!d.mine) continue;
      const dist = Math.hypot(player.x - d.x, player.z - (d.z + 1.8));
      if (dist < best) {
        best = dist;
        near = { type: "desk" };
      }
    }
    const p = document.getElementById("office-prompt");
    const txt = document.getElementById("office-prompt-text");
    if (!near) { p.classList.add("hidden"); return; }
    p.classList.remove("hidden");
    txt.textContent = near.type === "desk" ? "Sit down at your desk"
      : `Talk to ${NPCS[near.who].label.split(" ")[0]}`;
  }

  /* ---------- loop ---------- */
  function animate() {
    rafId = requestAnimationFrame(animate);
    if (document.getElementById("office-view").classList.contains("hidden")) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    let dx = 0, dz = 0;
    if (keys.ArrowLeft || keys.a) dx -= 1;
    if (keys.ArrowRight || keys.d) dx += 1;
    if (keys.ArrowUp || keys.w) dz -= 1;
    if (keys.ArrowDown || keys.s) dz += 1;
    const moving = dx !== 0 || dz !== 0;
    if (moving) {
      const len = Math.hypot(dx, dz);
      const nx = player.x + (dx / len) * SPEED * dt;
      const nz = player.z + (dz / len) * SPEED * dt;
      if (!blocked(nx, player.z)) player.x = nx;
      if (!blocked(player.x, nz)) player.z = nz;
      player.x = Math.max(0.8, Math.min(SIZE - 0.8, player.x));
      player.z = Math.max(0.8, Math.min(DEPTH - 0.8, player.z));
      const targetYaw = Math.atan2(dx, dz);
      const yawDelta = Math.atan2(
        Math.sin(targetYaw - playerGroup.rotation.y),
        Math.cos(targetYaw - playerGroup.rotation.y)
      );
      playerGroup.rotation.y += yawDelta * Math.min(1, dt * 14);
      player.bob += dt * 10;
    }
    const walkParts = playerGroup.userData.walkParts;
    if (walkParts) {
      const swing = moving ? Math.sin(player.bob) * 0.38 : 0;
      const blend = Math.min(1, dt * 12);
      walkParts.leftLeg.rotation.x += (swing - walkParts.leftLeg.rotation.x) * blend;
      walkParts.rightLeg.rotation.x += (-swing - walkParts.rightLeg.rotation.x) * blend;
      walkParts.leftArm.rotation.x += (-swing * 0.65 - walkParts.leftArm.rotation.x) * blend;
      walkParts.rightArm.rotation.x += (swing * 0.65 - walkParts.rightArm.rotation.x) * blend;
    }
    playerGroup.position.set(player.x, moving ? Math.abs(Math.sin(player.bob)) * 0.08 : 0, player.z);

    // NPCs idle sway
    const t = clock.elapsedTime;
    for (const n of npcs) {
      n.group.rotation.y = Math.sin(t * 0.6 + n.bob) * 0.12 + (n.who === "zora" ? 0 : Math.PI);
    }

    // camera follow (fixed-angle third person, slightly closer)
    const camTargetX = player.x, camTargetZ = player.z + 7.2;
    camera.position.x += (camTargetX - camera.position.x) * Math.min(1, dt * 4);
    camera.position.z += (camTargetZ - camera.position.z) * Math.min(1, dt * 4);
    camera.position.y = 7.6;
    camera.lookAt(player.x, 1, player.z - 1);

    // server LEDs heartbeat
    for (const led of serverLeds) {
      const on = Math.sin(t * 3 + led.phase) > 0;
      led.mesh.visible = on;
    }

    findNear();
    renderer.render(scene, camera);
  }

  function resize() {
    if (!renderer) return;
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- interaction ---------- */
  function interact() {
    if (!near) return;
    if (near.type === "npc") talk(near.who);
    else os.boot();
  }

  /* ---------- talking ---------- */
  function talk(who) {
    SFX.click();
    officeChat.who = who;
    officeChat.lines = [...NPC_LINES[who], ...npcExtraLines(who)];
    officeChat.idx = 0;
    chatShowLine();
  }

  function chatShowLine() {
    document.getElementById("chat-name").textContent = officeChat.who ? NPCS[officeChat.who].label : "";
    document.getElementById("chat-text").textContent = officeChat.lines[officeChat.idx] || "";
    document.getElementById("chat-next").textContent =
      officeChat.idx >= officeChat.lines.length - 1 ? "END TALK ▸" : "NEXT ▸";
    document.getElementById("office-chat").classList.remove("hidden");
  }

  function chatNext() {
    SFX.click();
    if (officeChat.idx >= officeChat.lines.length - 1) { chatClose(); return; }
    officeChat.idx++;
    chatShowLine();
  }

  function chatClose() {
    document.getElementById("office-chat").classList.add("hidden");
    officeChat.who = null;
  }

  /* ---------- badge ---------- */
  function updateBadge() {
    const pending = [...TICKETS, ...(state.dorisTickets || []), ...(state.grindTickets || [])].filter(
      (t) => ticketVisible(t) && !state.resolved.includes(t.id) && !state.escalated.includes(t.id)
    ).length;
    const pill = document.getElementById("office-tickets");
    if (pill) pill.textContent = pending > 0 ? `🎫 WORK YOUR TICKET · ${pending} WAITING` : "🎫 ALL TICKETS DONE ✔";
  }

  /* ---------- input ---------- */
  function onKey(e, down) {
    if (document.getElementById("office-view").classList.contains("hidden")) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","w","a","s","d"," "].includes(k)) e.preventDefault();
    keys[k] = down;
    if (down && k === "e") interact();
    if (down && k === "Enter" && !document.getElementById("office-chat").classList.contains("hidden")) chatNext();
  }
  const kd = (e) => onKey(e, true);
  const ku = (e) => onKey(e, false);

  /* click → raycast NPC */
  function onClick(e) {
    if (document.getElementById("office-view").classList.contains("hidden")) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const m = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(m, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    for (const h of hits) {
      if (!h.object.userData.hit) continue;
      // find which NPC owns this mesh
      for (const n of npcs) {
        if (n.group.children.includes(h.object)) {
          if (Math.hypot(player.x - n.x, player.z - n.z) < INTERACT_DIST + 1.5) talk(n.who);
          return;
        }
      }
    }
  }

  function init() {
    if (!THREE_OK) { console.error("Three.js missing — 3D office unavailable"); return; }
    build();
    resize();
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("resize", resize);
    renderer.domElement.addEventListener("click", onClick);
    document.getElementById("chat-next").addEventListener("click", chatNext);
    document.getElementById("chat-close").addEventListener("click", () => { SFX.click(); chatClose(); });
    document.getElementById("office-tickets").addEventListener("click", () => os.boot());
    updateBadge();
    if (!rafId) animate();
  }

  return { init, updateBadge, draw: () => {}, talk };
})();
