const fs = require('fs');
const corpus = 'C:/Users/osama/AppData/Local/Temp/opencode/wa-review-20261112T065042389Z-38a3cef2e0424f7fa3ba00708859ee87/corpus/';
const read = (name) => fs.readFileSync(corpus + name, 'utf8').trim().split(/\r?\n/).map(JSON.parse).filter((x) => x.pillar_id === 'operational-excellence');
const questions = read('questions.jsonl');
const bps = read('best-practices.jsonl');
const lines = fs.readFileSync('pillar-ops.md', 'utf8').split(/\r?\n/);
const text = lines.join('\n');
let failures = 0;
const fail = (message) => { failures++; console.log(`FAIL: ${message}`); };
console.log(`Frozen corpus: ${questions.length} questions, ${bps.length} best practices`);
if (questions.length !== 11 || bps.length !== 68) fail('Unexpected corpus size');
for (const question of questions) {
  const rows = lines.filter((line) => line.startsWith(`| ${question.question_id} — `));
  const expected = `| ${question.question_id} — ${question.question_title} |`;
  if (rows.length !== 1) fail(`${question.question_id}: ${rows.length} question rows`);
  else if (!rows[0].startsWith(expected)) fail(`${question.question_id}: canonical title mismatch`);
  const occurrences = lines.filter((line) => line.includes(question.question_title)).length;
  if (occurrences !== 1) fail(`${question.question_id}: canonical title occurs on ${occurrences} lines`);
  console.log(`${question.question_id}: rows=${rows.length}, exact-title-lines=${occurrences}`);
}
const expectedScores = { OPS01: 2, OPS02: 2, OPS03: 2, OPS04: 4, OPS05: 4, OPS06: 1, OPS07: 1, OPS08: 1, OPS09: 1, OPS10: 1, OPS11: 2 };
let scoreSum = 0;
for (const [id, expected] of Object.entries(expectedScores)) {
  const row = lines.find((line) => line.startsWith(`| ${id} — `));
  if (!row) { fail(`${id}: missing score row`); continue; }
  const score = Number(row.split('|')[2].trim());
  scoreSum += score;
  if (score !== expected) fail(`${id}: expected score ${expected}, got ${score}`);
}
console.log(`Question score sum: ${scoreSum}`);
if (scoreSum !== 21) fail(`Expected score sum 21, got ${scoreSum}`);
const allowedStatuses = ['Implemented', 'Partially Implemented', 'Not Implemented', 'Not Applicable', 'Cannot Determine'];
const statusCounts = Object.fromEntries(allowedStatuses.map((status) => [status, 0]));
const ledgerRows = lines.filter((line) => /^\| OPS\d\d-BP\d\d — /.test(line));
if (ledgerRows.length !== 68) fail(`Expected 68 ledger rows, got ${ledgerRows.length}`);
for (const bp of bps) {
  const rows = ledgerRows.filter((line) => line.startsWith(`| ${bp.bp_id} — `));
  const expected = `| ${bp.bp_id} — ${bp.bp_title} |`;
  if (rows.length !== 1) { fail(`${bp.bp_id}: ${rows.length} ledger rows`); continue; }
  if (!rows[0].startsWith(expected)) fail(`${bp.bp_id}: canonical title mismatch`);
  const cells = rows[0].split('|');
  const status = cells[2].trim();
  if (!allowedStatuses.includes(status)) fail(`${bp.bp_id}: invalid status ${status}`);
  else statusCounts[status]++;
  if (cells.length < 6 || !cells[3].trim() || !cells[4].trim()) fail(`${bp.bp_id}: incomplete evidence/action columns`);
}
console.log(`BP ledger rows: ${ledgerRows.length}`);
console.log(`BP status counts: ${JSON.stringify(statusCounts)}`);
const expectedStatusCounts = { Implemented: 11, 'Partially Implemented': 22, 'Not Implemented': 3, 'Not Applicable': 0, 'Cannot Determine': 32 };
for (const status of allowedStatuses) if (statusCounts[status] !== expectedStatusCounts[status]) fail(`${status}: expected ${expectedStatusCounts[status]}, got ${statusCounts[status]}`);
const requiredSections = ['## Question scorecard', '### Risk matrix', '## Eisenhower remediation plan', '## Full BP Ledger', '## Validation record'];
for (const section of requiredSections) if (!text.includes(section)) fail(`Missing section ${section}`);
const smartStart = lines.findIndex((line) => line === '## Prioritized findings');
const smartEnd = lines.findIndex((line) => line === '## Eisenhower remediation plan');
const smartRows = lines.slice(smartStart, smartEnd).filter((line) => /^\| P\d /.test(line));
console.log(`SMART findings: ${smartRows.length}`);
if (smartRows.length !== 8) fail(`Expected 8 SMART findings, got ${smartRows.length}`);
const impactValues = lines.slice(smartStart, smartEnd).flatMap((line) => Array.from(line.matchAll(/\*\*(Critical|High|Moderate|Low) × (High|Medium|Low|Unknown)\*\*/g)).map((match) => match[0]));
console.log(`Impact × Likelihood cells: ${impactValues.length}`);
if (impactValues.length !== 8) fail(`Expected 8 Impact × Likelihood cells, got ${impactValues.length}`);
const unknownMatrix = lines.some((line) => line.includes('Unknown likelihood remains **Unknown**'));
console.log(`Unknown likelihood present in risk matrix: ${unknownMatrix}`);
if (!unknownMatrix) fail('Unknown likelihood absent from risk matrix');
const pending = lines.filter((line) => /pending/i.test(line));
console.log(`Pending-language lines: ${pending.length}`);
for (const line of pending) console.log(line);
console.log(`Validation failures: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
