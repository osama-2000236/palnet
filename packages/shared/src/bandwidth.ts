// The one place that knows how fast this device's connection is and which mode
// the product is therefore in.
//
// A module-level store rather than React context, because the API client needs
// to read it on every request and `api.ts` is not a component. Framework-neutral
// for the same reason `@baydar/shared` always is: the detectors differ per
// platform (navigator.connection on web, NetInfo on mobile), the decision does
// not, and a decision made twice is a decision made two ways.
//
// Persistence of a member's manual choice belongs to the app — localStorage on
// web, AsyncStorage on mobile. Each hydrates this on boot and writes on change.

import {
  BandwidthMode,
  ConnectionClass,
  modeForConnection,
  policyFor,
  CONNECTION_HEADER,
  type BandwidthPolicy,
} from "./connection-class";

export interface BandwidthSnapshot {
  /** What the platform detector last reported. */
  connection: ConnectionClass;
  /** The member's explicit choice, or null when following the connection. */
  override: BandwidthMode | null;
  /** What the product is actually doing: the override, or the automatic mode. */
  mode: BandwidthMode;
  policy: BandwidthPolicy;
}

const listeners = new Set<() => void>();

let connection: ConnectionClass = ConnectionClass.MODERATE;
let override: BandwidthMode | null = null;

/**
 * Recomputed on change, not per read. `useSyncExternalStore` compares snapshots
 * by identity and re-renders forever if `getSnapshot` returns a fresh object
 * each time — the most common way to hang a React 19 tree.
 */
let snapshot: BandwidthSnapshot = build();

function build(): BandwidthSnapshot {
  const mode = override ?? modeForConnection(connection);
  return { connection, override, mode, policy: policyFor(mode) };
}

function publish(): void {
  const next = build();
  if (
    next.connection === snapshot.connection &&
    next.override === snapshot.override &&
    next.mode === snapshot.mode
  ) {
    return;
  }
  snapshot = next;
  for (const listener of listeners) listener();
}

export const getBandwidthSnapshot = (): BandwidthSnapshot => snapshot;
export const getBandwidthMode = (): BandwidthMode => snapshot.mode;
export const getBandwidthPolicy = (): BandwidthPolicy => snapshot.policy;
export const getConnectionClass = (): ConnectionClass => snapshot.connection;

export function setConnectionClass(next: ConnectionClass): void {
  connection = next;
  publish();
}

/** `null` returns the device to following its connection. */
export function setBandwidthOverride(next: BandwidthMode | null): void {
  override = next;
  publish();
}

export function subscribeBandwidth(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/**
 * The header the API shapes payloads from. Sent as the *effective* mode's
 * class, not the detected one: a member who picked خفيف on 4G is telling the
 * server they want small responses, and the server should believe them.
 */
export function connectionHeaders(): Record<string, string> {
  const effective =
    snapshot.mode === BandwidthMode.LIGHT
      ? ConnectionClass.SLOW
      : snapshot.mode === BandwidthMode.NORMAL
        ? ConnectionClass.MODERATE
        : ConnectionClass.FAST;
  return { [CONNECTION_HEADER]: effective };
}

/** Test-only reset. Module state outlives a test file otherwise. */
export function resetBandwidth(): void {
  connection = ConnectionClass.MODERATE;
  override = null;
  snapshot = build();
  listeners.clear();
}
