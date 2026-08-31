// Feed-ranking preferences — mirrors src/lib/theme.ts exactly: SecureStore on
// native, localStorage on web, with a synchronous best-effort initial read.
//
// These three are a policy, not a taste: the round is finite, the ordering
// explains itself, and the ordering can be turned off entirely. Screen 5g of
// the mobile redesign makes all three user-visible; ProvenanceLine is the
// visible half of `explainRanking`.

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface RankingPrefs {
  /** Show the ProvenanceLine on ranked surfaces. */
  explainRanking: boolean;
  /** Posts per round. The round ENDS here — there is no infinite scroll. */
  roundSize: number;
}

// ponytail: the design also specified a "ranking off — newest only" switch.
// Left out on purpose: the feed endpoint takes no sort parameter, so the switch
// could only have changed the caption, not the order. Add it with the API flag.

export const DEFAULT_RANKING_PREFS: RankingPrefs = {
  explainRanking: true,
  roundSize: 24,
};

/** The round sizes offered in settings. Nothing unbounded. */
export const ROUND_SIZES = [12, 24, 40] as const;

const KEY = "baydar.ranking.v1";

type WebStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function getWebStorage(): WebStorage | null {
  return (globalThis as typeof globalThis & { localStorage?: WebStorage }).localStorage ?? null;
}

/** Parse defensively: a partial or corrupt blob falls back per-field, never throws. */
export function parseRankingPrefs(raw: string | null): RankingPrefs {
  if (!raw) return DEFAULT_RANKING_PREFS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_RANKING_PREFS;
    const o = parsed as Partial<Record<keyof RankingPrefs, unknown>>;
    return {
      explainRanking:
        typeof o.explainRanking === "boolean"
          ? o.explainRanking
          : DEFAULT_RANKING_PREFS.explainRanking,
      roundSize:
        typeof o.roundSize === "number" && ROUND_SIZES.includes(o.roundSize as never)
          ? o.roundSize
          : DEFAULT_RANKING_PREFS.roundSize,
    };
  } catch {
    return DEFAULT_RANKING_PREFS;
  }
}

function readSync(): string | null {
  try {
    if (Platform.OS === "web") return getWebStorage()?.getItem(KEY) ?? null;
    return SecureStore.getItem(KEY);
  } catch {
    return null;
  }
}

/** Synchronous initial prefs, so the first feed paint already obeys them. */
export function getInitialRankingPrefs(): RankingPrefs {
  return parseRankingPrefs(readSync());
}

export async function readRankingPrefs(): Promise<RankingPrefs> {
  if (Platform.OS === "web") return parseRankingPrefs(getWebStorage()?.getItem(KEY) ?? null);
  return parseRankingPrefs(await SecureStore.getItemAsync(KEY).catch(() => null));
}

export async function writeRankingPrefs(prefs: RankingPrefs): Promise<void> {
  const raw = JSON.stringify(prefs);
  if (Platform.OS === "web") {
    getWebStorage()?.setItem(KEY, raw);
    return;
  }
  await SecureStore.setItemAsync(KEY, raw);
}
