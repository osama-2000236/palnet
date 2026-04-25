// `@palnet/ui-web` is framework-agnostic so we render plain anchors here.
// Next.js consumers still get correct routing — App Router intercepts
// same-origin anchors when they target a prefetched route. For legal pages
// (rare nav target) a full-page transition is the right tradeoff over
// pulling `next` into this package's runtime.
import { Surface } from "./Surface";
import { cx } from "./cx";

export type LegalFooterLink = {
  href: string;
  label: string;
};

export interface LegalFooterProps {
  links: LegalFooterLink[];
  copyright: string;
  label?: string;
  className?: string;
}

export function LegalFooter({
  links,
  copyright,
  label = "Legal links",
  className,
}: LegalFooterProps): JSX.Element {
  return (
    <Surface
      as="footer"
      variant="flat"
      padding="4"
      aria-label={label}
      className={cx("mx-auto mt-8 w-full max-w-[1128px]", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <nav aria-label={label} className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-ink-muted hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-ink-muted">{copyright}</p>
      </div>
    </Surface>
  );
}
