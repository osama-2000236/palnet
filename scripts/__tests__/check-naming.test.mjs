/**
 * The naming-spine gate, run against known-good and known-bad lines.
 *
 * A gate nobody can break on purpose is not evidence of anything. The specific
 * risk here is the opposite of a miss: this gate bans Arabic words that have
 * legitimate uses elsewhere in the product («المحترفين» in landing copy, and the
 * decision record that names the banned words in order to ban them). A gate that
 * fails on prose gets disabled, so the false-positive cases are tested first.
 *
 * Run with: node --test scripts/__tests__/check-naming.test.mjs
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { bannedCopy, bannedNames } from "../check-naming.mjs";

test("flags the synonyms that mean a concept already has a name", () => {
  for (const line of [
    "  const craftRank = await standing.get(userId);",
    "  export interface CraftRank { value: number }",
    "  model WorkRecord {",
    '  import { PS_CRAFTS } from "@baydar/shared";',
    "  normalizeCraft(input)",
    "  type JobProof = { id: string };",
    "  const standingTier = 3;",
    "  CRAFT_RANK_MAX",
  ]) {
    assert.ok(bannedNames(line).length > 0, `should flag: ${line}`);
  }
});

test("leaves the canonical vocabulary alone", () => {
  for (const line of [
    "  const standing = await this.standing.of(userId, occupationKey);",
    "  model WorkProof {",
    '  import { PS_OCCUPATIONS, normalizeOccupation } from "@baydar/shared";',
    "  export function standingLabelKey(occupationKey: string, standing: number) {",
    "  const vouch = await this.vouches.find(...);",
    "  logger.log({ level: 'warn' })",
    "  <h2 className={styles.level2}>",
    "  const craft = occupationByKey(key);",
  ]) {
    assert.deepEqual(bannedNames(line), [], `should not flag: ${line}`);
  }
});

test("bans a licence claim inside the namespaces this platform owns", () => {
  assert.ok(bannedCopy("occupations.standing.default.4.masc", "معلّم معتمد").length > 0);
  assert.ok(bannedCopy("matching.applicant.flag", "مرخّص").length > 0);
  assert.ok(bannedCopy("occupations.title", "أسطى").length > 0);
  assert.ok(bannedCopy("occupations.hvac.rank3", "فني أول").length > 0);
});

test("does not police prose outside those namespaces", () => {
  // the real landing string, which must keep working
  assert.deepEqual(bannedCopy("landing.hero.eyebrow", "موثوق به من قبل المحترفين في المنطقة"), []);
  // a name that merely starts with an owned prefix is not inside it
  assert.deepEqual(bannedCopy("occupationsGuide.intro", "خبير"), []);
  assert.deepEqual(bannedCopy("jobs.typeLabels.CONTRACT", "عقد محدد المدة"), []);
});

test("موثّق stays usable — it is reserved for identity, not banned", () => {
  assert.deepEqual(bannedCopy("occupations.licence.verified", "موثّق"), []);
});
