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

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { readSession } from "@/lib/session";

const ALLOWED_ROLES = new Set(["ADMIN", "MODERATOR"]);

export default function AdminLayout({ children }: { children: ReactNode }): JSX.Element | null {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

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
    setAuthorized(true);
  }, [router]);

  if (authorized !== true) return null;
  return <>{children}</>;
}
