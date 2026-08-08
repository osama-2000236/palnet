// PostMedia — the image grid, and the decision not to load it.
//
// On a 2G connection an image is the most expensive thing on the screen by an
// order of magnitude, so `light` mode does not fetch one until the member asks.
// What they see instead is the blurhash the upload already produced, and a
// button saying what tapping it will cost — «تحميل الصورة · ٤٨ ك.ب». A member
// who cannot see the price cannot decide, and a grey rectangle with no
// explanation reads as a broken product rather than a considerate one.
//
// Split out of PostCard because that file was one line from the 300-LOC design
// ceiling, and a media grid is a different job from a card shell anyway.

import { useState, type JSX } from "react";

import { Icon } from "./Icon";
import { cx } from "./cx";

export interface PostMediaItem {
  id?: string | null;
  url: string;
  kind: "IMAGE" | "VIDEO";
  /** Drawn while an image is not loaded. Produced at upload. */
  blurhash?: string | null;
  /** Pre-formatted by the host, in the reader's digits — e.g. «٤٨ ك.ب». */
  sizeLabel?: string | null;
}

export interface PostMediaLabels {
  /** The button. Host interpolates the size: «تحميل الصورة · ٤٨ ك.ب». */
  load: string;
  /** Alternative when the size is unknown. */
  loadUnknownSize: string;
  /** Why the play button is disabled on a slow connection. */
  videoUnavailable: string;
}

export interface PostMediaProps {
  media: PostMediaItem[];
  /**
   * False on `light`: draw the placeholder and wait to be asked. The host
   * reads this from the bandwidth policy; the kit stays store-free.
   */
  autoLoad?: boolean;
  /** False on `light`. Video has no small variant to fall back to. */
  allowVideo?: boolean;
  labels: PostMediaLabels;
  className?: string;
}

export function PostMedia({
  media,
  autoLoad = true,
  allowVideo = true,
  labels,
  className,
}: PostMediaProps): JSX.Element | null {
  // Per-item, not per-card: a member who paid for one image has not agreed to
  // pay for the other three.
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  if (media.length === 0) return null;

  return (
    <ul
      className={cx("grid gap-0.5", media.length === 1 ? "grid-cols-1" : "grid-cols-2", className)}
    >
      {media.map((m, i) => {
        const key = m.id ?? m.url ?? String(i);
        const show = autoLoad || revealed.has(key);

        if (m.kind === "VIDEO") {
          return (
            <li key={key} className="relative">
              <div className="bg-surface-subtle text-ink-muted flex aspect-video w-full flex-col items-center justify-center gap-2 p-4 text-center">
                <Icon name="video" size={32} />
                {allowVideo ? null : <p className="text-small">{labels.videoUnavailable}</p>}
              </div>
            </li>
          );
        }

        return (
          <li key={key} className="relative">
            {show ? (
              <img src={m.url} alt="" className="max-h-[420px] w-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => setRevealed((prev) => new Set(prev).add(key))}
                className="bg-surface-sunken focus-visible:outline-hidden flex aspect-video w-full flex-col items-center justify-center gap-2 focus-visible:[box-shadow:var(--focus-ring)]"
              >
                <Icon name="image" size={28} />
                <span className="text-small text-ink-muted">
                  {m.sizeLabel ? `${labels.load} · ${m.sizeLabel}` : labels.loadUnknownSize}
                </span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
