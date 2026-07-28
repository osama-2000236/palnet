import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

import type { Env } from "../../config/env";

import { FX_TO_USD } from "./currency";

// Feed must return USD-relative rates: { "rates": { "ILS": 3.6, ... } }.
// open.er-api.com/v6/latest/USD and exchangerate.host both match this shape.
const FeedSchema = z.object({ rates: z.record(z.string(), z.number().positive()) });

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * USD-relative FX rates for display-currency conversion. Boots on the
 * hardcoded snapshot in `currency.ts`; when FX_FEED_URL is set, lazily
 * refreshes at most every 6h on the read path (no background timer — same
 * rationale as the rate-limit store sweep). Feed failures keep the last
 * known rates: display pricing degrades to a stale rate, never an error.
 */
@Injectable()
export class FxService {
  private rates: Record<string, number> = { ...FX_TO_USD };
  private fetchedAt = 0;
  private refreshing = false;
  private readonly log = new Logger(FxService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  /** Convert integer cents between currencies. Unknown currency = no-op. */
  convertCents(amountCents: number, from: string, to: string): number {
    void this.maybeRefresh();
    if (from === to) return amountCents;
    const fromRate = this.rates[from.toUpperCase()];
    const toRate = this.rates[to.toUpperCase()];
    if (!fromRate || !toRate) return amountCents;
    return Math.round((amountCents / fromRate) * toRate);
  }

  private async maybeRefresh(): Promise<void> {
    const url = this.config.get("FX_FEED_URL", { infer: true });
    if (!url || this.refreshing || Date.now() - this.fetchedAt < REFRESH_INTERVAL_MS) return;
    this.refreshing = true;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`feed responded ${res.status}`);
      const { rates } = FeedSchema.parse(await res.json());
      // Snapshot stays the floor so a feed missing a currency never breaks it.
      this.rates = { ...FX_TO_USD, ...rates, USD: 1 };
      this.log.log(`FX rates refreshed from feed (${Object.keys(rates).length} currencies)`);
    } catch (err) {
      this.log.warn(`FX feed refresh failed, keeping last rates: ${(err as Error).message}`);
    } finally {
      // Success or failure, wait a full interval before retrying — a broken
      // feed should not add a fetch attempt to every catalog read.
      this.fetchedAt = Date.now();
      this.refreshing = false;
    }
  }
}
