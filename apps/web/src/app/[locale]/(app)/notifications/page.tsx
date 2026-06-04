"use client";

import {
  cursorPage,
  formatRelativeTime,
  Notification as NotificationSchema,
  NotificationType,
  WsNotificationEvent,
  type Notification,
} from "@baydar/shared";
import { Avatar, EmptyState, Skeleton, Surface, useToast } from "@baydar/ui-web";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetchPage } from "@/lib/api";
import { useDismissNotification } from "@/lib/api/notifications";
import { readSession } from "@/lib/session";
import { openStream } from "@/lib/sse";

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
  const [sseLive, setSseLive] = useState(false);

  // Session bootstrap.
  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
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
    let es: EventSource | null = null;
    let cancelled = false;
    void openStream("notifications", token)
      .then((source) => {
        if (cancelled) {
          source.close();
          return;
        }
        es = source;
        source.onopen = (): void => setSseLive(true);
        source.onerror = (): void => setSseLive(false);
        source.onmessage = (evt): void => {
          try {
            const parsed = WsNotificationEvent.safeParse(JSON.parse(evt.data));
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
        };
      })
      .catch(() => setSseLive(false));
    return (): void => {
      cancelled = true;
      es?.close();
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
        <ul className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <li key={i}>
              <NotificationRowSkeleton />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <Surface variant="card" padding="0">
          <EmptyState motif="notifications" title={t("empty")} />
        </Surface>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationRow
                item={n}
                dismissing={dismissNotification.isPending}
                onDismiss={dismissItem}
              />
            </li>
          ))}
        </ul>
      )}

      {hasMore && token ? (
        <button
          type="button"
          onClick={() => void load(cursor, token)}
          disabled={loading}
          className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 self-center rounded-md border px-4 py-2 text-sm disabled:opacity-60"
        >
          {loading ? t("loading") : t("loadMore")}
        </button>
      ) : null}
    </main>
  );
}

function NotificationRow({
  item,
  dismissing,
  onDismiss,
}: {
  item: Notification;
  dismissing: boolean;
  onDismiss: (item: Notification) => void;
}): JSX.Element {
  const t = useTranslations("notifications");
  const tTemplates = useTranslations("notifications.templates");
  const locale = useLocale();
  const actor = item.actor;
  const actorName = actor ? `${actor.firstName} ${actor.lastName}`.trim() || actor.handle : ""; // system notification

  const template = templateKeyFor(item.type);
  const body = tTemplates(template, { actor: actorName });
  const unread = item.readAt === null;
  const href = hrefFor(item);

  const content = (
    <>
      <Avatar user={actor ?? { handle: "system" }} size="md" />

      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-ink text-sm">{body}</p>
        <p className="text-ink-muted text-xs">{formatRelativeTime(item.createdAt, locale)}</p>
      </div>
      {unread ? (
        <span aria-hidden="true" className="bg-accent-600 mt-1 h-2 w-2 flex-none rounded-full" />
      ) : null}
    </>
  );

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 transition ${
        unread ? "border-brand-500/30 bg-brand-50" : "border-ink-muted/20 bg-surface"
      }`}
    >
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-start gap-3 hover:opacity-90">
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
      )}
      <button
        type="button"
        className="text-ink-muted hover:text-danger hover:bg-danger/10 flex h-9 w-9 flex-none items-center justify-center rounded-md focus-visible:[box-shadow:var(--focus-ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={t("dismiss.aria")}
        title={t("dismiss.action")}
        disabled={dismissing}
        onClick={() => onDismiss(item)}
      >
        <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

function NotificationRowSkeleton(): JSX.Element {
  return (
    <div className="border-ink-muted/20 bg-surface flex items-start gap-3 rounded-md border p-3">
      <Skeleton kind="circle" className="h-10 w-10" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

function templateKeyFor(type: Notification["type"]): string {
  return type; // keys in locale files are the enum values verbatim
}

function hrefFor(n: Notification): string | null {
  if (n.type === NotificationType.MESSAGE_RECEIVED) {
    // Room id lives in data.roomId — see messaging.service.ts.
    const data = n.data as { roomId?: string } | null;
    if (data?.roomId) return `/messages?room=${encodeURIComponent(data.roomId)}`;
    return "/messages";
  }
  if (
    n.type === NotificationType.CONNECTION_REQUEST ||
    n.type === NotificationType.CONNECTION_ACCEPTED
  ) {
    return "/network";
  }
  if (
    n.type === NotificationType.POST_REACTION ||
    n.type === NotificationType.POST_COMMENT ||
    n.type === NotificationType.POST_MENTION
  ) {
    if (n.postId) return `/feed#post-${n.postId}`;
    return "/feed";
  }
  if (n.type === NotificationType.PROFILE_VIEW && n.actor?.handle) {
    return `/in/${n.actor.handle}`;
  }
  return null;
}

function restoreNotification(items: Notification[], item: Notification): Notification[] {
  if (items.some((candidate) => candidate.id === item.id)) return items;
  return [...items, item].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
