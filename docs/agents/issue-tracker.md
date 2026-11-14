# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations. Infer the repository from `git remote -v` inside this clone, and file issues only into `osama-2000236/palnet`.

- Create: `gh issue create --title "..." --body "..."`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels,comments`.
- Comment: `gh issue comment <number> --body "..."`.
- Labels: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`.
- Close: explain with `gh issue comment`, then `gh issue close <number>`.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Publish / fetch tickets

When a skill says to publish to the issue tracker, create a GitHub issue. When it says to fetch a ticket, read that GitHub issue with `gh`.

## Blocking

Use GitHub native issue dependencies when available: `gh issue create --blocked-by <n>` or `gh issue edit <child> --add-blocked-by <blocker>`. Otherwise use a `Blocked by: #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
