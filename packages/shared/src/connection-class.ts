// How fast the connection is, and what the product does about it.
//
// Gaza's mobile data is 2G. 39% of Palestinians have no internet at all, and
// 64% of Gaza's towers are offline. A 2G connection delivers 20–40 kbit/s, so
// at 30 kbit/s every 24 KB of payload costs 6.4 seconds. That number is the
// design constraint for the whole product, not a footnote about a slow path.
//
// Everything here is a pure function over an explicit input, so both clients
// and the API decide the same thing from the same table. The alternative —
// each surface guessing — is how a "light mode" ends up loading a 1080px hero.

export const ConnectionClass = {
  OFFLINE: "offline",
  SLOW: "slow",
  MODERATE: "moderate",
  FAST: "fast",
} as const;
export type ConnectionClass = (typeof ConnectionClass)[keyof typeof ConnectionClass];

/**
 * The three modes, named as the UI names them: خفيف / عادي / كامل.
 *
 * `light` is a default, not an option. A member on 2G gets it without asking,
 * and can still pick it on any connection — someone paying by the megabyte is
 * not always on a slow one.
 */
export const BandwidthMode = {
  LIGHT: "light",
  NORMAL: "normal",
  FULL: "full",
} as const;
export type BandwidthMode = (typeof BandwidthMode)[keyof typeof BandwidthMode];

/** The header the client sends so the API can shape a payload. */
export const CONNECTION_HEADER = "X-Baydar-Connection";

export interface BandwidthPolicy {
  /** Largest image variant this mode may request, in CSS pixels. */
  imageWidth: 320 | 640 | 1080;
  /** Largest avatar variant. Only two are stored, so only two appear here. */
  avatarWidth: 32 | 96;
  /** False means blurhash plus a tap-to-load labelled with what it will cost. */
  autoLoadImages: boolean;
  /** Video is never autoplayed anywhere; on light it is not playable at all. */
  allowVideo: boolean;
  /**
   * Feed page size. Only the feed: the other lists' sizes are fixed by the
   * budget table (20 jobs, 20 rooms, 30 messages, 20 notifications, 20 hits),
   * and a five-message thread page would cost more round trips than it saves
   * bytes.
   */
  pageSize: 5 | 10;
  /** Whether to fetch the next page before the member asks for it. */
  prefetch: boolean;
  /**
   * Milliseconds between polls when SSE is too expensive to hold open, or null
   * to open an EventSource. A 2G connection cannot afford a live socket.
   */
  pollIntervalMs: number | null;
}

export const BANDWIDTH_POLICY: Readonly<Record<BandwidthMode, BandwidthPolicy>> = {
  light: {
    imageWidth: 320,
    avatarWidth: 32,
    autoLoadImages: false,
    allowVideo: false,
    pageSize: 5,
    prefetch: false,
    pollIntervalMs: 120_000,
  },
  normal: {
    imageWidth: 640,
    avatarWidth: 96,
    autoLoadImages: true,
    allowVideo: true,
    pageSize: 10,
    prefetch: false,
    pollIntervalMs: null,
  },
  full: {
    imageWidth: 1080,
    avatarWidth: 96,
    autoLoadImages: true,
    allowVideo: true,
    pageSize: 10,
    prefetch: true,
    pollIntervalMs: null,
  },
};

/**
 * The automatic mode for a connection class.
 *
 * `offline` maps to `light` rather than to a fourth mode: when the connection
 * comes back it is usually the same 2G that dropped, and a member watching a
 * queue drain does not need the app to also start fetching 1080px images.
 */
export function modeForConnection(connection: ConnectionClass): BandwidthMode {
  switch (connection) {
    case ConnectionClass.OFFLINE:
    case ConnectionClass.SLOW:
      return BandwidthMode.LIGHT;
    case ConnectionClass.MODERATE:
      return BandwidthMode.NORMAL;
    case ConnectionClass.FAST:
      return BandwidthMode.FULL;
  }
}

export const policyFor = (mode: BandwidthMode): BandwidthPolicy => BANDWIDTH_POLICY[mode];

const MODE_CYCLE: BandwidthMode[] = [BandwidthMode.LIGHT, BandwidthMode.NORMAL, BandwidthMode.FULL];

/**
 * The next mode when the chip is tapped.
 *
 * Here rather than in the two kits because it is a decision, and a decision
 * duplicated in `ui-web` and `ui-native` is a decision that will eventually
 * differ — "tap again" must not mean something else on a phone.
 */
export function nextBandwidthMode(mode: BandwidthMode): BandwidthMode {
  return MODE_CYCLE[(MODE_CYCLE.indexOf(mode) + 1) % MODE_CYCLE.length]!;
}

/**
 * Web: `navigator.connection.effectiveType`.
 *
 * Absent maps to `moderate`, not to `fast`. The API is unavailable on Safari
 * and on every Firefox, so "no information" is the common case and it must not
 * be read as "fast" — over-fetching on an unknown connection is the failure
 * this whole workstream exists to prevent.
 */
export function connectionClassFromEffectiveType(
  effectiveType: string | null | undefined,
): ConnectionClass {
  switch (effectiveType) {
    case "slow-2g":
    case "2g":
      return ConnectionClass.SLOW;
    case "3g":
      return ConnectionClass.MODERATE;
    case "4g":
      return ConnectionClass.FAST;
    default:
      return ConnectionClass.MODERATE;
  }
}

export interface NetInfoShape {
  /** NetInfo's `type`: "wifi" | "cellular" | "none" | "unknown" | … */
  type?: string | null;
  isConnected?: boolean | null;
  /**
   * `unknown`, not `{ cellularGeneration?: string }`. NetInfo's `details` is a
   * discriminated union — the wifi member has no `cellularGeneration` at all —
   * and a structural type here makes `NetInfoState` unassignable at the one
   * call site that matters. `@baydar/shared` cannot import React Native types
   * to do better, so it narrows instead.
   */
  details?: unknown;
}

function cellularGeneration(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const value = (details as { cellularGeneration?: unknown }).cellularGeneration;
  return typeof value === "string" ? value : null;
}

/**
 * Mobile: `@react-native-community/netinfo`.
 *
 * Wi-Fi is treated as fast, which is optimistic and deliberate — a tethered or
 * satellite link will be corrected within one page by the mode the member can
 * see and change. Cellular with an unknown generation falls to `moderate` for
 * the same reason web's unknown does.
 */
export function connectionClassFromNetInfo(
  state: NetInfoShape | null | undefined,
): ConnectionClass {
  if (!state || state.isConnected === false || state.type === "none") {
    return ConnectionClass.OFFLINE;
  }
  if (state.type === "wifi" || state.type === "ethernet") return ConnectionClass.FAST;
  switch (cellularGeneration(state.details)) {
    case "2g":
      return ConnectionClass.SLOW;
    case "3g":
      return ConnectionClass.MODERATE;
    case "4g":
    case "5g":
      return ConnectionClass.FAST;
    default:
      return ConnectionClass.MODERATE;
  }
}

/**
 * Read the header on the server.
 *
 * A hint, never a security boundary: it is used to pick an image variant and a
 * default page size and for nothing else, so a forged value costs the forger
 * bandwidth and costs Baydar nothing. Unparseable input falls to `moderate`
 * rather than throwing — refusing a request because a hint was malformed would
 * turn a payload optimisation into an outage.
 */
export function connectionClassFromHeader(value: string | null | undefined): ConnectionClass {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case ConnectionClass.SLOW:
    case ConnectionClass.MODERATE:
    case ConnectionClass.FAST:
    case ConnectionClass.OFFLINE:
      return normalized;
    default:
      return ConnectionClass.MODERATE;
  }
}

/**
 * Bytes a member is about to spend, for the tap-to-load label. Rounded up to a
 * whole KB: "٣ ك.ب" is a decision the member can make, "2.7 KB" is a spec.
 */
export const kilobytes = (bytes: number): number => Math.max(1, Math.ceil(bytes / 1024));
