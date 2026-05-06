# Sprint 17 Decisions

## F-03 Search Scope

Status: closed.

Sprint 17 expands search from people-only to three shipped scopes:

- People: existing `/search/people` endpoint and UI behavior preserved.
- Posts: new `/search/posts` endpoint, shared schema, web tab, and mobile tab.
- Jobs: new `/search/jobs` endpoint, shared schema, web tab, and mobile tab.

Companies search is intentionally cut from the MVP. The Prisma `Company` model and read-side job relation exist, but the product still lacks the company admin and management surface tracked by Sprint 12 audit F-04. Shipping `/search/companies` now would expose empty or orphan company data without a supported management path.

The archived prototype at `docs/_archive/prototype-2025/Baydar Prototype.html` still references a companies tab as prototype intent only. The source of truth for Sprint 17 is the shipped three-scope contract in `docs/api-contract.md`.

## Follow-Up

F-04 remains open for company admin/management. Company search can be reconsidered after that surface exists.
