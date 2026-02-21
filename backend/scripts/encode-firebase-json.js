/**
 * One-time helper: read a Firebase service account JSON file and output Base64
 * for use in .env as FIREBASE_SERVICE_ACCOUNT_JSON (Option B).
 *
 * Usage: node scripts/encode-firebase-json.js path/to/serviceAccountKey.json
 * Then add to .env: FIREBASE_SERVICE_ACCOUNT_JSON=<paste the output>
 */

const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/encode-firebase-json.js <path-to-serviceAccountKey.json>');
  process.exit(1);
}
const resolved = path.resolve(file);
if (!fs.existsSync(resolved)) {
  console.error('File not found:', resolved);
  process.exit(1);
}
const json = fs.readFileSync(resolved, 'utf8');
const minified = JSON.stringify(JSON.parse(json));
const base64 = Buffer.from(minified, 'utf8').toString('base64');
console.log(base64);
