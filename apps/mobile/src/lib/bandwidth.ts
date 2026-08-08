import {
  BandwidthMode,
  connectionClassFromNetInfo,
  setBandwidthOverride,
  setConnectionClass,
} from "@baydar/shared";
import NetInfo from "@react-native-community/netinfo";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * The React Native half of the bandwidth story: detect the connection, remember
 * a member's manual choice, and keep the shared store current.
 *
 * The decision table lives in `@baydar/shared` so web makes the same one from
 * `navigator.connection`. What is here is NetInfo and the store the rest of
 * this app already keeps preferences in — `locale.ts`'s pattern, not a new
 * dependency for one string.
 */

const KEY = "baydar.bandwidth-mode.v1";

type WebStorage = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

const webStorage = (): WebStorage | null =>
  (globalThis as typeof globalThis & { localStorage?: WebStorage }).localStorage ?? null;

const isMode = (value: string | null | undefined): value is BandwidthMode =>
  value === BandwidthMode.LIGHT || value === BandwidthMode.NORMAL || value === BandwidthMode.FULL;

async function readPreference(): Promise<BandwidthMode | null> {
  try {
    const raw =
      Platform.OS === "web"
        ? (webStorage()?.getItem(KEY) ?? null)
        : await SecureStore.getItemAsync(KEY);
    return isMode(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Persist a member's choice, or clear it to follow the connection again. */
export async function persistBandwidthOverride(mode: BandwidthMode | null): Promise<void> {
  setBandwidthOverride(mode);
  try {
    if (Platform.OS === "web") {
      const storage = webStorage();
      if (mode) storage?.setItem(KEY, mode);
      else storage?.removeItem(KEY);
      return;
    }
    if (mode) await SecureStore.setItemAsync(KEY, mode);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // The choice still applies to this session. Refusing to change mode because
    // it cannot be remembered would be the worse trade.
  }
}

/**
 * Start detecting. Called once from the root layout; returns a teardown.
 *
 * NetInfo reports the cellular generation, which is the signal that matters
 * here: 2G is `slow` and everything the light mode does follows from it.
 */
export function startBandwidthDetection(): () => void {
  let stopped = false;

  void readPreference().then((mode) => {
    if (!stopped && mode) setBandwidthOverride(mode);
  });

  void NetInfo.fetch().then((state) => {
    if (!stopped) setConnectionClass(connectionClassFromNetInfo(state));
  });

  const unsubscribe = NetInfo.addEventListener((state) => {
    setConnectionClass(connectionClassFromNetInfo(state));
  });

  return () => {
    stopped = true;
    unsubscribe();
  };
}
