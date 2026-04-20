"use client";

import {
  ChatRoom as ChatRoomSchema,
  CursorPageMeta,
  Message as MessageSchema,
  WsChatEvent,
  type ChatRoom,
  type Message,
} from "@palnet/shared";
import { Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";

import { apiCall, apiFetch, ApiRequestError, apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";

const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });
const MessagesPageEnvelope = z.object({
  data: z.array(MessageSchema),
  meta: CursorPageMeta,
});

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export default function MessagesPage(): JSX.Element {
  const t = useTranslations("messaging");
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sseLive, setSseLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  // Session bootstrap.
  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setViewerId(session.user.id);
    setToken(session.tokens.accessToken);
  }, [router]);

  // Initial room list.
  const loadRooms = useCallback(async (tk: string): Promise<ChatRoom[]> => {
    const out = await apiFetchPage("/messaging/rooms", RoomsEnvelope, {
      token: tk,
    });
    setRooms(out.data);
    return out.data;
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadRooms(token).then((list) => {
      if (!activeRoomId && list.length > 0) {
        setActiveRoomId(list[0]!.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Messages for active room.
  const loadMessages = useCallback(
    async (roomId: string, after: string | null): Promise<void> => {
      if (!token) return;
      const qs = new URLSearchParams({ limit: "30" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(
        `/messaging/rooms/${roomId}/messages?${qs.toString()}`,
        MessagesPageEnvelope,
        { token },
      );
      // API returns newest-first; display oldest-first.
      const asc = [...page.data].reverse();
      setMessages((prev) => (after ? [...asc, ...prev] : asc));
      setNextCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    },
    [token],
  );

  useEffect(() => {
    if (!activeRoomId || !token) return;
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    void loadMessages(activeRoomId, null).then(() => {
      // Mark as read once loaded.
      if (activeRoomId) {
        void apiCall(`/messaging/rooms/${activeRoomId}/read`, {
          method: "POST",
          token,
        }).catch(() => {});
      }
      // Scroll to newest.
      requestAnimationFrame(() => {
        if (threadRef.current) {
          threadRef.current.scrollTop = threadRef.current.scrollHeight;
        }
      });
    });
  }, [activeRoomId, token, loadMessages]);

  // SSE subscription — keyed by token so reconnects cleanly on login change.
  useEffect(() => {
    if (!token) return;
    const url = `${API_BASE}/messaging/stream?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.onopen = (): void => setSseLive(true);
    es.onerror = (): void => setSseLive(false);
    es.onmessage = (evt): void => {
      try {
        const parsed = WsChatEvent.safeParse(JSON.parse(evt.data));
        if (!parsed.success) return;
        handleEvent(parsed.data);
      } catch {
        // ignore malformed
      }
    };
    return (): void => {
      es.close();
      setSseLive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleEvent = useCallback(
    (event: WsChatEvent): void => {
      if (event.type === "message.new") {
        const m = event.payload;
        // Update active thread if this message belongs to it.
        setMessages((prev) => {
          if (m.roomId !== activeRoomId) return prev;
          // Reconcile with optimistic copy by clientMessageId.
          const idx = prev.findIndex(
            (x) => x.clientMessageId && x.clientMessageId === m.clientMessageId,
          );
          if (idx >= 0) {
            const next = prev.slice();
            next[idx] = m;
            return next;
          }
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
        // Nudge room list — bump lastMessage & unread count for inactive rooms.
        setRooms((prev) =>
          prev
            .map((r) => {
              if (r.id !== m.roomId) return r;
              const isActive = r.id === activeRoomId;
              return {
                ...r,
                lastMessage: m,
                unreadCount:
                  isActive || m.authorId === viewerId
                    ? 0
                    : r.unreadCount + 1,
                updatedAt: m.createdAt,
              };
            })
            .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
        );
        // If active, auto-scroll and mark read.
        if (m.roomId === activeRoomId && token) {
          requestAnimationFrame(() => {
            if (threadRef.current) {
              threadRef.current.scrollTop = threadRef.current.scrollHeight;
            }
          });
          if (m.authorId !== viewerId) {
            void apiCall(`/messaging/rooms/${m.roomId}/read`, {
              method: "POST",
              token,
            }).catch(() => {});
          }
        }
      } else if (event.type === "message.read") {
        const { roomId, userId, at } = event.payload;
        setRooms((prev) =>
          prev.map((r) => {
            if (r.id !== roomId) return r;
            return {
              ...r,
              members: r.members.map((mem) =>
                mem.userId === userId ? { ...mem, lastReadAt: at } : mem,
              ),
            };
          }),
        );
      }
    },
    [activeRoomId, token, viewerId],
  );

  async function submit(): Promise<void> {
    if (!activeRoomId || !token || draft.trim().length === 0) return;
    setSending(true);
    setError(null);
    const clientMessageId = `web-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const optimistic: Message = {
      id: `pending-${clientMessageId}`,
      roomId: activeRoomId,
      authorId: viewerId ?? "me",
      body: draft.trim(),
      mediaUrl: null,
      clientMessageId,
      createdAt: new Date().toISOString(),
      editedAt: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    try {
      const saved = await apiFetch(
        `/messaging/rooms/${activeRoomId}/messages`,
        MessageSchema,
        {
          method: "POST",
          token,
          body: { body: optimistic.body, clientMessageId },
        },
      );
      // Reconcile — SSE usually wins but ensure the pending row is replaced.
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.clientMessageId === clientMessageId);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = saved;
        return next;
      });
    } catch (err) {
      // Drop the optimistic row on failure.
      setMessages((prev) =>
        prev.filter((x) => x.clientMessageId !== clientMessageId),
      );
      if (err instanceof ApiRequestError) {
        setError(t("sendFailed"));
      } else {
        setError(t("sendFailed"));
      }
    } finally {
      setSending(false);
    }
  }

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );
  const otherMember = useMemo(() => {
    if (!activeRoom || !viewerId) return null;
    return activeRoom.members.find((m) => m.userId !== viewerId) ?? null;
  }, [activeRoom, viewerId]);

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-6 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">{t("title")}</h1>
        {sseLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("online")}
          </span>
        ) : null}
      </header>

      <div className="grid min-h-[520px] grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        {/* Rooms list */}
        <Surface as="aside" variant="card" padding="2" className="flex flex-col gap-1">
          {rooms.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted">{t("emptyList")}</p>
          ) : (
            rooms.map((room) => {
              const other = viewerId
                ? room.members.find((m) => m.userId !== viewerId)
                : null;
              const label = other
                ? `${other.firstName} ${other.lastName}`.trim() || other.handle
                : (room.title ?? room.id);
              const isActive = room.id === activeRoomId;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setActiveRoomId(room.id)}
                  className={`flex flex-col gap-1 rounded-md px-3 py-2 text-start ${
                    isActive
                      ? "bg-brand-50 text-ink"
                      : "text-ink hover:bg-ink-muted/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {label}
                    </span>
                    {room.unreadCount > 0 ? (
                      <span className="rounded-full bg-accent-600 px-1.5 text-xs text-ink-inverse">
                        {room.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  {room.lastMessage ? (
                    <span className="truncate text-xs text-ink-muted">
                      {room.lastMessage.body}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </Surface>

        {/* Active thread */}
        <Surface as="section" variant="card" padding="0" className="flex min-h-[520px] flex-col">
          {!activeRoomId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-ink-muted">
              {t("selectPrompt")}
            </div>
          ) : (
            <>
              <div className="border-b border-ink-muted/10 px-4 py-3">
                {otherMember ? (
                  <Link
                    href={`/in/${otherMember.handle}`}
                    className="text-sm font-semibold text-ink hover:underline"
                  >
                    {`${otherMember.firstName} ${otherMember.lastName}`.trim() ||
                      otherMember.handle}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-ink">
                    {activeRoom?.title ?? activeRoomId}
                  </span>
                )}
              </div>

              <div
                ref={threadRef}
                className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
              >
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() =>
                      activeRoomId &&
                      nextCursor &&
                      void loadMessages(activeRoomId, nextCursor)
                    }
                    className="self-center rounded-md border border-ink-muted/30 px-3 py-1 text-xs text-ink hover:bg-ink-muted/5"
                  >
                    {t("loadOlder")}
                  </button>
                ) : null}

                {messages.length === 0 ? (
                  <p className="py-6 text-center text-sm text-ink-muted">
                    {t("emptyThread")}
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.authorId === viewerId;
                    return (
                      <div
                        key={m.id}
                        className={`flex max-w-[75%] flex-col gap-0.5 rounded-lg px-3 py-2 text-sm ${
                          mine
                            ? "self-end bg-brand-600 text-ink-inverse"
                            : "self-start bg-ink-muted/10 text-ink"
                        }`}
                      >
                        <span className="whitespace-pre-wrap break-words">
                          {m.body}
                        </span>
                        <span
                          className={`text-[10px] ${
                            mine ? "text-ink-inverse/70" : "text-ink-muted"
                          }`}
                        >
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {error ? (
                <p
                  role="alert"
                  className="border-t border-danger/20 bg-danger/10 px-4 py-2 text-sm text-danger"
                >
                  {error}
                </p>
              ) : null}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
                className="flex items-end gap-2 border-t border-ink-muted/10 p-3"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("composePlaceholder")}
                  rows={2}
                  maxLength={5000}
                  className="flex-1 resize-none rounded-md border border-ink-muted/30 p-2 text-sm text-ink"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || draft.trim().length === 0}
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm text-ink-inverse shadow-card hover:bg-brand-700 disabled:opacity-60"
                >
                  {t("send")}
                </button>
              </form>
            </>
          )}
        </Surface>
      </div>
    </main>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
