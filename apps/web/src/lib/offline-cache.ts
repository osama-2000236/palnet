"use client";

import { createOfflineCache, type OfflineCache } from "@baydar/shared";

import { createWebOfflineCacheStorage } from "./outbox-storage";

/**
 * The browser's offline read cache.
 *
 * Stale-while-revalidate over the surfaces §15.5 names — the last feed page,
 * the member's own profile, the last rooms and their messages, saved jobs, a
 * downloaded learning path. Everything else is not cached, which is the point:
 * a cache of everything is a cache nobody can reason about.
 */
export const offlineCache: OfflineCache = createOfflineCache({
  storage: createWebOfflineCacheStorage(),
});
