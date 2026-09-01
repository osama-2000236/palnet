"use client";

import { useEffect, useState } from "react";

export type OnlineState = "online" | "offline" | "restored";

export function useOnline(restoredVisibleMs = 4000): OnlineState {
  const [state, setState] = useState<OnlineState>(() => {
    if (typeof navigator === "undefined") return "online";
    return navigator.onLine ? "online" : "offline";
  });

  useEffect(() => {
    // Re-read the truth when the listeners attach. The initial state is sampled
    // during render, and the browser can drop the connection between that
    // sample and this effect — during startup, which is exactly when a phone on
    // a bad link does it. The `offline` event fired in that window has nobody
    // listening, and nothing reads `navigator.onLine` again, so the app stayed
    // "online" forever: skeletons, no banner, no explanation. Measured by
    // reproducing the harness's own offline sequence — `navigator.onLine`
    // false, zero banners on screen.
    if (typeof navigator !== "undefined" && !navigator.onLine) setState("offline");

    let restoredTimer: ReturnType<typeof setTimeout> | null = null;

    const clearRestoredTimer = (): void => {
      if (restoredTimer) clearTimeout(restoredTimer);
      restoredTimer = null;
    };

    const onOffline = (): void => {
      clearRestoredTimer();
      setState("offline");
    };

    const onOnline = (): void => {
      setState((previous) => (previous === "offline" ? "restored" : "online"));
      clearRestoredTimer();
      restoredTimer = setTimeout(() => setState("online"), restoredVisibleMs);
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return (): void => {
      clearRestoredTimer();
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [restoredVisibleMs]);

  return state;
}
