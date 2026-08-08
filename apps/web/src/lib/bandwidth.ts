"use client";

/**
 * The browser half of the bandwidth story: detect the connection, remember a
 * member's manual choice, and keep the shared store current.
 *
 * The decision table lives in `@baydar/shared` so mobile makes the same one
 * from NetInfo. What is here is what genuinely differs — the Network
 * Information API, `navigator.onLine`, and localStorage.
 */

import {
  BandwidthMode,
  ConnectionClass,
  connectionClassFromEffectiveType,
  setBandwidthOverride,
  setConnectionClass,
} from "@baydar/shared";

const STORAGE_KEY = "baydar.bandwidth-mode";

interface NetworkInformation extends EventTarget {
  effectiveType?: string;
}

const networkInformation = (): NetworkInformation | null => {
  if (typeof navigator === "undefined") return null;
  return (navigator as Navigator & { connection?: NetworkInformation }).connection ?? null;
};

const isMode = (value: string | null): value is BandwidthMode =>
  value === BandwidthMode.LIGHT || value === BandwidthMode.NORMAL || value === BandwidthMode.FULL;

/** Persist a member's choice, or clear it to follow the connection again. */
export function persistBandwidthOverride(mode: BandwidthMode | null): void {
  setBandwidthOverride(mode);
  try {
    if (mode) window.localStorage.setItem(STORAGE_KEY, mode);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode, or storage disabled. The choice still applies to this
    // session; refusing to change mode because it cannot be remembered would
    // be a worse trade than forgetting it.
  }
}

function detect(): void {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setConnectionClass(ConnectionClass.OFFLINE);
    return;
  }
  setConnectionClass(connectionClassFromEffectiveType(networkInformation()?.effectiveType));
}

/**
 * Start detecting. Called once from the app shell; returns a teardown.
 *
 * `change` on `navigator.connection` is the only event that reports a radio
 * switch, and Safari and Firefox fire nothing at all — which is why the
 * shared table maps "no information" to `moderate` rather than to `fast`.
 */
export function startBandwidthDetection(): () => void {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isMode(stored)) setBandwidthOverride(stored);
  } catch {
    // See above.
  }

  detect();

  const connection = networkInformation();
  connection?.addEventListener("change", detect);
  window.addEventListener("online", detect);
  window.addEventListener("offline", detect);

  return () => {
    connection?.removeEventListener("change", detect);
    window.removeEventListener("online", detect);
    window.removeEventListener("offline", detect);
  };
}
