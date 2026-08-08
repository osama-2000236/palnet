import { useSyncExternalStore } from "react";

import { getBandwidthSnapshot, subscribeBandwidth, type BandwidthSnapshot } from "../bandwidth";

/**
 * The current connection class, mode and policy, for components on both
 * platforms.
 *
 * The server snapshot is the same object as the client one: the store's
 * default is `moderate`, which is what a server render must assume anyway —
 * there is no `navigator.connection` during SSR and guessing `fast` there
 * would ship a 1080px image to a phone on 2G before hydration could correct it.
 */
export function useBandwidth(): BandwidthSnapshot {
  return useSyncExternalStore(subscribeBandwidth, getBandwidthSnapshot, getBandwidthSnapshot);
}
