// Lists English texts used in the app that are missing from a language file.
// Run: node scripts/check-translations.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const KEEP_ENGLISH = new Set(["DriverApp", "SOS", "e.g. 12", "e.g. 500", "e.g. AP0920190012345", "e.g. AP39AB1234"]);

function files(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? (f === "i18n" ? [] : files(p)) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

const used = new Set();
for (const f of [...files("app"), ...files("src")]) {
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) used.add(m[1].replace(/\\"/g, '"'));
  for (const block of s.matchAll(/translated\(\{([\s\S]*?)\}\)/g))
    for (const m of block[1].matchAll(/:\s*"([^"]+)"/g)) used.add(m[1]);
}

let missing = 0;
for (const lang of ["te", "hi"]) {
  const src = readFileSync(`src/i18n/${lang}.ts`, "utf8");
  // keys exactly as written in the file: "..." or '...' or bare words
  const have = new Set();
  for (const m of src.matchAll(/^\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([A-Za-z]\w*))\s*:/gm))
    have.add((m[1] ?? m[2] ?? m[3]).replace(/\\"/g, '"'));
  for (const key of used) {
    if (KEEP_ENGLISH.has(key) || have.has(key)) continue;
    console.log(`${lang}: missing  ${key}`);
    missing++;
  }
}
console.log(missing ? `\n${missing} missing` : "All texts translated.");
process.exit(missing ? 1 : 0);
