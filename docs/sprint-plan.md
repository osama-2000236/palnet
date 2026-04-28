# Sprint Plan

This document now records the shipped pre-launch line instead of the old greenfield order. For current source-of-truth architecture, use `project-spec.md`.

## Shipped Line

- **Sprints 1-4:** Foundation swap, AppShell, feed polish, and messages shipped.
- **Sprint 5:** Mobile app kickoff shipped enough of the Expo shell and shared native primitives to unblock mobile parity.
- **Sprint 6:** Jobs, notifications, shared i18n formatters, native sheet/message primitives, cover-letter apply flow, public accessibility sweep, and desktop Lighthouse budget shipped.
- **Sprint 7:** Mobile screen ports and native skeleton primitives shipped.
- **Sprint 8:** Native UX layer shipped: haptics, expo-image usage, blurhash placeholder support, pull-to-refresh, swipe archive, hidden thread tabs, mobile SSE, and keyboard avoidance.
- **Sprint 9:** Auth refresh resilience, Baydar deep links, push devices, and live API boot fixes shipped.
- **Sprint 10:** Production hardening added offline handling, observability hooks, and release-env placeholders.
- **Sprint 11:** Launch polish added Arabic copy cleanup, authenticated a11y fixture work, and launch-readiness checks.
- **Sprint 11.5:** Bundle gate and audit fixes shipped; Expo iOS/Android dev exports were green on that line.

## Current Follow-Ups

1. Capture real-device smoke evidence for mobile features that cannot be proved in this shell.
2. Replace universal-link placeholders before hosting production association files.
3. Add native coverage for low-branch-coverage UI primitives.
4. Run native-speaker Arabic copy review.
5. Decide whether the post-main work that was on `codex/final_plan` should be rebuilt intentionally on a new branch; it is not part of the current cleaned `main` baseline.

## Hygiene

- One coherent change per branch unless the user explicitly requests direct cleanup on `main`.
- Every feature closes with docs, tests, and migrations when relevant.
- Cleanup branches may delete generated artifacts and stale worktrees, but must leave `git status --short` clean before handoff.
