// The counts strip between a post's body and its action bar. Split out of
// PostCard.tsx for the same reason PostCardAction was — that file sits against
// qa:design's 300-LOC ceiling. Not exported from the package index.

import { ReactionGlyph } from "./ReactionGlyph";
import { topReactions, type ReactionKind } from "./reactions";
import type { PostCardCounts, PostCardLabels } from "./PostCard";

export function PostCardStats({
  counts,
  labels,
  formatCount,
}: {
  counts: PostCardCounts;
  labels: Pick<PostCardLabels, "commentsCount" | "repostsCount">;
  formatCount(value: number): string;
}): JSX.Element | null {
  // Hidden entirely for untouched posts — no "0 · 0" noise. Matches native.
  if (counts.reactions + counts.comments + counts.reposts === 0) return null;
  const shown = topReactions(counts.byReaction);

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      {/* The pip used to paint whenever *any* count was non-zero, so a post with
          one comment and no reactions showed a filled brand thumb beside a "0".
          It follows the reaction count now, and shows which reactions actually
          arrived instead of asserting they were all likes. */}
      {counts.reactions > 0 ? (
        <>
          <span aria-hidden="true" className="flex items-center -space-x-1 rtl:space-x-reverse">
            {(shown.length > 0 ? shown : (["LIKE"] as ReactionKind[])).map((kind) => (
              <span
                key={kind}
                className="border-surface bg-surface inline-flex h-5 w-5 items-center justify-center rounded-full border"
              >
                <ReactionGlyph kind={kind} size={12} tinted strokeWidth={2.2} />
              </span>
            ))}
          </span>
          {/* Was `{counts.reactions}` raw — a Latin digit inside an Arabic UI,
              the exact defect PR #88 fixed everywhere else. The formatter is
              injected because ui-web never calls Intl itself (A1.6). */}
          <span aria-live="polite" className="text-ink-muted text-xs tabular-nums">
            {formatCount(counts.reactions)}
          </span>
        </>
      ) : null}
      <div className="flex-1" />
      {/* Each half of this line appears only when it has something to say. The
          strip showed "٠ تعليق · ٠ إعادة نشر" beside a single reaction, which
          is three facts where one was true — the same "no 0 · 0 noise" rule the
          whole strip already follows, applied one level down. */}
      {counts.comments > 0 || counts.reposts > 0 ? (
        <span className="text-ink-muted text-xs">
          {[
            counts.comments > 0 ? labels.commentsCount(counts.comments) : null,
            counts.reposts > 0 ? labels.repostsCount(counts.reposts) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      ) : null}
    </div>
  );
}
