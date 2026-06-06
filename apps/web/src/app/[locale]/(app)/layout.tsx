"use client";

import {
  Profile as ProfileSchema,
  WsChatEvent,
  WsNotificationEvent,
  type Profile,
} from "@baydar/shared";
import { AppShell, type AppShellRoute } from "@baydar/ui-web";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { apiFetch, apiFetchPage, getValidAccessToken } from "@/lib/api";
import { clearSession, readSession } from "@/lib/session";
import { openStream } from "@/lib/sse";
import { ConnectivityBanner } from "./components/ConnectivityBanner";
import { isBareAppRoute, RoomsEnvelope, routeOf, sumUnread, UnreadCount } from "./layoutState";
import { useAppShellLabels } from "./useAppShellLabels";

export default function AppLayout({ children }: { children: ReactNode }): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const labels = useAppShellLabels();

  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Profile | null>(null);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [notificationsConnectionDropped, setNotificationsConnectionDropped] = useState(false);
  const [messagesUnread, setMessagesUnread] = useState(0);

  // Session bootstrap — redirect to /login if missing.
  useEffect(() => {
    let cancelled = false;
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    void getValidAccessToken().then((nextToken) => {
      if (cancelled) return;
      if (!nextToken) {
        clearSession();
        router.replace("/login");
        return;
      }
      setToken(nextToken);
    });
    return () => {
      cancelled = true;
    };
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
    let es: EventSource | null = null;
    let cancelled = false;
    setNotificationsConnectionDropped(false);
    void openStream("notifications", token)
      .then((source) => {
        if (cancelled) {
          source.close();
          return;
        }
        es = source;
        source.onopen = (): void => {
          setNotificationsConnectionDropped(false);
        };
        source.onerror = (): void => {
          setNotificationsConnectionDropped(true);
        };
        source.onmessage = (evt): void => {
          setNotificationsConnectionDropped(false);
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
      })
      .catch(() => setNotificationsConnectionDropped(true));
    return (): void => {
      cancelled = true;
      es?.close();
    };
  }, [token]);

  // Messages unread — sum of per-room counts. Refetch on any chat event to
  // keep the badge honest; the rooms list is small.
  const refetchRooms = useCallback(async (tk: string): Promise<void> => {
    try {
      const out = await apiFetchPage("/messaging/rooms", RoomsEnvelope, {
        token: tk,
      });
      setMessagesUnread(sumUnread(out.data));
    } catch {
      // ignore
    }
  }, []);

  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!token) return;
    void refetchRooms(token);
    let es: EventSource | null = null;
    let cancelled = false;
    void openStream("messaging", token)
      .then((source) => {
        if (cancelled) {
          source.close();
          return;
        }
        es = source;
        source.onmessage = (evt): void => {
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
      })
      .catch(() => {});
    return (): void => {
      cancelled = true;
      es?.close();
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
        case "activity":
          router.push("/activity");
          return;
        case "saved":
          router.push("/saved");
          return;
        case "employer":
          router.push("/employer");
          return;
        case "profile":
          router.push(me?.handle ? `/in/${me.handle}` : "/me");
          return;
      }
    },
    [router, me?.handle],
  );

  const onViewProfile = useCallback(() => {
    router.push(me?.handle ? `/in/${me.handle}` : "/me");
  }, [router, me?.handle]);

  const onOpenSettings = useCallback(() => {
    router.push("/settings");
  }, [router]);

  const onSignOut = useCallback(() => {
    clearSession();
    router.push("/login");
  }, [router]);

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
      bare={bare}
      currentRoute={currentRoute}
      me={meUser}
      meHeadline={me?.headline ?? null}
      labels={labels}
      messagesUnread={messagesUnread}
      notificationsUnread={notificationsUnread}
      notificationsConnectionDropped={notificationsConnectionDropped}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      onSearchSubmit={onSearchSubmit}
      onNavigate={onNavigate}
      onViewProfile={onViewProfile}
      onOpenSettings={onOpenSettings}
      onSignOut={onSignOut}
    >
      <ConnectivityBanner degraded={notificationsConnectionDropped} />
      {children}
    </AppShell>
  );
}
