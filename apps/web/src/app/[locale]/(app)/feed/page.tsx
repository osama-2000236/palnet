"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { readSession } from "@/lib/session";

export default function FeedPage(): JSX.Element {
  const t = useTranslations("feed");
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setName(session.user.email.split("@")[0] ?? session.user.email);
  }, [router]);

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-6 py-12">
      <h1 className="text-3xl font-bold text-ink">{t("title")}</h1>
      {name ? (
        <p className="text-ink-muted" data-testid="feed-welcome">
          {t("welcome", { name })}
        </p>
      ) : null}
      <div className="rounded-md border border-ink-muted/20 p-6 text-ink-muted">
        {t("empty")}
      </div>
    </main>
  );
}
