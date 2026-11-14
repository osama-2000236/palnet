# Tasks

- [x] 1. Add failing billing tests for same-key replay, conflicting parameters, and equivalent concurrent checkout; run them against current behavior.
- [x] 2. Add failing refresh tests proving only one concurrent rotation succeeds and a consumed token is rejected.
- [x] 3. Add checkout request validation and persisted idempotency identity with a Prisma migration.
- [x] 4. Implement billing replay/conflict/retry behavior and propagate identity from the controller and web checkout intent.
- [x] 5. Make refresh consumption conditional and atomic while preserving the existing token response.
- [x] 6. Run focused suites and repository gates; independently review correctness, race behavior, compatibility, and remaining HyperPay sandbox risks.