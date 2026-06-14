# Sprint 17 Decisions

## F-03 Search Scope

Status: closed; amended 2026-06-13.

Sprint 17 expanded search from people-only to three shipped scopes:

- People: existing `/search/people` endpoint and UI behavior preserved.
- Posts: new `/search/posts` endpoint, shared schema, web tab, and mobile tab.
- Jobs: new `/search/jobs` endpoint, shared schema, web tab, and mobile tab.

The 2026-06-13 amendment ships the fourth scope:

- Companies: `/search/companies` endpoint, shared schema, web tab, and mobile tab.

The earlier deferral reason no longer applies: F-04 company admin/management shipped in PR #25, and app surfaces now have employer/company pages to receive search hits.

The archived prototype at `docs/_archive/prototype-2025/Baydar Prototype.html` still references a companies tab as prototype intent. The source of truth is now the four-scope contract in `docs/api-contract.md`.
