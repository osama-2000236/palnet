import type { ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

import { FxService } from "./fx.service";

function makeService(feedUrl?: string): FxService {
  const config = {
    get: (key: string) => (key === "FX_FEED_URL" ? feedUrl : undefined),
  } as unknown as ConfigService<Env, true>;
  return new FxService(config);
}

async function flush(): Promise<void> {
  // Let the fire-and-forget maybeRefresh() settle.
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("FxService", () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it("converts using the snapshot when no feed is configured", () => {
    const fx = makeService();
    expect(fx.convertCents(500, "USD", "ILS")).toBe(1800);
    expect(fx.convertCents(500, "USD", "USD")).toBe(500);
    expect(fx.convertCents(500, "USD", "XXX")).toBe(500);
  });

  it("overlays live rates from the feed on top of the snapshot", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { ILS: 4.0 } }),
    }) as unknown as typeof fetch;

    const fx = makeService("https://fx.test/latest/USD");
    fx.convertCents(500, "USD", "ILS"); // triggers refresh
    await flush();

    expect(fx.convertCents(500, "USD", "ILS")).toBe(2000); // live 4.0
    expect(fx.convertCents(500, "USD", "JOD")).toBe(355); // snapshot floor 0.71
    expect(global.fetch).toHaveBeenCalledTimes(1); // interval throttles retries
  });

  it("keeps last known rates when the feed fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;

    const fx = makeService("https://fx.test/latest/USD");
    fx.convertCents(500, "USD", "ILS");
    await flush();

    expect(fx.convertCents(500, "USD", "ILS")).toBe(1800); // snapshot survives
    expect(global.fetch).toHaveBeenCalledTimes(1); // failure also waits out the interval
  });

  it("rejects malformed feed payloads", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { ILS: -1 } }),
    }) as unknown as typeof fetch;

    const fx = makeService("https://fx.test/latest/USD");
    fx.convertCents(500, "USD", "ILS");
    await flush();

    expect(fx.convertCents(500, "USD", "ILS")).toBe(1800);
  });
});
