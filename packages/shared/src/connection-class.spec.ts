import {
  BANDWIDTH_POLICY,
  BandwidthMode,
  ConnectionClass,
  connectionClassFromEffectiveType,
  connectionClassFromHeader,
  connectionClassFromNetInfo,
  kilobytes,
  modeForConnection,
  policyFor,
} from "./connection-class";

describe("connection class detection", () => {
  it("reads the web effectiveType values", () => {
    expect(connectionClassFromEffectiveType("slow-2g")).toBe("slow");
    expect(connectionClassFromEffectiveType("2g")).toBe("slow");
    expect(connectionClassFromEffectiveType("3g")).toBe("moderate");
    expect(connectionClassFromEffectiveType("4g")).toBe("fast");
  });

  // Safari and Firefox do not implement navigator.connection at all, so this is
  // the common case, not the edge one. Reading it as "fast" would over-fetch on
  // every browser that cannot tell us — the exact failure this module prevents.
  it("treats an unknown web connection as moderate, never fast", () => {
    expect(connectionClassFromEffectiveType(undefined)).toBe("moderate");
    expect(connectionClassFromEffectiveType(null)).toBe("moderate");
    expect(connectionClassFromEffectiveType("")).toBe("moderate");
    expect(connectionClassFromEffectiveType("6g")).toBe("moderate");
  });

  it("reads NetInfo state on mobile", () => {
    expect(connectionClassFromNetInfo({ type: "wifi", isConnected: true })).toBe("fast");
    expect(
      connectionClassFromNetInfo({
        type: "cellular",
        isConnected: true,
        details: { cellularGeneration: "2g" },
      }),
    ).toBe("slow");
    expect(
      connectionClassFromNetInfo({
        type: "cellular",
        isConnected: true,
        details: { cellularGeneration: "5g" },
      }),
    ).toBe("fast");
    expect(
      connectionClassFromNetInfo({
        type: "cellular",
        isConnected: true,
        details: { cellularGeneration: null },
      }),
    ).toBe("moderate");
  });

  it("reports offline from either signal NetInfo gives", () => {
    expect(connectionClassFromNetInfo({ type: "none" })).toBe("offline");
    expect(connectionClassFromNetInfo({ type: "cellular", isConnected: false })).toBe("offline");
    expect(connectionClassFromNetInfo(null)).toBe("offline");
  });
});

describe("modes", () => {
  it("puts 2G and offline on light without asking", () => {
    expect(modeForConnection(ConnectionClass.SLOW)).toBe(BandwidthMode.LIGHT);
    expect(modeForConnection(ConnectionClass.OFFLINE)).toBe(BandwidthMode.LIGHT);
    expect(modeForConnection(ConnectionClass.MODERATE)).toBe(BandwidthMode.NORMAL);
    expect(modeForConnection(ConnectionClass.FAST)).toBe(BandwidthMode.FULL);
  });

  // The budget is 24 KB for ten posts. Light exists to stay under it on a
  // connection that charges 6.4 seconds for that, so every one of these is a
  // number the payload budget depends on, not a preference.
  it("light spends nothing it does not have to", () => {
    const light = policyFor(BandwidthMode.LIGHT);
    expect(light.autoLoadImages).toBe(false);
    expect(light.allowVideo).toBe(false);
    expect(light.prefetch).toBe(false);
    expect(light.pageSize).toBe(5);
    expect(light.imageWidth).toBe(320);
    expect(light.avatarWidth).toBe(32);
    expect(light.pollIntervalMs).toBe(120_000);
  });

  it("holds an EventSource open only when the connection can afford one", () => {
    expect(policyFor(BandwidthMode.LIGHT).pollIntervalMs).not.toBeNull();
    expect(policyFor(BandwidthMode.NORMAL).pollIntervalMs).toBeNull();
    expect(policyFor(BandwidthMode.FULL).pollIntervalMs).toBeNull();
  });

  it("only ever asks for a variant that exists", () => {
    // Three image variants are stored (320/640/1080) and two avatar variants
    // (32/96). A mode that asked for anything else would 404 or, worse, fall
    // back to the original upload.
    for (const policy of Object.values(BANDWIDTH_POLICY)) {
      expect([320, 640, 1080]).toContain(policy.imageWidth);
      expect([32, 96]).toContain(policy.avatarWidth);
    }
  });

  it("never prefetches on a connection that is not fast", () => {
    expect(policyFor(BandwidthMode.NORMAL).prefetch).toBe(false);
    expect(policyFor(BandwidthMode.FULL).prefetch).toBe(true);
  });
});

describe("the server-side hint", () => {
  it("accepts the four classes, case-insensitively", () => {
    expect(connectionClassFromHeader("slow")).toBe("slow");
    expect(connectionClassFromHeader("FAST")).toBe("fast");
    expect(connectionClassFromHeader(" moderate ")).toBe("moderate");
    expect(connectionClassFromHeader("offline")).toBe("offline");
  });

  // A hint is not a security boundary. Garbage must shape a payload, never
  // fail a request: turning a bandwidth optimisation into a 400 would be a
  // self-inflicted outage on the connections least able to retry.
  it("falls back rather than throwing on anything else", () => {
    expect(connectionClassFromHeader("../../etc/passwd")).toBe("moderate");
    expect(connectionClassFromHeader("")).toBe("moderate");
    expect(connectionClassFromHeader(undefined)).toBe("moderate");
  });
});

describe("kilobytes", () => {
  it("rounds up, and never says zero", () => {
    expect(kilobytes(0)).toBe(1);
    expect(kilobytes(1)).toBe(1);
    expect(kilobytes(1024)).toBe(1);
    expect(kilobytes(1025)).toBe(2);
    expect(kilobytes(2765)).toBe(3);
  });
});
