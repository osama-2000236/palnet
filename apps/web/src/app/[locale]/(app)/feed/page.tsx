"use client";

import { type Post, cursorPage } from "@palnet/shared";
import { Surface } from "@palnet/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";
import { apiFetchPage } from "@/lib/api";
import { Post as PostSchema } from "@palnet/shared";
import { getAccessToken, readSession } from "@/lib/session";

const FeedPage = cursorPage(PostSchema);

export default function FeedPageRoute(): JSX.Element {
  const t = useTranslations("feed");
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState<string | null>(null);

  const load = useCallback(async (after: string | null): Promise<void> => {
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(`/feed?${qs.toString()}`, FeedPage, {
        token,
      });
      setPosts((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setName(session.user.email.split("@")[0] ?? session.user.email);
    void load(null);
  }, [router, load]);

  return (
    <main className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-ink">{t("title")}</h1>
        {name ? (
          <p className="text-ink-muted" data-testid="feed-welcome">
            {t("welcome", { name })}
          </p>
        ) : null}
      </header>

      <Composer onPosted={(p) => setPosts((prev) => [p, ...prev])} />

      {posts.length === 0 && !loading ? (
        <Surface variant="flat" padding="6" className="text-ink-muted">
          {t("empty")}
        </Surface>
      ) : (
        <ul className="flex flex-col gap-4">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard
                post={p}
                onChange={(next) =>
                  setPosts((prev) =>
                    prev.map((x) => (x.id === next.id ? next : x)),
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={() => void load(cursor)}
          disabled={loading}
          className="self-center rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink hover:bg-ink-muted/5 disabled:opacity-60"
        >
          {loading ? t("loadingMore") : t("loadMore")}
        </button>
      ) : null}
    </main>
  );
}
