import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const cfDir = path.join(root, 'node_modules', 'camoufox-js');
const sampleJs = path.join(cfDir, 'dist', 'webgl', 'sample.js');
const shimDest = path.join(cfDir, 'better-sqlite3-shim.mjs');
const shimSrc = path.join(__dirname, 'better-sqlite3-shim.mjs');

if (!fs.existsSync(cfDir)) {
  console.log('camoufox-js not installed yet, skipping patch');
  process.exit(0);
}

// Copy shim
fs.copyFileSync(shimSrc, shimDest);
console.log('✓ shim copied to camoufox-js/better-sqlite3-shim.mjs');

// Read sample.js
let content = fs.readFileSync(sampleJs, 'utf-8');
const originalImport = 'await import("better-sqlite3")';
const patchedImport = 'await import("../../better-sqlite3-shim.mjs")';

if (!content.includes(originalImport)) {
  if (content.includes(patchedImport)) {
    console.log('✓ sample.js already patched');
    process.exit(0);
  }
  console.log('⚠  sample.js does not contain expected import, may need manual patch');
  process.exit(1);
}

content = content.replace(originalImport, patchedImport);
fs.writeFileSync(sampleJs, content, 'utf-8');
console.log('✓ sample.js patched to use sql.js shim');
