/**
 * The browser outbox storage.
 *
 * jsdom ships no IndexedDB, so what is asserted here is the degradation path —
 * which is the one worth pinning anyway. Private browsing and locked-down
 * profiles refuse IndexedDB outright, and the wrong answer there is an
 * exception thrown out of every composer.
 *
 * The happy path is exercised end to end by the 2G Playwright journey, in a
 * real browser with a real IndexedDB, rather than against a polyfill that
 * would only prove the polyfill works.
 */
import type { OutboxEntry } from "@baydar/shared";

import { createWebOutboxStorage } from "../outbox-storage";

const entry: OutboxEntry = {
  id: "ob-1",
  kind: "POST",
  payload: { body: "منشور لم يُرسل" },
  createdAt: 1,
  attempts: 0,
  state: "queued",
  nextAttemptAt: 1,
};

describe("when the browser has no IndexedDB", () => {
  it("reads empty instead of throwing", async () => {
    await expect(createWebOutboxStorage().read()).resolves.toEqual([]);
  });

  it("accepts a write instead of throwing", async () => {
    // Losing durability in a private window is bad; refusing to let the member
    // post at all is worse.
    await expect(createWebOutboxStorage().write([entry])).resolves.toBeUndefined();
  });
});

describe("when IndexedDB is present but refuses every request", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");

  beforeAll(() => {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: {
        open: () => {
          const request: Record<string, unknown> = { error: new Error("blocked") };
          // Fire asynchronously, the way a real request does.
          setTimeout(() => (request.onerror as (() => void) | undefined)?.(), 0);
          return request;
        },
      },
    });
  });

  afterAll(() => {
    if (original) Object.defineProperty(globalThis, "indexedDB", original);
    else Reflect.deleteProperty(globalThis, "indexedDB");
  });

  it("still reads empty and still accepts a write", async () => {
    const storage = createWebOutboxStorage();
    await expect(storage.read()).resolves.toEqual([]);
    await expect(storage.write([entry])).resolves.toBeUndefined();
  });
});
