// AuthShell — the chrome the five `(auth)` screens were missing.
//
// Web shipped these as bare `<form>`s on a blank page: no logo, no eyebrow, no
// card, and — the functional half — no link between /login and /register, so a
// visitor who landed on one could not reach the other. `auth.toLogin` and
// `auth.toRegister` were already in the message catalog and rendered nowhere.
// The native twins (apps/mobile/app/(auth)/*) have always had all of it; this is
// the same composition so the two platforms read as one product.
import { Icon, Surface } from "@baydar/ui-web";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  kicker,
  title,
  subtitle,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Cross-navigation out of this screen. Rendered under the card. */
  footer?: ReactNode;
}): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-5 px-6 py-12">
      <span className="bg-surface shadow-card flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon name="logo" size={32} />
      </span>

      <header className="flex flex-col items-center gap-1 text-center">
        <p className="text-brand-700 text-xs font-semibold">{kicker}</p>
        <h1 className="text-ink text-3xl font-bold">{title}</h1>
        {subtitle ? <p className="text-ink-muted text-sm">{subtitle}</p> : null}
      </header>

      <Surface variant="card" padding="6" className="w-full">
        {children}
      </Surface>

      {footer ? <div className="flex flex-col items-center gap-1 text-sm">{footer}</div> : null}
    </main>
  );
}

/** "Already have an account? / Sign in" — the link pair both entry screens need. */
export function AuthSwitch({
  prompt,
  href,
  action,
}: {
  prompt: string;
  href: string;
  action: string;
}): JSX.Element {
  return (
    <>
      <span className="text-ink-muted">{prompt}</span>
      <Link
        href={href}
        className="text-brand-700 hover:text-brand-800 min-h-target inline-flex items-center font-semibold"
      >
        {action}
      </Link>
    </>
  );
}
