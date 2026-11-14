#!/usr/bin/env node
/* Cache-busting z jedného miesta: jedna verzia (hash obsahu js/ + css/) sa zapíše
   do všetkých ?v=… v index.html. Nič sa nemení ručne.
     node scripts/stamp.js          prepíše index.html
     node scripts/stamp.js --check  zlyhá, ak je stamp zastaraný (použité v `npm test`) */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const INDEX = path.join(ROOT, "index.html");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (name === "vendor") continue;
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|css)$/.test(name)) out.push(p);
  }
  return out;
}

function contentHash() {
  const h = crypto.createHash("sha1");
  for (const f of [...walk(path.join(ROOT, "js")), ...walk(path.join(ROOT, "css"))]) {
    h.update(path.relative(ROOT, f));
    h.update(fs.readFileSync(f));
  }
  return h.digest("hex").slice(0, 8);
}

const html = fs.readFileSync(INDEX, "utf8");
const version = contentHash();
const next = html.replace(/((?:src|href)="(?:js|css)\/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"/g, `$1?v=${version}"`);

if (process.argv.includes("--check")) {
  if (next !== html) {
    console.error(`index.html má zastaraný cache stamp (očakávané ?v=${version}). Spusti: npm run stamp`);
    process.exit(1);
  }
  console.log(`stamp OK (?v=${version})`);
} else {
  if (next !== html) fs.writeFileSync(INDEX, next);
  console.log(`stamp ?v=${version} (${next === html ? "bez zmeny" : "index.html aktualizovaný"})`);
}
