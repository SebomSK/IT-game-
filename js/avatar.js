/* ===== TicketQuest — pixel-art postavy a avatar hráča ===== */

/* sprite 12x14: h=vlas s=pokoa e=oko m=usta t=top p=nohavice o=topánky */
const SPRITE = [
  "....hhhh....",
  "...hhhhhh...",
  "...hhhhhh...",
  "..ssssssss..",
  "..ssessess..",
  "..ssssssss..",
  "...ssmmss...",
  "...tttttt...",
  "..tttttttt..",
  ".stttttttts.",
  ".stttttttts.",
  "..pppppppp..",
  "..pp....pp..",
  "..oo....oo..",
];

const PALETTE = {
  s: "#e8b98a",
  e: "#1a1a2e",
  m: "#8c4a2f",
};

function hashName(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

const OUTFITS = [
  { h: "#4a3728", t: "#54e8b1", p: "#2b3a67", o: "#222" },
  { h: "#7b3f00", t: "#ffd45e", p: "#33334d", o: "#111" },
  { h: "#222",     t: "#ff6b8b", p: "#28304a", o: "#333" },
  { h: "#c96a2b", t: "#7d9bff", p: "#2b3a67", o: "#222" },
  { h: "#111",     t: "#b98cff", p: "#243b55", o: "#111" },
];

function playerOutfit() {
  const n = (state.player && state.player.name) || "";
  return OUTFITS[hashName(n) % OUTFITS.length];
}

/* jednoduchá paleta NPC postáv */
const CHARACTERS = {
  zora: { h: "#2ea8a0", t: "#7d4ba8", p: "#28304a", o: "#111" },
  boss: { h: "#9aa0a6", t: "#3d3d55", p: "#22222e", o: "#111" },
  doris: { h: "#8a5a2b", t: "#ff9db1", p: "#5b3a6e", o: "#333" },
  marek: { h: "#222222", t: "#7d9bff", p: "#2b3a67", o: "#111" },
  jana: { h: "#c96a2b", t: "#54e8b1", p: "#28304a", o: "#111" },
  player: () => playerOutfit(),
};

function outfitOf(who) {
  if (who === "player") return playerOutfit();
  return CHARACTERS[who] || OUTFITS[0];
}

/* vykreslí sprite na canvas; frame=1 → ruky na stole (písanie) */
function drawChar(ctx, x, y, scale, outfit, frame = 0) {
  const cmap = { ...PALETTE, h: outfit.h, t: outfit.t, p: outfit.p, o: outfit.o };
  SPRITE.forEach((row, ry) => {
    let r = row;
    if (frame === 1 && (ry === 9 || ry === 10)) r = ".tttttttttt."; // ruky dole — písanie
    [...r].forEach((ch, rx) => {
      if (ch === ".") return;
      ctx.fillStyle = cmap[ch] || "#f0f";
      ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
    });
  });
}

/* ===== vektorová postava (cutscény — žiadne pixely) =====
   Kreslí stojacu postavu: baseline = chodidlá, h = výška celej postavy.
   V cutscénach sa kreslí väčšia, než plátno — spodok sa prirodzene oreže
   a vznikne "bust" kompozícia ako vo visual novelách. */
function shade(hex, amt) {
  // amt -1..1: <0 tmavšie, >0 svetlejšie
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function drawCharSmooth(ctx, cx, feetY, h, outfit, opts = {}) {
  if (opts.dim) ctx.globalAlpha = 0.45;
  const u = h / 170;              // jednotka: postava 170 "cm"
  const skin = opts.skin || "#e8b98a";

  // tieň na podlahe
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath();
  ctx.ellipse(cx, feetY - 3 * u, 26 * u, 6 * u, 0, 0, Math.PI * 2);
  ctx.fill();

  // nohavice (nohy)
  ctx.fillStyle = outfit.p;
  const legW = 13 * u, legH = 58 * u;
  ctx.beginPath(); ctx.roundRect(cx - legW - 2 * u, feetY - legH, legW, legH, 5 * u); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx + 2 * u, feetY - legH, legW, legH, 5 * u); ctx.fill();
  // topánky
  ctx.fillStyle = outfit.o || "#222";
  ctx.beginPath(); ctx.roundRect(cx - legW - 4 * u, feetY - 10 * u, legW + 5 * u, 10 * u, 4 * u); ctx.fill();
  ctx.beginPath(); ctx.roundRect(cx - 1 * u, feetY - 10 * u, legW + 5 * u, 10 * u, 4 * u); ctx.fill();

  // trup (top) — mierne rozšírený, zaoblený
  const bodyW = 46 * u, bodyH = 66 * u, bodyY = feetY - legH - bodyH;
  const torso = ctx.createLinearGradient(cx, bodyY, cx, bodyY + bodyH);
  torso.addColorStop(0, shade(outfit.t, .18));
  torso.addColorStop(1, outfit.t);
  ctx.fillStyle = torso;
  ctx.beginPath(); ctx.roundRect(cx - bodyW / 2, bodyY, bodyW, bodyH + 12 * u, 16 * u); ctx.fill();

  // golier
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.beginPath();
  ctx.moveTo(cx - 9 * u, bodyY);
  ctx.lineTo(cx, bodyY + 12 * u);
  ctx.lineTo(cx + 9 * u, bodyY);
  ctx.closePath(); ctx.fill();

  // ruky
  ctx.strokeStyle = shade(outfit.t, -.08);
  ctx.lineWidth = 11 * u; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - bodyW / 2 + 4 * u, bodyY + 14 * u);
  ctx.quadraticCurveTo(cx - bodyW / 2 - 10 * u, bodyY + 40 * u, cx - bodyW / 2 + 1 * u, bodyY + 62 * u);
  ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + bodyW / 2 - 4 * u, bodyY + 14 * u);
  ctx.quadraticCurveTo(cx + bodyW / 2 + 10 * u, bodyY + 40 * u, cx + bodyW / 2 - 1 * u, bodyY + 62 * u);
  ctx.stroke();
  // dlane
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(cx - bodyW / 2 + 1 * u, bodyY + 68 * u, 6.5 * u, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + bodyW / 2 - 1 * u, bodyY + 68 * u, 6.5 * u, 0, Math.PI * 2); ctx.fill();

  // krk + hlava
  const headR = 21 * u, headCY = bodyY - headR - 4 * u;
  ctx.fillStyle = skin;
  ctx.fillRect(cx - 7 * u, headCY + headR - 6 * u, 14 * u, 12 * u);   // krk
  const face = ctx.createRadialGradient(cx - 6 * u, headCY - 8 * u, 4 * u, cx, headCY, headR * 1.3);
  face.addColorStop(0, shade(skin, .25));
  face.addColorStop(1, skin);
  ctx.fillStyle = face;
  ctx.beginPath(); ctx.arc(cx, headCY, headR, 0, Math.PI * 2); ctx.fill();

  // vlasy — kulich + ofina
  ctx.fillStyle = outfit.h;
  ctx.beginPath();
  ctx.arc(cx, headCY - 2 * u, headR + 1.5 * u, Math.PI * 1.02, Math.PI * 1.98);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, headCY - 9 * u, headR + 1 * u, headR * .52, 0, Math.PI, 0);
  ctx.fill();
  // ofina
  ctx.beginPath();
  ctx.roundRect(cx - headR - 1 * u, headCY - 8 * u, 10 * u, 16 * u, 4 * u);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + headR - 9 * u, headCY - 8 * u, 10 * u, 14 * u, 4 * u);
  ctx.fill();

  // oči + úsmev
  const eyeY = headCY + 2 * u;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.ellipse(cx - 8 * u, eyeY, 4.2 * u, 5 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 8 * u, eyeY, 4.2 * u, 5 * u, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#20222e";
  const look = opts.lookX || 0;
  ctx.beginPath(); ctx.arc(cx - 8 * u + look * 1.6 * u, eyeY + 1 * u, 2.1 * u, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 8 * u + look * 1.6 * u, eyeY + 1 * u, 2.1 * u, 0, Math.PI * 2); ctx.fill();
  // glint
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.beginPath(); ctx.arc(cx - 8.8 * u + look * 1.6 * u, eyeY, .8 * u, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 7.2 * u + look * 1.6 * u, eyeY, .8 * u, 0, Math.PI * 2); ctx.fill();
  // úsmev
  ctx.strokeStyle = shade(skin, -.45);
  ctx.lineWidth = 2 * u; ctx.lineCap = "round";
  ctx.beginPath();
  if (opts.mood === "sad") ctx.arc(cx, eyeY + 13 * u, 5 * u, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(cx, eyeY + 7 * u, 7 * u, Math.PI * .15, Math.PI * .85);
  ctx.stroke();
  // pery
  ctx.fillStyle = shade(skin, -.35);
  ctx.beginPath(); ctx.arc(cx, eyeY + 8.5 * u, 1.6 * u, 0, Math.PI * 2); ctx.fill();

  ctx.globalAlpha = 1;
}

/* malý avatar do topbaru */
function renderTopbarAvatar() {
  const c = document.getElementById("avatar-canvas");
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#241e52";
  ctx.fillRect(0, 0, c.width, c.height);
  drawCharSmooth(ctx, c.width / 2, c.height + 14, c.height * 2.2, playerOutfit());
}
