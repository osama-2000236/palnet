import { WalletProvider } from "@baydar/shared";
import { Test } from "@nestjs/testing";

import { WalletRegistry } from "./wallets";

// `billing.service.spec.ts` mocks WalletRegistry, so nothing exercised the real
// class. It gates a money path: `availability()` is what tells the checkout
// panel a wallet is a usable payment method, and `createCheckout` mints the
// invoice BEFORE the wallet branch runs. A provider that reports configured
// without a client behind it produces an invoice nobody can pay.
describe("WalletRegistry", () => {
  let registry: WalletRegistry;

  beforeEach(async () => {
    // Resolved through Nest, not `new`: the class dropped its ConfigService
    // constructor argument along with the six env vars, and DI wiring that
    // silently fails would only show up at boot.
    const moduleRef = await Test.createTestingModule({
      providers: [WalletRegistry],
    }).compile();
    registry = moduleRef.get(WalletRegistry);
  });

  it("reports every provider unconfigured while none has a client", () => {
    const availability = registry.availability();

    expect(availability).toHaveLength(Object.keys(WalletProvider).length);
    expect(availability.every((row) => row.configured === false)).toBe(true);
  });

  it("covers every WalletProvider member, so a new one cannot be silently omitted", () => {
    const reported = registry.availability().map((row) => row.provider);

    expect([...reported].sort()).toEqual(Object.values(WalletProvider).sort());
  });

  it("never fakes success — checkout returns coming-soon copy naming the provider", () => {
    for (const provider of Object.values(WalletProvider)) {
      const result = registry.checkout(provider);

      expect(result.provider).toBe(provider);
      expect(result.instructions).toMatch(/coming soon/i);
      // No deep link, USSD or voucher means the client has nothing to redirect
      // to, which is the honest state until a merchant agreement lands.
      expect(result.deepLink).toBeUndefined();
      expect(result.ussd).toBeUndefined();
      expect(result.voucherId).toBeUndefined();
    }
  });
});
