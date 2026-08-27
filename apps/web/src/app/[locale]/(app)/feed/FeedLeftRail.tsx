"use client";

// The feed's left rail: the viewer's own mini profile.
//
// `DESIGN.md` §10.1 gives the feed three columns (`225px | 1fr | 300px`) and
// `(app)/loading.tsx` has always drawn this card in the 225px track — banner,
// overlapping ringed avatar, name, headline, a rule, one stat row. The page
// itself rendered a centred two-column flex instead, so the skeleton promised a
// rail that never arrived and the whole page relaid out on every feed load.
// This is the card the skeleton was drawing, lifted from the prototype's
// `FeedPage` mini profile.

import { formatNumber, type Profile } from "@baydar/shared";
import { Avatar, Surface } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

export function FeedLeftRail({
  profile,
  connections,
}: {
  profile: Profile | null;
  /** `null` until `/connections/counts` lands, or if it fails — the row hides. */
  connections: number | null;
}): JSX.Element {
  const t = useTranslations("network");
  const locale = useLocale();

  return (
    <aside className="hidden flex-col gap-3 lg:sticky lg:top-20 lg:flex">
      <Surface variant="hero" padding="0">
        {/* Matches the skeleton's `h-14` band and `-mt-7` avatar overlap.
         * `--cover-gradient` is the same one `ProfileHeader` paints — DESIGN.md
         * §13 calls it the single decorative gradient, and it re-resolves in
         * dark mode on its own. */}
        <div
          aria-hidden="true"
          className="h-14 w-full"
          style={{ background: "var(--cover-gradient)" }}
        />
        <div className="-mt-7 px-4 pb-4">
          <Avatar user={profile} size="lg" ring />
          {profile ? (
            <>
              <Link
                href={`/${locale}/me`}
                className="text-ink focus-visible:outline-hidden mt-3 block rounded-sm text-sm font-semibold hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
              >
                {profile.firstName} {profile.lastName}
              </Link>
              {profile.headline ? (
                <p className="text-ink-muted mt-1 text-xs leading-snug">{profile.headline}</p>
              ) : null}
            </>
          ) : null}
        </div>
        {connections !== null ? (
          <>
            <div className="border-line-soft border-t" />
            <Link
              href={`/${locale}/me/connections`}
              className="hover:bg-surface-subtle focus-visible:outline-hidden flex items-center justify-between gap-2 rounded-b-xl px-4 py-2.5 focus-visible:[box-shadow:var(--focus-ring)]"
            >
              <span className="text-ink-muted truncate text-xs">{t("myConnections")}</span>
              <span className="text-brand-700 shrink-0 text-xs font-semibold">
                {formatNumber(connections, locale)}
              </span>
            </Link>
          </>
        ) : null}
      </Surface>
    </aside>
  );
}
