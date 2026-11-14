const fs = require('fs');
const corpus = 'C:/Users/osama/AppData/Local/Temp/opencode/wa-review-20261112T065042389Z-38a3cef2e0424f7fa3ba00708859ee87/corpus/';
const read = (name) => fs.readFileSync(corpus + name, 'utf8').trim().split(/\r?\n/).map(JSON.parse).filter((x) => x.pillar_id === 'operational-excellence');
const questions = read('questions.jsonl');
const bps = read('best-practices.jsonl');
const lines = fs.readFileSync('pillar-ops.md', 'utf8').split(/\r?\n/);
let failures = 0;
console.log(`Corpus: ${questions.length} questions, ${bps.length} BPs`);
for (const question of questions) {
  const rows = lines.filter((line) => line.startsWith(`| ${question.question_id} — `));
  const exactTitleLines = lines.filter((line) => line.includes(question.question_title));
  const ok = rows.length === 1 && rows[0].startsWith(`| ${question.question_id} — ${question.question_title} |`);
  console.log(`${question.question_id}: rows=${rows.length}, exactTitleLines=${exactTitleLines.length}, valid=${ok}`);
  if (!ok) {
    failures++;
    console.log(rows);
  }
}
for (const bp of bps) {
  const rows = lines.filter((line) => line.startsWith(`| ${bp.bp_id} — `));
  const ok = rows.length === 1 && rows[0].startsWith(`| ${bp.bp_id} — ${bp.bp_title} |`);
  if (!ok) {
    failures++;
    console.log(`MISMATCH ${bp.bp_id}: expected=[${bp.bp_title}], rows=${rows.length}`);
    console.log(rows);
  }
}
const ledgerRows = lines.filter((line) => /^\| OPS\d\d-BP\d\d — /.test(line)).length;
console.log(`BP ledger rows=${ledgerRows}`);
const pending = lines.filter((line) => /pending/i.test(line));
console.log(`Pending-language lines=${pending.length}`);
console.log(`Validation failures=${failures}`);
const expectedScores = { OPS01: 2, OPS02: 2, OPS03: 2, OPS04: 4, OPS05: 4, OPS06: 1, OPS07: 1, OPS08: 1, OPS09: 1, OPS10: 1, OPS11: 1 };
let scoreSum = 0;
for (const [id, expected] of Object.entries(expectedScores)) {
  const row = lines.find((line) => line.startsWith(`| ${id} — `));
  const score = Number(row.split('|')[2].trim());
  scoreSum += score;
  if (score !== expected) {
    failures++;
    console.log(`SCORE MISMATCH ${id}: expected=${expected}, actual=${score}`);
  }
}
console.log(`Question score sum=${scoreSum}`);
if (scoreSum !== 21) failures++;
const allowedStatuses = ['Implemented', 'Partially Implemented', 'Not Implemented', 'Not Applicable', 'Cannot Determine'];
const statusCounts = Object.fromEntries(allowedStatuses.map((status) => [status, 0]));
const bpRows = lines.filter((line) => /^\| OPS\d\d-BP\d\d — /.test(line));
for (const row of bpRows) {
  const status = row.split('|')[3].trim();
  if (!(status in statusCounts)) {
    failures++;
    console.log(`INVALID BP STATUS: ${status}`);
  } else statusCounts[status]++;
}
console.log(`BP status counts=${JSON.stringify(statusCounts)}`);
const smartRows = lines.filter((line) => /^\| P\d /.test(line));
console.log(`SMART finding rows=${smartRows.length}`);
if (smartRows.length !== 8) failures++;
process.exitCode = failures === 0 && ledgerRows === bps.length ? 0 : 1;
