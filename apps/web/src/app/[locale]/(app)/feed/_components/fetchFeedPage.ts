"use client";

import {
  cursorPage,
  getBandwidthPolicy,
  offlineCacheKeys,
  Post as PostSchema,
  readThrough,
} from "@baydar/shared";

import { apiFetchPage } from "@/lib/api";
import { offlineCache } from "@/lib/offline-cache";
import { getAccessToken } from "@/lib/session";

const PostsPage = cursorPage(PostSchema);

/**
 * One page of the feed, through the offline cache.
 *
 * Its own file because `page.tsx` is at the 300-LOC ceiling and because this
 * is the screen's data layer rather than its layout: page size comes from the
 * bandwidth mode, and a failed request falls back to what the browser last
 * held rather than to an error page over data the member can already see.
 */
export function fetchFeedPage(after: string | null) {
  const token = getAccessToken() ?? undefined;
  // Page size follows the mode: five posts on 2G, ten otherwise. A member on
  // a slow connection waits for less before anything is on screen.
  const qs = new URLSearchParams({ limit: String(getBandwidthPolicy().pageSize) });
  if (after) qs.set("after", after);
  const path = `/feed?${qs.toString()}`;

  return readThrough(offlineCache, offlineCacheKeys.feed, () =>
    apiFetchPage(path, PostsPage, { token }),
  );
}
