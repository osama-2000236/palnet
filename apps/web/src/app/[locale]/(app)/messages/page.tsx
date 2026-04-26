"use client";

// Messages page — room list on the start side, active thread on the other.
// Spec: docs/design/prototype/components/MessagesPage.jsx.
//
// Owns the network concerns (REST + SSE); delegates all visuals to
// @palnet/ui-web shells (MessageBubble, RoomRow, TypingIndicator, Avatar,
// Surface, Icon). Grouping logic lives in the shared `groupMessages` helper.

import {
  ChatRoom as ChatRoomSchema,
  CursorPageMeta,
  Message as MessageSchema,
  WsChatEvent,
  type ChatRoom,
  type Message,
} from "@palnet/shared";
import {
  Avatar,
  Icon,
  MessageBubble,
  RoomRow,
  Surface,
  TypingIndicator,
  groupMessages,
  type MessageStatus,
} from "@palnet/ui-web";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { MoreMenu } from "@/components/MoreMenu";
import { ReportDialog } from "@/components/ReportDialog";
import { apiCall, apiFetch, ApiRequestError, apiFetchPage } from "@/lib/api";
import { readSession } from "@/lib/session";

const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });
const MessagesPageEnvelope = z.object({
  data: z.array(MessageSchema),
  meta: CursorPageMeta,
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// Presence threshold — considered "online" if lastSeenAt is within this window.
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
// Typing indicator auto-expires after this much silence from the sender.
const TYPING_TTL_MS = 5 * 1000;
// Minimum gap between outgoing typing POSTs while the user is actively typing.
const TYPING_POST_THROTTLE_MS = 3 * 1000;

export default function MessagesPage(): JSX.Element {
  return (
    <Suspense fallback={<MessagesPageFallback />}>
      <MessagesPageContent />
    </Suspense>
  );
}

function MessagesPageContent(): JSX.Element {
  const t = useTranslations("messaging");
  const tModeration = useTranslations("moderation");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRoomId = searchParams.get("room");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typingUserByRoom, setTypingUserByRoom] = useState<
    Record<string, { userId: string; expiresAt: number }>
  >({});
  const [failedClientIds, setFailedClientIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [blockingUser, setBlockingUser] = useState(false);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const lastTypingPostRef = useRef<{ roomId: string | null; at: number }>({
    roomId: null,
    at: 0,
  });

  // ───────── Session bootstrap ─────────
  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setViewerId(session.user.id);
    setToken(session.tokens.accessToken);
  }, [router]);

  // ───────── Initial room list ─────────
  const loadRooms = useCallback(async (tk: string): Promise<ChatRoom[]> => {
    const out = await apiFetchPage("/messaging/rooms", RoomsEnvelope, {
      token: tk,
    });
    setRooms(out.data);
    return out.data;
  }, []);

  const loadRoomById = useCallback(async (roomId: string, tk: string): Promise<void> => {
    const room = await apiFetch(`/messaging/rooms/${roomId}`, ChatRoomSchema, {
      token: tk,
    });
    setRooms((prev) => {
      const existing = prev.findIndex((item) => item.id === room.id);
      if (existing >= 0) {
        const next = prev.slice();
        next[existing] = room;
        return next;
      }
      return [room, ...prev];
    });
    setActiveRoomId(room.id);
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadRooms(token).then((list) => {
      if (
        requestedRoomId &&
        list.some((room) => room.id === requestedRoomId) &&
        activeRoomId !== requestedRoomId
      ) {
        setActiveRoomId(requestedRoomId);
        return;
      }
      if (!requestedRoomId && !activeRoomId && list.length > 0) {
        setActiveRoomId(list[0]!.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, requestedRoomId]);

  useEffect(() => {
    if (
      requestedRoomId &&
      rooms.some((room) => room.id === requestedRoomId) &&
      activeRoomId !== requestedRoomId
    ) {
      setActiveRoomId(requestedRoomId);
    }
  }, [activeRoomId, requestedRoomId, rooms]);

  useEffect(() => {
    if (!token || !requestedRoomId || rooms.some((room) => room.id === requestedRoomId)) {
      return;
    }

    void loadRoomById(requestedRoomId, token).catch(() => {});
  }, [loadRoomById, requestedRoomId, rooms, token]);

  // ───────── Messages for active room ─────────
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
      if (activeRoomId) {
        void apiCall(`/messaging/rooms/${activeRoomId}/read`, {
          method: "POST",
          token,
        }).catch(() => {});
      }
      requestAnimationFrame(() => {
        if (threadRef.current) {
          threadRef.current.scrollTop = threadRef.current.scrollHeight;
        }
      });
    });
  }, [activeRoomId, token, loadMessages]);

  // ───────── SSE ─────────
  useEffect(() => {
    if (!token) return;
    const url = `${API_BASE}/messaging/stream?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleEvent = useCallback(
    (event: WsChatEvent): void => {
      if (event.type === "message.new") {
        const m = event.payload;
        setMessages((prev) => {
          if (m.roomId !== activeRoomId) return prev;
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
        setRooms((prev) =>
          prev
            .map((r) => {
              if (r.id !== m.roomId) return r;
              const isActive = r.id === activeRoomId;
              return {
                ...r,
                lastMessage: m,
                unreadCount: isActive || m.authorId === viewerId ? 0 : r.unreadCount + 1,
                updatedAt: m.createdAt,
              };
            })
            .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
        );
        // Clear the typing indicator from the sender the moment their message lands.
        setTypingUserByRoom((prev) => {
          if (!prev[m.roomId]) return prev;
          const next = { ...prev };
          delete next[m.roomId];
          return next;
        });
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
      } else if (event.type === "typing") {
        const { roomId, userId } = event.payload;
        if (userId === viewerId) return;
        setTypingUserByRoom((prev) => ({
          ...prev,
          [roomId]: { userId, expiresAt: Date.now() + TYPING_TTL_MS },
        }));
      }
    },
    [activeRoomId, token, viewerId],
  );

  // ───────── Typing TTL tick — prune expired entries ─────────
  useEffect(() => {
    if (Object.keys(typingUserByRoom).length === 0) return;
    const iv = setInterval(() => {
      setTypingUserByRoom((prev) => {
        const now = Date.now();
        let changed = false;
        const next: typeof prev = {};
        for (const [roomId, entry] of Object.entries(prev)) {
          if (entry.expiresAt > now) next[roomId] = entry;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return (): void => clearInterval(iv);
  }, [typingUserByRoom]);

  // ───────── Outgoing typing signal ─────────
  const postTypingThrottled = useCallback((): void => {
    if (!activeRoomId || !token) return;
    const now = Date.now();
    if (
      lastTypingPostRef.current.roomId === activeRoomId &&
      now - lastTypingPostRef.current.at < TYPING_POST_THROTTLE_MS
    ) {
      return;
    }
    lastTypingPostRef.current = { roomId: activeRoomId, at: now };
    void apiCall(`/messaging/rooms/${activeRoomId}/typing`, {
      method: "POST",
      token,
    }).catch(() => {
      // Typing is a best-effort signal; swallow errors silently.
    });
  }, [activeRoomId, token]);

  // ───────── Send ─────────
  async function submit(): Promise<void> {
    if (!activeRoomId || !token || draft.trim().length === 0) return;
    setSending(true);
    setError(null);
    const clientMessageId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    });
    try {
      const saved = await apiFetch(`/messaging/rooms/${activeRoomId}/messages`, MessageSchema, {
        method: "POST",
        token,
        body: { body: optimistic.body, clientMessageId },
      });
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.clientMessageId === clientMessageId);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = saved;
        return next;
      });
    } catch (err) {
      // Keep the optimistic row around, mark as failed so the user can retry.
      setFailedClientIds((prev) => {
        const next = new Set(prev);
        next.add(clientMessageId);
        return next;
      });
      setError(err instanceof ApiRequestError ? t("sendFailed") : t("sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function retryFailed(clientMessageId: string): Promise<void> {
    const target = messages.find((m) => m.clientMessageId === clientMessageId);
    if (!target || !activeRoomId || !token) return;
    setFailedClientIds((prev) => {
      const next = new Set(prev);
      next.delete(clientMessageId);
      return next;
    });
    try {
      const saved = await apiFetch(`/messaging/rooms/${activeRoomId}/messages`, MessageSchema, {
        method: "POST",
        token,
        body: { body: target.body, clientMessageId },
      });
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.clientMessageId === clientMessageId);
        if (idx < 0) return prev;
        const next = prev.slice();
        next[idx] = saved;
        return next;
      });
    } catch {
      setFailedClientIds((prev) => {
        const next = new Set(prev);
        next.add(clientMessageId);
        return next;
      });
    }
  }

  // ───────── Derived state ─────────
  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) ?? null,
    [rooms, activeRoomId],
  );
  const otherMember = useMemo(() => {
    if (!activeRoom || !viewerId) return null;
    return activeRoom.members.find((m) => m.userId !== viewerId) ?? null;
  }, [activeRoom, viewerId]);

  const otherLastReadAtMs = useMemo(() => {
    if (!otherMember?.lastReadAt) return 0;
    return Date.parse(otherMember.lastReadAt);
  }, [otherMember]);

  const otherOnline = useMemo(
    () =>
      otherMember?.lastSeenAt
        ? Date.now() - Date.parse(otherMember.lastSeenAt) < ONLINE_WINDOW_MS
        : false,
    [otherMember],
  );

  const filteredRooms = useMemo(() => {
    const q = searchTerm.trim().toLocaleLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => {
      const other = viewerId ? r.members.find((m) => m.userId !== viewerId) : null;
      const haystack = [
        other?.firstName,
        other?.lastName,
        other?.handle,
        r.title,
        r.lastMessage?.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return haystack.includes(q);
    });
  }, [rooms, searchTerm, viewerId]);

  const grouped = useMemo(
    () =>
      groupMessages(messages, {
        authorId: (m) => m.authorId,
        createdAt: (m) => m.createdAt,
      }),
    [messages],
  );

  const activeTyping =
    activeRoomId && typingUserByRoom[activeRoomId] ? typingUserByRoom[activeRoomId] : null;

  async function blockOtherMember(): Promise<void> {
    if (!token || !activeRoomId || !otherMember || blockingUser) return;
    const name = `${otherMember.firstName} ${otherMember.lastName}`.trim() || otherMember.handle;
    const ok = window.confirm(
      `${tModeration("blockConfirmTitle", { name })}\n\n${tModeration("blockConfirmBody")}`,
    );
    if (!ok) return;
    setBlockingUser(true);
    try {
      await apiCall("/blocks", {
        method: "POST",
        token,
        body: { userId: otherMember.userId },
      });
      setRooms((prev) => prev.filter((room) => room.id !== activeRoomId));
      setActiveRoomId(null);
      setMessages([]);
      router.replace("/messages");
    } catch {
      setError(tModeration("blockErrorToast"));
    } finally {
      setBlockingUser(false);
    }
  }

  // ───────── Render ─────────
  return (
    <main className="max-w-chrome mx-auto w-full px-4 py-6 lg:px-6">
      <Surface
        as="section"
        variant="card"
        padding="0"
        className="md:grid-cols-messages grid min-h-[calc(100vh-var(--nav-h)-var(--mobile-tab-h))] grid-cols-1 overflow-hidden"
      >
        {/* Rooms list */}
        <div className="border-line-soft flex min-h-0 flex-col md:border-e">
          <div className="border-line-soft flex items-center justify-between gap-2 border-b px-4 py-3">
            <h1 className="text-ink text-base font-semibold">{t("title")}</h1>
            <button
              type="button"
              aria-label={t("newMessage")}
              className="text-ink-muted hover:bg-surface-subtle hover:text-ink focus-visible:ring-brand-600 inline-flex h-8 w-8 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2"
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
          <div className="px-3 py-2">
            <label className="bg-surface-subtle flex items-center gap-2 rounded-full px-3 py-1.5">
              <Icon name="search" size={14} />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="text-ink placeholder:text-ink-muted w-full bg-transparent text-sm focus:outline-none"
              />
            </label>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredRooms.length === 0 ? (
              <p className="text-ink-muted p-4 text-sm">
                {searchTerm ? t("searchNoResults") : t("emptyList")}
              </p>
            ) : (
              filteredRooms.map((room) => {
                const other = viewerId ? room.members.find((m) => m.userId !== viewerId) : null;
                const online =
                  other?.lastSeenAt != null &&
                  Date.now() - Date.parse(other.lastSeenAt) < ONLINE_WINDOW_MS;
                return (
                  <RoomRow
                    key={room.id}
                    user={
                      other
                        ? {
                            id: other.userId,
                            handle: other.handle,
                            firstName: other.firstName,
                            lastName: other.lastName,
                            avatarUrl: other.avatarUrl,
                          }
                        : { handle: room.title ?? room.id }
                    }
                    preview={room.lastMessage?.body ?? ""}
                    timestamp={shortTime(room.updatedAt, locale)}
                    unreadCount={room.unreadCount}
                    online={online}
                    active={room.id === activeRoomId}
                    onClick={() => setActiveRoomId(room.id)}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Active thread */}
        <section className="flex min-h-0 flex-col">
          {!activeRoomId ? (
            <div className="text-ink-muted flex flex-1 items-center justify-center p-8 text-sm">
              {t("selectPrompt")}
            </div>
          ) : (
            <>
              <header className="border-line-soft flex items-center gap-3 border-b px-5 py-3">
                {otherMember ? (
                  <>
                    <Link
                      href={`/in/${otherMember.handle}`}
                      aria-label={`${otherMember.firstName} ${otherMember.lastName}`.trim()}
                    >
                      <Avatar
                        user={{
                          id: otherMember.userId,
                          handle: otherMember.handle,
                          firstName: otherMember.firstName,
                          lastName: otherMember.lastName,
                          avatarUrl: otherMember.avatarUrl,
                        }}
                        size="md"
                        online={otherOnline}
                      />
                    </Link>
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={`/in/${otherMember.handle}`}
                        className="text-ink truncate text-sm font-semibold hover:underline"
                      >
                        {`${otherMember.firstName} ${otherMember.lastName}`.trim() ||
                          otherMember.handle}
                      </Link>
                      <span className="text-ink-muted text-nav">
                        {otherOnline
                          ? t("onlineNow")
                          : otherMember.lastSeenAt
                            ? `${t("lastSeen")} · ${shortDate(otherMember.lastSeenAt, locale)}`
                            : ""}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-ink text-sm font-semibold">
                    {activeRoom?.title ?? activeRoomId}
                  </span>
                )}
                {otherMember ? (
                  <div className="ms-auto">
                    <MoreMenu
                      label={tModeration("more")}
                      items={[
                        {
                          key: "block",
                          label: tModeration("blockUser", {
                            name:
                              `${otherMember.firstName} ${otherMember.lastName}`.trim() ||
                              otherMember.handle,
                          }),
                          danger: true,
                          onClick: () => void blockOtherMember(),
                        },
                      ]}
                    />
                  </div>
                ) : null}
              </header>

              <div
                ref={threadRef}
                className="bg-surface-subtle flex flex-1 flex-col overflow-y-auto px-5 py-4"
              >
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() =>
                      activeRoomId && nextCursor && void loadMessages(activeRoomId, nextCursor)
                    }
                    className="border-line-soft bg-surface text-ink-muted hover:bg-surface-muted text-nav mb-3 self-center rounded-full border px-3 py-1"
                  >
                    {t("loadOlder")}
                  </button>
                ) : null}

                {messages.length === 0 && !activeTyping ? (
                  <p className="text-ink-muted py-6 text-center text-sm">{t("emptyThread")}</p>
                ) : (
                  <ul role="log" aria-live="polite" className="flex flex-col gap-0.5">
                    {grouped.map(({ message: m, tail, showTimestamp, startsRun }) => {
                      const mine = m.authorId === viewerId;
                      const status: MessageStatus | undefined = mine
                        ? computeStatus(m, failedClientIds, otherLastReadAtMs)
                        : undefined;
                      return (
                        <div key={m.id} className={startsRun ? "mt-2 first:mt-0" : ""}>
                          <MessageBubble
                            side={mine ? "mine" : "theirs"}
                            tail={tail}
                            timestamp={showTimestamp ? shortTime(m.createdAt, locale) : null}
                            status={status}
                            authorName={
                              !mine && otherMember
                                ? `${otherMember.firstName} ${otherMember.lastName}`.trim()
                                : undefined
                            }
                            onRetry={
                              m.clientMessageId
                                ? () => void retryFailed(m.clientMessageId as string)
                                : undefined
                            }
                            labels={{
                              ownPrefix: (time) => t("ownPrefix", { time }),
                              otherPrefix: (name, time) => t("otherPrefix", { name, time }),
                              failedHint: t("failedHint"),
                              statusSending: t("statusSending"),
                              statusSent: t("statusSent"),
                              statusDelivered: t("statusDelivered"),
                              statusRead: t("statusRead"),
                              statusFailed: t("statusFailed"),
                            }}
                          >
                            {m.body}
                          </MessageBubble>
                          {!mine && !m.id.startsWith("pending-") ? (
                            <div className="mt-1 flex justify-start">
                              <button
                                type="button"
                                onClick={() => setReportMessageId(m.id)}
                                className="text-ink-muted hover:bg-surface hover:text-ink text-nav rounded px-2 py-0.5"
                              >
                                {tModeration("reportMessage")}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                    {activeTyping && otherMember ? (
                      <TypingIndicator
                        label={t("typing", {
                          name:
                            `${otherMember.firstName} ${otherMember.lastName}`.trim() ||
                            otherMember.handle,
                        })}
                      />
                    ) : null}
                  </ul>
                )}
              </div>

              {error ? (
                <p
                  role="alert"
                  className="border-danger/20 bg-danger/10 text-danger border-t px-4 py-2 text-sm"
                >
                  {error}
                </p>
              ) : null}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
                className="border-line-soft bg-surface flex items-end gap-2 border-t p-3"
              >
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (e.target.value.trim().length > 0) postTypingThrottled();
                  }}
                  placeholder={t("composePlaceholder")}
                  rows={1}
                  maxLength={5000}
                  className="border-line-soft bg-surface text-ink placeholder:text-ink-muted focus-visible:border-brand-600 focus-visible:ring-brand-600/30 min-h-10 flex-1 resize-none rounded-full border px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2"
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
                  className="bg-brand-600 text-ink-inverse shadow-card hover:bg-brand-700 focus-visible:ring-brand-600 focus-visible:ring-offset-surface inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon name="send-paper" size={14} />
                  {t("send")}
                </button>
              </form>
            </>
          )}
        </section>
      </Surface>
      <ReportDialog
        open={reportMessageId !== null}
        targetKind="MESSAGE"
        targetId={reportMessageId ?? ""}
        onClose={() => setReportMessageId(null)}
      />
    </main>
  );
}

function MessagesPageFallback(): JSX.Element {
  return (
    <main className="max-w-chrome mx-auto w-full px-4 py-6 lg:px-6">
      <Surface
        as="section"
        variant="card"
        padding="6"
        className="min-h-[calc(100vh-var(--nav-h)-var(--mobile-tab-h))]"
      >
        <p className="text-ink-muted text-sm">Loading messages…</p>
      </Surface>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Derived status — pragmatic v1 maps the 3 actually-measurable states
// ────────────────────────────────────────────────────────────────────────
function computeStatus(
  m: Message,
  failedClientIds: Set<string>,
  otherLastReadAtMs: number,
): MessageStatus {
  if (m.clientMessageId && failedClientIds.has(m.clientMessageId)) {
    return "failed";
  }
  if (m.id.startsWith("pending-")) return "sending";
  const createdAtMs = Date.parse(m.createdAt);
  if (otherLastReadAtMs >= createdAtMs) return "read";
  return "sent";
}

// ────────────────────────────────────────────────────────────────────────
// Cheap locale-aware time + date formatters used throughout the page
// ────────────────────────────────────────────────────────────────────────
function shortTime(iso: string, locale: string): string {
  try {
    const tag = locale.toLowerCase().startsWith("ar") ? `${locale}-u-nu-arab` : locale;
    return new Date(iso).toLocaleTimeString(tag, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function shortDate(iso: string, locale: string): string {
  try {
    const tag = locale.toLowerCase().startsWith("ar") ? `${locale}-u-nu-arab` : locale;
    return new Date(iso).toLocaleString(tag, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
