import React from "react";
import { createRoot, type Root } from "react-dom/client";

import { useOnline, type OnlineState } from "../useOnline";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function setNavigatorOnline(value: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  });
}

describe("useOnline", () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: OnlineState | null;

  beforeEach(() => {
    jest.useFakeTimers();
    setNavigatorOnline(true);
    latest = null;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    React.act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  function Probe(): JSX.Element {
    latest = useOnline(500);
    return <div data-state={latest} />;
  }

  it("reports offline, restored, and then online states", () => {
    React.act(() => {
      root.render(<Probe />);
    });

    expect(latest).toBe("online");

    React.act(() => {
      setNavigatorOnline(false);
      window.dispatchEvent(new Event("offline"));
    });
    expect(latest).toBe("offline");

    React.act(() => {
      setNavigatorOnline(true);
      window.dispatchEvent(new Event("online"));
    });
    expect(latest).toBe("restored");

    React.act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(latest).toBe("online");
  });

  it("catches a connection that died before the listeners attached", () => {
    // The gap this closes: the initial state is sampled during render, and the
    // browser can go offline between that sample and the effect that starts
    // listening — during startup, which is when a phone on a bad link does it.
    // The `offline` event fired in that window has nobody to hear it, and
    // nothing reads `navigator.onLine` again, so the app stayed "online"
    // forever: skeletons, no banner, no explanation.
    let mounted = false;
    function LateOffline(): JSX.Element {
      latest = useOnline(500);
      // Render-time, i.e. after `useState`'s initializer has already read
      // `navigator.onLine` as true and before the effect runs.
      if (!mounted) {
        mounted = true;
        setNavigatorOnline(false);
      }
      return <div data-state={latest} />;
    }

    React.act(() => {
      root.render(<LateOffline />);
    });

    expect(latest).toBe("offline");
  });
});
