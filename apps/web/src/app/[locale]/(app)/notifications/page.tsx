"use client";

import {
  cursorPage,
  Notification as NotificationSchema,
  NotificationType,
  WsNotificationEvent,
  type Notification,
} from "@palnet/shared";
import { Avatar, Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";

const NotificationsPage = cursorPage(NotificationSchema);
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function NotificationsPageRoute(): JSX.Element {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const load = useCallback(
    async (after: string | null, tk: string): Promise<void> => {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ limit: "30" });
        if (after) qs.set("after", after);
        const page = await apiFetchPage(
          `/notifications?${qs.toString()}`,
          NotificationsPage,
          { token: tk },
        );
        setItems((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

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
    const url = `${API_BASE}/notifications/stream?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.onopen = (): void => setSseLive(true);
    es.onerror = (): void => setSseLive(false);
    es.onmessage = (evt): void => {
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
              ids.length === 0 || ids.includes(x.id)
                ? { ...x, readAt: x.readAt ?? at }
                : x,
            ),
          );
        }
      } catch {
        /* ignore */
      }
    };
    return (): void => {
      es.close();
      setSseLive(false);
    };
  }, [token]);

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-6 py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
        {sseLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("live")}
          </span>
        ) : null}
      </header>

      {items.length === 0 && !loading ? (
        <Surface variant="flat" padding="6" className="text-sm text-ink-muted">
          {t("empty")}
        </Surface>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationRow item={n} />
            </li>
          ))}
        </ul>
      )}

      {hasMore && token ? (
        <button
          type="button"
          onClick={() => void load(cursor, token)}
          disabled={loading}
          className="self-center rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink hover:bg-ink-muted/5 disabled:opacity-60"
        >
          {loading ? t("loading") : t("loadMore")}
        </button>
      ) : null}
    </main>
  );
}

function NotificationRow({ item }: { item: Notification }): JSX.Element {
  const tTemplates = useTranslations("notifications.templates");
  const actor = item.actor;
  const actorName = actor
    ? `${actor.firstName} ${actor.lastName}`.trim() || actor.handle
    : ""; // system notification

  const template = templateKeyFor(item.type);
  const body = tTemplates(template, { actor: actorName });
  const unread = item.readAt === null;
  const href = hrefFor(item);

  const content = (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 transition ${
        unread
          ? "border-brand-500/30 bg-brand-50"
          : "border-ink-muted/20 bg-surface"
      }`}
    >
      <Avatar user={actor ?? { handle: "system" }} size="md" />

      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-sm text-ink">{body}</p>
        <p className="text-xs text-ink-muted">{formatRelative(item.createdAt)}</p>
      </div>
      {unread ? (
        <span
          aria-hidden="true"
          className="mt-1 h-2 w-2 flex-none rounded-full bg-accent-600"
        />
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {content}
    </Link>
  ) : (
    content
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

function formatRelative(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const secs = Math.max(0, Math.round((now - then) / 1000));
    if (secs < 60) return `${secs}s`;
    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return "";
  }
}
