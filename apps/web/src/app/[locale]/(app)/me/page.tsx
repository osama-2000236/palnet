"use client";

import { Profile as ProfileSchema } from "@baydar/shared";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch, getValidAccessToken } from "@/lib/api";

export default function MeRedirectPage(): JSX.Element {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveProfile(): Promise<void> {
      const token = await getValidAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const me = await apiFetch("/profiles/me", ProfileSchema, { token });
        if (!cancelled) router.replace(`/in/${me.handle}`);
      } catch {
        if (cancelled) return;
        setFallback(true);
        router.replace("/me/edit");
      }
    }

    void resolveProfile();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-3 px-6 py-16"
    >
      <span className="text-ink-muted text-sm">
        {fallback ? tCommon("redirecting") : tCommon("loading")}
      </span>
    </main>
  );
}
