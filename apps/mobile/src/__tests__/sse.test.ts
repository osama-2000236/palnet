/**
 * The React Native half of the SSE client.
 *
 * This file exists because mobile shipped with no reconnection at all. It set
 * `pollingInterval: 0` — which disables react-native-sse's own retry — and then
 * scheduled nothing itself, so the notification badge and the message thread
 * went dead on the first dropped connection and stayed dead until a React
 * effect happened to re-run. Web had a full retry loop and six tests for it;
 * mobile had the same feature, a different file, and no coverage.
 *
 * The ladder itself is the shared loop's and is tested in
 * `packages/shared/src/sse-retry.spec.ts`. What is pinned here is the RN
 * wiring: a stream token minted per attempt (not a 15-minute access token),
 * carried in the query string, with the library's own retry left off.
 */
import { subscribeSse } from "../lib/sse";

type MockListener = (event: { type: string; data?: string | null }) => void;

interface MockSource {
  url: string;
  options: { pollingInterval?: number };
  listeners: Map<string, Set<MockListener>>;
  closed: boolean;
  emit(type: string, data?: string): void;
}

// `mock`-prefixed so jest's factory hoisting allows the reference, matching the
// convention in app-shell-tabs.test.tsx.
const mockSources: MockSource[] = [];
const mockApiFetch = jest.fn();
const mockGetAccessToken = jest.fn();

jest.mock("@/lib/api", () => ({
  API_BASE: "https://api.test/api/v1",
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  // Not the raw stored token: the mint refreshes first if there is none, so a
  // reconnect after a long background does not fail on an expired access token.
  getValidAccessToken: () => mockGetAccessToken(),
}));

jest.mock("react-native-sse", () => ({
  __esModule: true,
  default: class {
    constructor(url: string, options: { pollingInterval?: number }) {
      const listeners = new Map<string, Set<MockListener>>();
      const source: MockSource = {
        url,
        options,
        listeners,
        closed: false,
        emit(type, data) {
          for (const listener of listeners.get(type) ?? []) listener({ type, data });
        },
      };
      mockSources.push(source);
      return {
        ...source,
        addEventListener(type: string, listener: MockListener) {
          const set = listeners.get(type) ?? new Set<MockListener>();
          set.add(listener);
          listeners.set(type, set);
        },
        removeEventListener(type: string, listener: MockListener) {
          listeners.get(type)?.delete(listener);
        },
        close() {
          source.closed = true;
        },
      };
    }
  },
}));

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/** Stands in for a zod schema; decoding is the caller's concern, not the wiring's. */
const passthrough = { safeParse: (value: unknown) => ({ success: true as const, data: value }) };

beforeEach(() => {
  jest.useFakeTimers();
  mockSources.length = 0;
  mockApiFetch.mockReset();
  mockGetAccessToken.mockReset();
  mockGetAccessToken.mockResolvedValue("access-1");
  let n = 0;
  mockApiFetch.mockImplementation(() => Promise.resolve({ token: `stream-token-${++n}` }));
  jest.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("carries a minted stream token in the query string, not an auth header", async () => {
  const close = subscribeSse({
    scope: "notifications",
    schema: passthrough as never,
    onEvent: jest.fn(),
  });
  await flush();

  expect(mockApiFetch).toHaveBeenCalledWith(
    "/auth/stream-token",
    expect.anything(),
    expect.objectContaining({
      method: "POST",
      token: "access-1",
      body: { scope: "notifications" },
    }),
  );
  expect(mockSources[0]!.url).toBe(
    "https://api.test/api/v1/notifications/stream?token=stream-token-1",
  );
  // Left off deliberately: the library reconnects by replaying the identical
  // URL, and the token in it is single-use. The shared loop owns retry instead.
  expect(mockSources[0]!.options.pollingInterval).toBe(0);
  close();
});

it("reconnects with a fresh token after a drop", async () => {
  // The regression. Before the shared loop this produced exactly one source and
  // then silence, for as long as the app stayed on the screen.
  const onDrop = jest.fn();
  const close = subscribeSse({
    scope: "messaging",
    schema: passthrough as never,
    onEvent: jest.fn(),
    onDrop,
  });
  await flush();
  expect(mockSources).toHaveLength(1);

  mockSources[0]!.emit("error");
  await jest.advanceTimersByTimeAsync(750);
  await flush();

  expect(onDrop).toHaveBeenCalledTimes(1);
  expect(mockSources).toHaveLength(2);
  expect(mockSources[0]!.closed).toBe(true);
  expect(mockSources[1]!.url).toContain("token=stream-token-2");
  close();
});

it("delivers named event types, not just plain messages", async () => {
  // The API sends `message.new`, `typing`, `notification.unread-count` and
  // friends as named SSE events; a listener on "message" alone receives none of
  // them.
  const onEvent = jest.fn();
  const close = subscribeSse({
    scope: "messaging",
    schema: passthrough as never,
    onEvent,
  });
  await flush();

  mockSources[0]!.emit("message.new", '{"type":"message.new"}');
  mockSources[0]!.emit("typing", '{"type":"typing"}');

  expect(onEvent.mock.calls.map((c) => c[0])).toEqual([
    { type: "message.new" },
    { type: "typing" },
  ]);
  close();
});

it("survives a malformed frame instead of tearing the stream down", async () => {
  const onEvent = jest.fn();
  const onError = jest.fn();
  const close = subscribeSse({
    scope: "messaging",
    schema: passthrough as never,
    onEvent,
    onError,
  });
  await flush();

  mockSources[0]!.emit("message", "not json{");
  mockSources[0]!.emit("message", '{"type":"message.new"}');

  expect(onError).toHaveBeenCalledTimes(1);
  expect(onEvent).toHaveBeenCalledTimes(1);
  expect(mockSources).toHaveLength(1);
  close();
});

it("stops the ladder when unsubscribed and detaches its listeners", async () => {
  const close = subscribeSse({
    scope: "notifications",
    schema: passthrough as never,
    onEvent: jest.fn(),
  });
  await flush();

  close();
  await jest.advanceTimersByTimeAsync(60_000);
  await flush();

  expect(mockSources[0]!.closed).toBe(true);
  expect([...mockSources[0]!.listeners.values()].every((set) => set.size === 0)).toBe(true);
  expect(mockSources).toHaveLength(1);
});
