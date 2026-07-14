"use client";

// Client-side role gate for /(admin)/*.
//
// This is defense-in-depth: the API also enforces role checks on every admin
// endpoint and will return 403 to non-admins. The gate here prevents the UI
// from rendering at all for unauthorized users and avoids fetching admin
// data that would just error.
//
// Allowed roles: ADMIN, MODERATOR. COMPANY_ADMIN does NOT get admin access —
// they have their own /employer surfaces.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

import { readSession } from "@/lib/session";

const ALLOWED_ROLES = new Set(["ADMIN", "MODERATOR"]);

export default function AdminLayout({ children }: { children: ReactNode }): JSX.Element | null {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!ALLOWED_ROLES.has(session.user.role)) {
      router.replace("/feed");
      return;
    }
    setRole(session.user.role);
  }, [router]);

  if (role === null) return null;

  const links: { href: string; label: string; adminOnly?: boolean }[] = [
    { href: "/moderation", label: t("moderation") },
    { href: "/billing", label: t("billing"), adminOnly: true },
  ];

  return (
    <>
      <nav
        aria-label={t("label")}
        className="border-line-soft bg-surface sticky top-0 z-20 border-b"
      >
        <div className="mx-auto flex w-full max-w-[1040px] items-center gap-1 px-6 py-2">
          {links
            .filter((link) => !link.adminOnly || role === "ADMIN")
            .map((link) => {
              const active = pathname?.endsWith(link.href) ?? false;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] ${
                    active ? "bg-brand-50 text-brand-700" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          <span className="flex-1" />
          <Link
            href="/feed"
            className="text-ink-muted hover:text-ink rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {t("backToApp")}
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
}
