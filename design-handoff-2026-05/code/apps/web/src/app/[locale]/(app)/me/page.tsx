"use client";

// /me — the canonical self-profile route. Closes the gap noted in
// design-handoff-2026-05/PRODUCT-HEALTH.md §2: the AppShell wants a stable
// "/me" target for the profile nav slot, but only /me/edit and /me/karama
// existed; the AppShell falls back to /in/[handle] when it knows the
// handle, and to /me/edit (an EDIT form, wrong) when it doesn't.
//
// This page does the smallest correct thing: resolve the viewer's handle
// once, then redirect to the public profile route /in/[handle]. The actual
// rendering lives in /in/[handle]/page.tsx — one source of truth for the
// profile UI.
//
// If the API call fails we let the (app)/error.tsx boundary catch it; if
// there's no session the (app) layout has already redirected to /login.

import { Profile as ProfileSchema, type Profile } from "@baydar/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function MeRedirectPage(): JSX.Element {
  const router = useRouter();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return; // (app) layout handles redirect.

    let cancelled = false;
    void apiFetch<typeof ProfileSchema>("/profiles/me", ProfileSchema, { token })
      .then((me: Profile) => {
        if (cancelled) return;
        // `replace` so /me doesn't sit in history above /in/[handle].
        router.replace(`/in/${me.handle}`);
      })
      .catch(() => {
        // Fall back to the edit screen — at least the user gets an actionable
        // place to land. Surface a hint after a tick so the redirect doesn't
        // race ahead of the render.
        if (cancelled) return;
        setStuck(true);
        router.replace("/me/edit");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Minimal placeholder — the (app)/loading.tsx skeleton already covered the
  // gap before this component mounted, so we render an aria-busy stub.
  return (
    <main
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-3 px-6 py-16"
    >
      <span className="text-ink-muted text-sm">{stuck ? "Redirecting…" : "Loading your profile…"}</span>
    </main>
  );
}
