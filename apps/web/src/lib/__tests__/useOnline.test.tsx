import React from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server.node";

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

  function Probe(): JSX.Element | null {
    latest = useOnline(500);
    return latest === "offline" ? <div role="status" /> : null;
  }

  it("hydrates an initially offline client without a markup mismatch", () => {
    const serverContainer = document.createElement("div");
    document.body.appendChild(serverContainer);
    serverContainer.innerHTML = renderToString(<Probe />);
    setNavigatorOnline(false);

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const hydrationErrors: Error[] = [];
    let hydratedRoot: Root | undefined;
    React.act(() => {
      hydratedRoot = hydrateRoot(serverContainer, <Probe />, {
        onCaughtError: (error) => hydrationErrors.push(error),
      });
    });

    expect(latest).toBe("offline");
    expect(hydrationErrors).toEqual([]);
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("hydrated");

    React.act(() => hydratedRoot?.unmount());
    consoleError.mockRestore();
    serverContainer.remove();
  });

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
