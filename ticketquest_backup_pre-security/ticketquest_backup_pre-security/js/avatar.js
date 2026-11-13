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

/* malý avatar do topbaru */
function renderTopbarAvatar() {
  const c = document.getElementById("avatar-canvas");
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#241e52";
  ctx.fillRect(0, 0, c.width, c.height);
  drawChar(ctx, 6, 2, 4, playerOutfit());
}
