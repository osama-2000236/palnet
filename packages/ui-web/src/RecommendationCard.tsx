// RecommendationCard — a testimonial with a face on it.
//
// The author is not optional and never collapses to a name: an anonymous
// testimonial is a review, and reviews are the thing this product deliberately
// does not run. The avatar, the name and how they knew you are the evidence;
// the prose is the detail.
//
// `onHide` is the subject's only control, and there is deliberately no `onEdit`.
// A testimonial the subject can rewrite is not a testimonial.

import type { JSX, ReactNode } from "react";

import { Avatar, type AvatarUser } from "./Avatar";
import { Surface } from "./Surface";
import { cx } from "./cx";

export interface RecommendationCardLabels {
  /** «إخفاء» */
  hide: string;
  /** «إظهار» */
  show: string;
}

export interface RecommendationCardProps {
  author: AvatarUser;
  name: string;
  headline?: string | null;
  /** How they knew you, already localised: «كان مديري المباشر». */
  relationship: string;
  /** Already formatted, e.g. «قبل ٣ أشهر». */
  date?: string | null;
  body: string;
  /** The author's professional-body badge, when they have one. */
  badge?: ReactNode;
  /** True when the subject has hidden it. Only the subject sees it at all. */
  hidden?: boolean;
  onOpenAuthor?: () => void;
  /** Present only for the subject. Its absence is what makes this read-only. */
  onToggleHidden?: () => void;
  labels: RecommendationCardLabels;
  className?: string;
}

export function RecommendationCard({
  author,
  name,
  headline,
  relationship,
  date,
  body,
  badge,
  hidden = false,
  onOpenAuthor,
  onToggleHidden,
  labels,
  className,
}: RecommendationCardProps): JSX.Element {
  return (
    <Surface
      variant="card"
      padding="4"
      // A hidden testimonial stays legible rather than greyed to the point of
      // unreadable: the subject has to be able to read what they are hiding.
      className={cx("flex flex-col gap-3", hidden && "opacity-70", className)}
    >
      <div className="flex items-start gap-3">
        <Avatar user={author} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {onOpenAuthor ? (
              <button
                type="button"
                onClick={onOpenAuthor}
                className="text-ink focus-visible:outline-hidden truncate text-start font-semibold hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
              >
                {name}
              </button>
            ) : (
              <span className="text-ink truncate font-semibold">{name}</span>
            )}
            {badge}
          </div>
          {headline ? <p className="text-ink-muted text-small truncate">{headline}</p> : null}
          <p className="text-ink-subtle text-micro">
            {relationship}
            {date ? ` · ${date}` : ""}
          </p>
        </div>

        {onToggleHidden ? (
          <button
            type="button"
            onClick={onToggleHidden}
            className="text-ink-muted focus-visible:outline-hidden hover:text-ink text-small min-h-10 shrink-0 px-2 focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {hidden ? labels.show : labels.hide}
          </button>
        ) : null}
      </div>

      <p className="text-ink whitespace-pre-line">{body}</p>
    </Surface>
  );
}
