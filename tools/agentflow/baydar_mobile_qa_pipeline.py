from agentflow import Codex, Graph, codex, merge, shell


ROOT_CONTEXT = """
Repository: Baydar / بيدر Expo mobile app.
Preview: http://localhost:8082
Current focus: production-ready Arabic-first professional networking app.

Non-negotiable design constraints:
- Arabic-first, RTL by default.
- Olive #526030, terracotta #a8482c, warm off-white surfaces through nativeTokens.
- No LinkedIn blue, no generic SaaS blue, no dark mode, no nested cards.
- Five mobile tabs only: Feed, Network, raised Composer, Messages, Profile.
- Jobs/Search/Notifications are hidden routes reached from content/header.

Primary docs to honor:
- DESIGN.md
- BRAND.md
- .interface-design/system.md
- docs/design/MOBILE.md
- docs/design/RTL.md
- docs/design/TESTING.md
- docs/components/AppShell.md
- docs/components/PostCard.md
- docs/components/MessageBubble.md
- docs/components/Surface.md
"""


with Graph(
    "baydar-mobile-full-qa-audit",
    concurrency=4,
    fail_fast=False,
    scratchboard=True,
    use_worktree=False,
    node_defaults={"timeout_seconds": 900, "retries": 0},
) as g:
    preflight = shell(
        task_id="preflight",
        script=(
            "pnpm --filter @baydar/mobile test -- --runInBand && "
            "pnpm --filter @baydar/mobile lint && "
            "pnpm --filter @baydar/mobile type-check && "
            "pnpm --filter @baydar/ui-native type-check && "
            "pnpm --filter @baydar/ui-native lint && "
            "git diff --check"
        ),
    )

    ui_rtl = codex(
        task_id="ui_rtl_audit",
        tools="read_only",
        prompt=f"""
{ROOT_CONTEXT}

Audit the mobile UI system and RTL implementation.
Inspect shared primitives, tokens, app shell, typography, spacing, tab labels,
field components, and no-blue/no-dark-mode compliance.

Output:
- PASS/FAIL per area.
- Exact files/lines for issues.
- Prioritized fixes.
Do not edit files.
""",
    )

    auth_onboarding = codex(
        task_id="auth_onboarding_audit",
        tools="read_only",
        prompt=f"""
{ROOT_CONTEXT}

Audit auth, register, login, protected app gate, session recovery,
mandatory onboarding, profile completion rules, loading/offline/error states,
and validation copy.

Focus on the current /onboarding preview concern and app gate behavior.

Output:
- PASS/FAIL per flow.
- Exact files/lines for issues.
- Prioritized fixes.
Do not edit files.
""",
    )

    feed_profile_jobs = Codex(
        task_id="feed_profile_jobs_audit",
        tools="read_only",
        prompt=f"""
{ROOT_CONTEXT}

Audit feed, composer, public profile, self profile, profile edit, jobs list/detail/apply.
Check usability against the supplied kit: text, buttons, fields, colors, dense records,
mixed Arabic/English content, narrow phone sizes, and persistence/error states.

Output:
- PASS/FAIL per screen.
- Exact files/lines for issues.
- Prioritized fixes.
Do not edit files.
""",
    )

    network_messages_notifications_search = Codex(
        task_id="network_messages_notifications_search_audit",
        tools="read_only",
        prompt=f"""
{ROOT_CONTEXT}

Audit network, messages, notifications, and search.
Check list loading/empty/offline/error states, 429-safe messaging UX,
room/thread behavior, unread/read affordances, search Arabic/English/no-result states,
and accessible testIDs.

Output:
- PASS/FAIL per screen.
- Exact files/lines for issues.
- Prioritized fixes.
Do not edit files.
""",
    )

    reducer = merge(
        codex(
            task_id="qa_reducer",
            tools="read_only",
            prompt="""
Merge the audit outputs into one strict implementation plan.

Output:
- Overall status.
- Blocking defects first.
- Screen-by-screen fixes.
- Tests to add/update.
- Manual Browser QA script.
- Commit readiness.

Use concrete file paths and line references when available.
""",
        ),
        [ui_rtl, auth_onboarding, feed_profile_jobs, network_messages_notifications_search],
    )

    preflight >> [ui_rtl, auth_onboarding, feed_profile_jobs, network_messages_notifications_search]
    [ui_rtl, auth_onboarding, feed_profile_jobs, network_messages_notifications_search] >> reducer
