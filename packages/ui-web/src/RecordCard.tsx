// RecordCard — web twin of packages/ui-native/src/RecordCard.tsx.
//
// One list row: optional leading media, a title/subtitle/meta stack, optional
// trailing actions, optional detail below. Native has had this since the mobile
// build; web re-derived the same three-part flex row in `jobs`, `network`,
// `saved`, `notifications` and `settings/blocked`, each with its own truncation
// and gap decisions. `scripts/check-ui-lockstep.mjs` recorded that as drift.
//
// The one place the twins CANNOT match: native puts `onPress` on the whole
// card. Doing that on web would nest the trailing action inside the link — an
// `<a>` containing a `<button>` is invalid HTML and a real keyboard trap. So
// `href` makes only the leading + text region a link, which is what every call
// site here had already worked out by hand.

import type { CSSProperties, ElementType, JSX, ReactNode } from "react";

import { cx } from "./cx";
import { Surface } from "./Surface";

export interface RecordCardProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  /**
   * `rtl` follows the document (the default, and right for Arabic UI copy).
   * `auto` derives direction from the content's first strong character — use it
   * for user-generated strings. `ltr` is for content that really is LTR.
   */
  metaDirection?: "rtl" | "ltr" | "auto";
  trailing?: ReactNode;
  children?: ReactNode;
  variant?: "card" | "row";
  density?: "comfortable" | "compact";
  /** Links the leading + text region. Trailing actions stay outside it. */
  href?: string;
  /**
   * What renders the link. Defaults to `a`; app wrappers pass their router's
   * link so navigation stays client-side. The package must not import one
   * itself — `ui-web` is framework-neutral.
   */
  linkAs?: ElementType;
  /** Overrides the link's accessible name when the title alone is not enough. */
  accessibilityLabel?: string;
  /** Element for the outer surface — `li` inside a `ul`. */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

export function RecordCard({
  leading,
  title,
  subtitle,
  meta,
  metaDirection = "rtl",
  trailing,
  children,
  variant = "card",
  density = "comfortable",
  href,
  linkAs: Link = "a",
  accessibilityLabel,
  as,
  className,
  style,
}: RecordCardProps): JSX.Element {
  const body = (
    <>
      {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        {/* Two lines, not one, and not `truncate`: the native twin has always
            given both of these `numberOfLines={2}`, and a single-line ellipsis
            cuts an RTL line at its VISUAL left edge — which is the middle of a
            trailing Latin run. A headline ending in "TypeScript" rendered as
            "… و ipt…" and a job called "… — NestJS" as "… — tJS…". Clamping
            breaks at a word instead, so the Latin word moves whole or goes. */}
        <p className="bidi-plaintext text-ink text-h3 line-clamp-2 font-semibold">{title}</p>
        {subtitle ? (
          <p className="bidi-plaintext text-ink-muted text-small line-clamp-2">{subtitle}</p>
        ) : null}
        {meta ? (
          <p
            className={cx(
              "text-ink-subtle text-caption mt-1 truncate",
              metaDirection === "auto" && "bidi-plaintext",
            )}
            dir={metaDirection === "ltr" ? "ltr" : undefined}
          >
            {meta}
          </p>
        ) : null}
      </div>
    </>
  );

  return (
    <Surface
      as={as ?? "div"}
      variant={variant}
      padding={density === "compact" ? "3" : "4"}
      className={cx("flex flex-col gap-3", className)}
      style={style}
    >
      <div className="flex items-center gap-3">
        {href ? (
          <Link
            href={href}
            aria-label={accessibilityLabel}
            className="focus-visible:outline-hidden flex min-w-0 flex-1 items-center gap-3 rounded-md focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {body}
          </Link>
        ) : (
          body
        )}
        {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
      </div>
      {children ? <div className="flex flex-col gap-2">{children}</div> : null}
    </Surface>
  );
}
