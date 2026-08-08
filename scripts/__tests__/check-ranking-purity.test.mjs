/**
 * Rule 1's gate, broken on purpose.
 *
 * Two ways for this gate to be worthless, so both are asserted: missing a
 * money input inside a ranker, and matching so broadly that an honest ranker
 * cannot be written — a gate that cries wolf gets disabled, which is worse
 * than no gate.
 *
 * Run with: node --test scripts/__tests__/check-ranking-purity.test.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { isRanker, moneyInputs } from "../check-ranking-purity.mjs";

test("flags every way money could reach a ranking decision", () => {
  for (const line of [
    "  const sub = await this.prisma.subscription.findFirst({ where: { userId } });",
    "  include: { Subscription: true },",
    "  if (viewer.isPremium) score += 10;",
    "  const planCode = plan.code;",
    "  orderBy: [{ promoted: 'desc' }, { createdAt: 'desc' }],",
    "  const credits = await this.prisma.employerCredit.count();",
    "  score += user.karamaBalance / 100;",
    "  KaramaLedger.aggregate({ _sum: { points: true } })",
    "  status: SubscriptionStatus.ACTIVE,",
    "  const invoices: Invoice[] = [];",
  ]) {
    assert.ok(moneyInputs(line).length > 0, `should flag: ${line}`);
  }
});

test("leaves an honest ranker alone", () => {
  for (const line of [
    "  const score = recency * 0.4 + affinity * 0.35 + proximityScore(a, b) * 0.25;",
    "  orderBy: [{ publishedAt: 'desc' }],",
    "  const weights = await this.interestWeights(userId);",
    "  if (job.companyId === null) source = 'INDIVIDUAL';",
    "  return candidates.sort((a, b) => b.evidenceScore - a.evidenceScore);",
    // `promotedAt` is not `promoted`; a word-boundary miss here would ban a
    // perfectly ordinary timestamp column somebody adds later.
    "  const promotedAt = null;",
  ]) {
    assert.deepEqual(moneyInputs(line), [], `should not flag: ${line}`);
  }
});

test("scans the files that decide order, and not the ones that do not", () => {
  for (const rel of [
    "apps/api/src/modules/feed/feed.service.ts",
    "apps/api/src/modules/search/search.service.ts",
    "apps/api/src/modules/jobs/jobs.service.ts",
    "apps/api/src/modules/jobs/job-alerts.service.ts",
    "apps/api/src/modules/matching/matching.service.ts",
    "packages/shared/src/ranking/feed-score.ts",
  ]) {
    assert.ok(isRanker(rel), `should scan: ${rel}`);
  }

  for (const rel of [
    // The promotions assembler is the alternative to ranking by money, not a
    // ranker. It is out of scope by design and may not import one.
    "apps/api/src/modules/promotions/promotions.service.ts",
    "apps/api/src/modules/billing/billing.service.ts",
    "apps/api/src/modules/feed/feed.controller.ts",
    "apps/api/src/modules/feed/feed.service.spec.ts",
    "packages/shared/src/ranking/feed-score.spec.ts",
  ]) {
    assert.ok(!isRanker(rel), `should not scan: ${rel}`);
  }
});
