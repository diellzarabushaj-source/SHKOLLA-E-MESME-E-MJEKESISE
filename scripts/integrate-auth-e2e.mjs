import { readFileSync, writeFileSync } from "node:fs";

const filePath = "scripts/e2e-smoothness.mjs";
let source = readFileSync(filePath, "utf8");
const importLine = 'await import("./e2e-auth.mjs");';

if (source.includes(importLine)) {
  console.log("Authentication browser audit is already integrated.");
  process.exit(0);
}

const marker = 'console.log("Browser smoothness audit passed.");';
if (!source.includes(marker)) throw new Error("Smoothness browser audit completion marker was not found");

source = source.replace(marker, `${marker}\n${importLine}`);
writeFileSync(filePath, source);
console.log("Integrated authentication browser audit with the existing Playwright suite.");
