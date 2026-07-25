"use client";

import {
  cursorPage,
  Notification as NotificationSchema,
  WsNotificationEvent,
  type Notification,
} from "@baydar/shared";
import { EmptyState, Surface, useToast } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetchPage, getValidAccessToken } from "@/lib/api";
import { useDismissNotification } from "@/lib/api/notifications";
import { openStream } from "@/lib/sse";
import {
  NotificationsErrorState,
  NotificationsList,
  NotificationsLoadMore,
  NotificationsSkeleton,
} from "./_components/NotificationsParts";

const NotificationsPage = cursorPage(NotificationSchema);

export default function NotificationsPageRoute(): JSX.Element {
  const t = useTranslations("notifications");
  const { showToast } = useToast();
  const router = useRouter();
  const dismissNotification = useDismissNotification();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [sseLive, setSseLive] = useState(false);

  // Session bootstrap — getValidAccessToken (not readSession): on a hard
  // reload the persisted session has no access token until the refresh runs.
  useEffect(() => {
    let cancelled = false;
    void getValidAccessToken().then((tk) => {
      if (cancelled) return;
      if (!tk) {
        router.replace("/login");
        return;
      }
      setToken(tk);
    });
    return (): void => {
      cancelled = true;
    };
  }, [router]);

  const load = useCallback(async (after: string | null, tk: string): Promise<void> => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "30" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(`/notifications?${qs.toString()}`, NotificationsPage, {
        token: tk,
      });
      setItems((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
      setLoadError(false);
    } catch {
      setLoadError(true);
      if (!after) {
        setItems([]);
        setCursor(null);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, []);

  // Initial load + mark-all-read on open.
  useEffect(() => {
    if (!token) return;
    void load(null, token);
    void apiCall("/notifications/read", {
      method: "POST",
      token,
      body: { all: true },
    }).catch(() => {});
  }, [token, load]);

  // SSE: prepend new notifications, reconcile read state.
  useEffect(() => {
    if (!token) return;
    const unsubscribe = openStream("notifications", token, {
      onOpen: () => setSseLive(true),
      onDrop: () => setSseLive(false),
      onFailed: () => setSseLive(false),
      onEvent: (data) => {
        try {
          const parsed = WsNotificationEvent.safeParse(JSON.parse(data));
          if (!parsed.success) return;
          const ev = parsed.data;
          if (ev.type === "notification.new") {
            const n = ev.payload;
            setItems((prev) => {
              if (prev.some((x) => x.id === n.id)) return prev;
              return [n, ...prev];
            });
            // Live page — mark the fresh one as read immediately.
            if (token) {
              void apiCall("/notifications/read", {
                method: "POST",
                token,
                body: { ids: [n.id] },
              }).catch(() => {});
            }
          } else if (ev.type === "notification.read") {
            const { ids, at } = ev.payload;
            setItems((prev) =>
              prev.map((x) =>
                ids.length === 0 || ids.includes(x.id) ? { ...x, readAt: x.readAt ?? at } : x,
              ),
            );
          }
        } catch {
          /* ignore */
        }
      },
    });
    return (): void => {
      unsubscribe();
      setSseLive(false);
    };
  }, [token]);

  const dismissItem = useCallback(
    (item: Notification): void => {
      setItems((prev) => prev.filter((candidate) => candidate.id !== item.id));
      dismissNotification.mutate(item.id, {
        onSuccess: () => {
          showToast({ message: t("dismiss.success"), kind: "success" });
        },
        onError: () => {
          setItems((prev) => restoreNotification(prev, item));
          showToast({ message: t("dismiss.error"), kind: "error" });
        },
      });
    },
    [dismissNotification, showToast, t],
  );

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-6 py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-ink text-2xl font-bold">{t("title")}</h1>
        {sseLive ? (
          <span className="bg-success/10 text-success inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs">
            <span className="bg-success h-1.5 w-1.5 rounded-full" />
            {t("live")}
          </span>
        ) : null}
      </header>

      {firstLoad ? (
        <NotificationsSkeleton />
      ) : loadError && items.length === 0 ? (
        <NotificationsErrorState
          title={t("errorTitle")}
          body={t("errorBody")}
          retryLabel={t("retry")}
          loading={loading}
          onRetry={() => {
            if (token) void load(null, token);
          }}
        />
      ) : items.length === 0 ? (
        <Surface variant="card" padding="0">
          <EmptyState motif="notifications" title={t("empty")} />
        </Surface>
      ) : (
        <NotificationsList
          items={items}
          dismissing={dismissNotification.isPending}
          onDismiss={dismissItem}
        />
      )}

      {hasMore && token ? (
        <NotificationsLoadMore
          loading={loading}
          label={t("loadMore")}
          loadingLabel={t("loading")}
          onClick={() => void load(cursor, token)}
        />
      ) : null}
    </main>
  );
}

function restoreNotification(items: Notification[], item: Notification): Notification[] {
  if (items.some((candidate) => candidate.id === item.id)) return items;
  return [...items, item].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
