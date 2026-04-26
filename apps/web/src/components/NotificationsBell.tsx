"use client";

import { WsNotificationEvent } from "@palnet/shared";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const CountEnvelope = z.object({ count: z.number().int().nonnegative() });

/**
 * Bell icon with a live unread counter. Subscribes to /notifications/stream
 * so the badge updates instantly when a new notification arrives elsewhere in
 * the app (or is marked read from another tab).
 */
export function NotificationsBell(): JSX.Element | null {
  const t = useTranslations("notifications");
  const [count, setCount] = useState<number>(0);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(getAccessToken());
  }, []);

  // Initial fetch.
  useEffect(() => {
    if (!token) return;
    void apiFetch("/notifications/unread-count", CountEnvelope, { token })
      .then((out) => setCount(out.count))
      .catch(() => {
        /* ignore */
      });
  }, [token]);

  // Live updates via SSE.
  useEffect(() => {
    if (!token) return;
    const url = `${API_BASE}/notifications/stream?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    const handleNotificationEvent = (evt: MessageEvent): void => {
      try {
        const parsed = WsNotificationEvent.safeParse(JSON.parse(evt.data));
        if (!parsed.success) return;
        const ev = parsed.data;
        if (ev.type === "notification.unread-count") {
          setCount(ev.payload.count);
        } else if (ev.type === "notification.new") {
          setCount((c) => c + 1);
        }
      } catch {
        /* ignore */
      }
    };
    es.onmessage = handleNotificationEvent;
    es.addEventListener("notification.new", handleNotificationEvent);
    es.addEventListener("notification.unread-count", handleNotificationEvent);
    return (): void => {
      es.close();
    };
  }, [token]);

  if (!token) return null;

  const display = count > 99 ? "99+" : String(count);

  return (
    <Link
      href="/notifications"
      aria-label={t("title")}
      title={t("title")}
      className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 relative inline-flex h-9 w-9 items-center justify-center rounded-md border"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5" />
        <path d="M9 17a3 3 0 0 0 6 0" />
      </svg>
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="bg-accent-600 text-ink-inverse h-badge min-w-badge text-micro absolute -end-1 -top-1 inline-flex items-center justify-center rounded-full px-1 text-center font-semibold leading-none"
        >
          {display}
        </span>
      ) : null}
    </Link>
  );
}
