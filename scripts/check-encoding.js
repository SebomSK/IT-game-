#!/usr/bin/env node
/* Stráži kódovanie: UTF-8 bez BOM, LF, žiadne NUL bajty ani poškodené emoji (U+FFFD / mojibake). */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const SKIP = new Set([".git", "node_modules", "vendor", "three.min.js"]);
const EXT = /\.(js|css|html|md|json)$/;
const bad = [];
/* znaky zapísané cez escapes, aby skript nehlásil sám seba */
const REPL = String.fromCharCode(0xfffd);
const MOJIBAKE = new RegExp("\u00c3[\u0080-\u00bf]|\u00e2\u20ac|\u00f0\u0178");

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { walk(p); continue; }
    if (!EXT.test(name)) continue;
    const buf = fs.readFileSync(p);
    const rel = path.relative(ROOT, p);
    if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) bad.push(`${rel}: BOM`);
    if (buf.includes(0)) bad.push(`${rel}: NUL bajt (UTF-16?)`);
    const txt = buf.toString("utf8");
    if (txt.includes("\r")) bad.push(`${rel}: CR/CRLF konce riadkov`);
    if (txt.includes(REPL)) bad.push(`${rel}: poškodený znak U+FFFD`);
    if (MOJIBAKE.test(txt)) bad.push(`${rel}: mojibake (dvojito kódovaný UTF-8)`);
  }
}
walk(ROOT);
if (bad.length) { console.error("Chyby kódovania:\n  " + bad.join("\n  ")); process.exit(1); }
console.log("encoding OK");
