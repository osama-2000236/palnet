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
});
