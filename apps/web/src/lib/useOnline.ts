"use client";

import { useEffect, useState } from "react";

export type OnlineState = "online" | "offline" | "restored";

export function useOnline(restoredVisibleMs = 4000): OnlineState {
  const [state, setState] = useState<OnlineState>("online");

  useEffect(() => {
    if (!navigator.onLine) setState("offline");
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
