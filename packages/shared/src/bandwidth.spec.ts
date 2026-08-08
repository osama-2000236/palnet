import {
  connectionHeaders,
  getBandwidthMode,
  getBandwidthSnapshot,
  resetBandwidth,
  setBandwidthOverride,
  setConnectionClass,
  subscribeBandwidth,
} from "./bandwidth";
import { BandwidthMode, ConnectionClass } from "./connection-class";

afterEach(resetBandwidth);

describe("the bandwidth store", () => {
  it("follows the connection until a member chooses otherwise", () => {
    setConnectionClass(ConnectionClass.SLOW);
    expect(getBandwidthMode()).toBe(BandwidthMode.LIGHT);

    setBandwidthOverride(BandwidthMode.FULL);
    expect(getBandwidthMode()).toBe(BandwidthMode.FULL);

    // A detector update must not silently undo an explicit choice.
    setConnectionClass(ConnectionClass.MODERATE);
    expect(getBandwidthMode()).toBe(BandwidthMode.FULL);

    setBandwidthOverride(null);
    expect(getBandwidthMode()).toBe(BandwidthMode.NORMAL);
  });

  // useSyncExternalStore compares by identity. A getSnapshot that allocates on
  // every read re-renders forever, which is the standard way to hang a React 19
  // tree — so the snapshot must be stable when nothing changed.
  it("keeps the same snapshot object when nothing changed", () => {
    const first = getBandwidthSnapshot();
    setConnectionClass(ConnectionClass.MODERATE);
    expect(getBandwidthSnapshot()).toBe(first);

    setConnectionClass(ConnectionClass.FAST);
    expect(getBandwidthSnapshot()).not.toBe(first);
  });

  it("notifies subscribers only on a real change", () => {
    const seen: string[] = [];
    const unsubscribe = subscribeBandwidth(() => seen.push(getBandwidthMode()));

    setConnectionClass(ConnectionClass.SLOW);
    setConnectionClass(ConnectionClass.SLOW);
    setConnectionClass(ConnectionClass.FAST);
    unsubscribe();
    setConnectionClass(ConnectionClass.SLOW);

    expect(seen).toEqual([BandwidthMode.LIGHT, BandwidthMode.FULL]);
  });
});

describe("the header sent to the API", () => {
  it("reports the effective mode, not the detected connection", () => {
    // A member on 4G who picked خفيف is asking for small responses. Sending
    // "fast" because the radio is fast would hand them 1080px images they
    // explicitly declined.
    setConnectionClass(ConnectionClass.FAST);
    setBandwidthOverride(BandwidthMode.LIGHT);
    expect(connectionHeaders()).toEqual({ "X-Baydar-Connection": "slow" });

    setBandwidthOverride(null);
    expect(connectionHeaders()).toEqual({ "X-Baydar-Connection": "fast" });
  });

  it("asks for the smallest payload while offline", () => {
    setConnectionClass(ConnectionClass.OFFLINE);
    expect(connectionHeaders()).toEqual({ "X-Baydar-Connection": "slow" });
  });
});
