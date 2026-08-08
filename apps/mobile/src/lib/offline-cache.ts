import { createOfflineCache, type OfflineCache } from "@baydar/shared";

import { createNativeOfflineCacheStorage } from "./outbox-storage";

/**
 * The app's offline read cache.
 *
 * Stale-while-revalidate over the surfaces §15.5 names. Same implementation as
 * web's; only the file underneath differs.
 */
export const offlineCache: OfflineCache = createOfflineCache({
  storage: createNativeOfflineCacheStorage(),
});
