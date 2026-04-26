"use client";

// (app) layout — authenticated chrome for every signed-in web route.
//
// Responsibilities:
//   • Guard: redirect to /login when no session (all /(app)/* pages were
//     individually guarding before; we keep those too for defense-in-depth,
//     but this layout is the primary gate).
//   • Fetch the current user's profile for the top-bar avatar + "my profile"
//     nav link.
//   • Own the live unread counters (notifications + messages) via their
//     respective SSE streams. The <AppShell> is a dumb view.
//   • Derive the active nav route from the pathname.
//   • Route the search pill: `q` syncs to URL; every keystroke lands on
//     /search?q=… (so results update as the user types), Enter commits.
//   • Skip the shell entirely on /onboarding — that screen is pre-profile.

import {
  ChatRoom as ChatRoomSchema,
  Profile as ProfileSchema,
  WsChatEvent,
  WsNotificationEvent,
  type ChatRoom,
  type Profile,
} from "@baydar/shared";
import { AppShell, type AppShellLabels, type AppShellRoute } from "@baydar/ui-web";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { z } from "zod";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { clearSession, readSession } from "@/lib/session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const UnreadCount = z.object({ count: z.number().int().nonnegative() });
const RoomsEnvelope = z.object({ data: z.array(ChatRoomSchema) });

/**
 * Map a pathname to the nav slot it should highlight.
 * `null` means "no highlight" (e.g. search results, unknown routes).
 */
function routeOf(pathname: string, myHandle: string | null): AppShellRoute | null {
  // Strip the locale prefix if present (e.g. /ar-PS/feed -> /feed).
  const path = pathname.replace(/^\/(?:ar-PS|en)(?=\/|$)/, "") || "/";
  if (path === "/" || path.startsWith("/feed")) return "feed";
  if (path.startsWith("/network")) return "network";
  if (path.startsWith("/jobs")) return "jobs";
  if (path.startsWith("/messages")) return "messages";
  if (path.startsWith("/notifications")) return "notifications";
  if (path.startsWith("/me")) return "profile";
  if (myHandle && path === `/in/${myHandle}`) return "profile";
  return null;
}

function isBareAppRoute(pathname: string): boolean {
  // Some /(app)/* routes intentionally render without the shell.
  const path = pathname.replace(/^\/(?:ar-PS|en)(?=\/|$)/, "") || "/";
  return path.startsWith("/onboarding");
}

function sumUnread(rooms: ChatRoom[]): number {
  return rooms.reduce((acc, r) => acc + r.unreadCount, 0);
}

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();

  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const tFeed = useTranslations("feed");
  const tNetwork = useTranslations("network");
  const tSearch = useTranslations("search");
  const tMsg = useTranslations("messaging");
  const tNotif = useTranslations("notifications");
  const tProfile = useTranslations("profile");
  const tAuth = useTranslations("auth");

  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [messagesUnread, setMessagesUnread] = useState(0);

  // Session bootstrap — redirect to /login if missing.
  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  // Fetch me once we have a token.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void apiFetch("/profiles/me", ProfileSchema, { token })
      .then((p) => {
        if (!cancelled) setMe(p);
      })
      .catch(() => {
        // Not fatal — shell renders with an empty avatar until fetched.
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Notifications unread — initial + live via SSE.
  useEffect(() => {
    if (!token) return;
    void apiFetch("/notifications/unread-count", UnreadCount, { token })
      .then((out) => setNotificationsUnread(out.count))
      .catch(() => {});
    const url = `${API_BASE}/notifications/stream?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.onmessage = (evt): void => {
      try {
        const parsed = WsNotificationEvent.safeParse(JSON.parse(evt.data));
        if (!parsed.success) return;
        const ev = parsed.data;
        if (ev.type === "notification.unread-count") {
          setNotificationsUnread(ev.payload.count);
        } else if (ev.type === "notification.new") {
          setNotificationsUnread((c) => c + 1);
        }
      } catch {
        // ignore
      }
    };
    return (): void => {
      es.close();
    };
  }, [token]);

  // Messages unread — sum of per-room counts. Refetch on any chat event to
  // keep the badge honest; the rooms list is small.
  const refetchRooms = useCallback(
    async (tk: string): Promise<void> => {
      try {
        const out = await apiFetchPage("/messaging/rooms", RoomsEnvelope, {
          token: tk,
        });
        setMessagesUnread(sumUnread(out.data));
      } catch {
        // ignore
      }
    },
    [],
  );

  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!token) return;
    void refetchRooms(token);
    const url = `${API_BASE}/messaging/stream?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.onmessage = (evt): void => {
      try {
        const parsed = WsChatEvent.safeParse(JSON.parse(evt.data));
        if (!parsed.success) return;
        const ev = parsed.data;
        if (ev.type === "message.new" || ev.type === "message.read") {
          // Coalesce bursts (e.g. mass-read) into one refetch.
          if (refetchTimer.current) clearTimeout(refetchTimer.current);
          refetchTimer.current = setTimeout(() => void refetchRooms(token), 150);
        }
      } catch {
        // ignore
      }
    };
    return (): void => {
      es.close();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [token, refetchRooms]);

  // Keep badge fresh when the user navigates around (covers reads made from
  // the messages page itself).
  useEffect(() => {
    if (!token) return;
    void refetchRooms(token);
  }, [pathname, token, refetchRooms]);

  // Pathname → active nav key.
  const currentRoute = useMemo(
    () => routeOf(pathname ?? "/", me?.handle ?? null),
    [pathname, me?.handle],
  );
  const bare = isBareAppRoute(pathname ?? "/");

  // Search: controlled by the URL `q` param when on /search. Elsewhere, the
  // input starts empty and typing pushes the user to /search. We read `q` from
  // `window.location` rather than `useSearchParams()` so this layout (which
  // sits above every (app) page) doesn't force a CSR bailout at build time.
  const onSearchRoute = (pathname ?? "").endsWith("/search");
  const [searchValue, setSearchValue] = useState("");
  useEffect(() => {
    if (!onSearchRoute) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setSearchValue(params.get("q") ?? "");
  }, [onSearchRoute, pathname]);

  const onSearchChange = useCallback(
    (next: string) => {
      setSearchValue(next);
      const qs = new URLSearchParams();
      if (next) qs.set("q", next);
      const target = `/search${qs.toString() ? `?${qs.toString()}` : ""}`;
      // On /search we replace (no history spam per keystroke); elsewhere we
      // push once so the user can Back out.
      if (onSearchRoute) {
        router.replace(target);
      } else {
        router.push(target);
      }
    },
    [router, onSearchRoute],
  );

  const onSearchSubmit = useCallback(
    (value: string) => {
      const qs = new URLSearchParams();
      if (value) qs.set("q", value);
      router.push(`/search${qs.toString() ? `?${qs.toString()}` : ""}`);
    },
    [router],
  );

  const onNavigate = useCallback(
    (route: AppShellRoute) => {
      switch (route) {
        case "feed":
          router.push("/feed");
          return;
        case "network":
          router.push("/network");
          return;
        case "jobs":
          router.push("/jobs");
          return;
        case "messages":
          router.push("/messages");
          return;
        case "notifications":
          router.push("/notifications");
          return;
        case "profile":
          router.push(me?.handle ? `/in/${me.handle}` : "/me/edit");
          return;
      }
    },
    [router, me?.handle],
  );

  const onViewProfile = useCallback(() => {
    router.push(me?.handle ? `/in/${me.handle}` : "/me/edit");
  }, [router, me?.handle]);

  const onOpenSettings = useCallback(() => {
    // No dedicated Settings screen yet — profile edit is the closest.
    router.push("/me/edit");
  }, [router]);

  const onSignOut = useCallback(() => {
    clearSession();
    router.push("/login");
  }, [router]);

  const labels: AppShellLabels = useMemo(
    () => ({
      logoAlt: tCommon("appName"),
      searchPlaceholder: tNav("searchPlaceholder"),
      searchLabel: tSearch("title"),
      mainNavLabel: tNav("main"),
      nav: {
        feed: tFeed("title"),
        network: tNetwork("title"),
        jobs: tNav("jobs"),
        messages: tMsg("title"),
        notifications: tNotif("title"),
      },
      myProfile: tNav("myProfile"),
      viewProfile: tProfile("viewPublic"),
      settings: tNav("settings"),
      signOut: tAuth("logout"),
      unreadTemplate: {
        messages: tNav("unreadMessages"),
        notifications: tNav("unreadNotifications"),
      },
    }),
    [tCommon, tNav, tFeed, tNetwork, tMsg, tNotif, tSearch, tProfile, tAuth],
  );

  if (bare) {
    return <>{children}</>;
  }

  const meUser = me
    ? {
        id: me.userId,
        handle: me.handle,
        firstName: me.firstName,
        lastName: me.lastName,
        avatarUrl: me.avatarUrl ?? null,
      }
    : null;

  return (
    <AppShell
      currentRoute={currentRoute}
      me={meUser}
      labels={labels}
      messagesUnread={messagesUnread}
      notificationsUnread={notificationsUnread}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      onSearchSubmit={onSearchSubmit}
      onNavigate={onNavigate}
      onViewProfile={onViewProfile}
      onOpenSettings={onOpenSettings}
      onSignOut={onSignOut}
    >
      {children}
    </AppShell>
  );
}
