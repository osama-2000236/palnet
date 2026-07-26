/**
 * SSE reconnection had no coverage anywhere in the repo, on either platform.
 *
 * It is also the one place where the browser's own retry cannot help: the
 * stream is authenticated by a single-use token in the query string, and
 * `EventSource` retries by replaying the identical URL, so its built-in retry
 * always presents a spent token. These tests pin the behaviour that has to
 * replace it.
 */
import { openStream } from "../sse";

const apiFetch = jest.fn();
const getValidAccessToken = jest.fn();
jest.mock("../api", () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
  getValidAccessToken: () => getValidAccessToken(),
}));

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  close(): void {
    this.closed = true;
  }

  emitOpen(): void {
    this.onopen?.();
  }

  emitMessage(data: string): void {
    this.onmessage?.({ data } as MessageEvent<string>);
  }

  emitError(): void {
    this.onerror?.();
  }
}

/** Let the queued promise jobs inside `connect()` run. */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeEventSource.instances = [];
  apiFetch.mockReset();
  getValidAccessToken.mockReset();
  // Resolved per attempt, not captured — a stale 15-minute token is exactly
  // how a reconnect after a closed laptop used to die.
  getValidAccessToken.mockResolvedValue("access-1");
  let n = 0;
  apiFetch.mockImplementation(() => Promise.resolve({ token: `stream-token-${++n}` }));
  (globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource;
  // Deterministic jitter.
  jest.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("mints a fresh stream token for every connection attempt", async () => {
  const close = openStream("notifications", { onEvent: jest.fn() });
  await flush();
  expect(FakeEventSource.instances).toHaveLength(1);
  expect(FakeEventSource.instances[0]!.url).toContain("stream-token-1");

  FakeEventSource.instances[0]!.emitError();
  await jest.advanceTimersByTimeAsync(1_000);
  await flush();

  expect(FakeEventSource.instances).toHaveLength(2);
  // The whole point: a *different* token. Replaying the first one is what the
  // browser does on its own, and the server rejects it as already consumed.
  expect(FakeEventSource.instances[1]!.url).toContain("stream-token-2");
  expect(apiFetch).toHaveBeenCalledTimes(2);
  close();
});

it("closes the dead source before retrying, so the browser cannot race us", async () => {
  const close = openStream("messaging", { onEvent: jest.fn() });
  await flush();
  const first = FakeEventSource.instances[0]!;

  first.emitError();
  expect(first.closed).toBe(true);

  await jest.advanceTimersByTimeAsync(1_000);
  await flush();
  expect(FakeEventSource.instances).toHaveLength(2);
  close();
});

it("backs off exponentially and resets the backoff once a connection opens", async () => {
  const close = openStream("notifications", { onEvent: jest.fn() });
  await flush();

  // Caps double (1s, 2s, 4s); the jitter is `cap/2 + random*cap/2`, and with
  // Math.random pinned at 0.5 that is 0.75 * cap.
  for (const expected of [750, 1_500, 3_000]) {
    FakeEventSource.instances.at(-1)!.emitError();
    await jest.advanceTimersByTimeAsync(expected - 1);
    await flush();
    const before = FakeEventSource.instances.length;
    await jest.advanceTimersByTimeAsync(1);
    await flush();
    expect(FakeEventSource.instances.length).toBe(before + 1);
  }

  // A successful open resets the ladder: the next drop waits 750ms again,
  // not the 6s the counter would otherwise have reached.
  FakeEventSource.instances.at(-1)!.emitOpen();
  FakeEventSource.instances.at(-1)!.emitError();
  const before = FakeEventSource.instances.length;
  await jest.advanceTimersByTimeAsync(750);
  await flush();
  expect(FakeEventSource.instances.length).toBe(before + 1);
  close();
});

it("stops retrying once unsubscribed", async () => {
  const close = openStream("notifications", { onEvent: jest.fn() });
  await flush();
  const first = FakeEventSource.instances[0]!;

  first.emitError();
  close();
  await jest.advanceTimersByTimeAsync(60_000);
  await flush();

  expect(FakeEventSource.instances).toHaveLength(1);
});

it("does not reconnect when the session itself is gone", async () => {
  getValidAccessToken.mockResolvedValue(null);
  const onFailed = jest.fn();
  const close = openStream("notifications", { onEvent: jest.fn(), onFailed });
  await flush();

  expect(FakeEventSource.instances).toHaveLength(0);
  expect(onFailed).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(60_000);
  await flush();
  // One attempt, not an infinite retry loop against a dead session. The mint
  // is never reached because there is no access token to mint with.
  expect(getValidAccessToken).toHaveBeenCalledTimes(1);
  expect(apiFetch).not.toHaveBeenCalled();
  close();
});

it("reports drop then open across a reconnect, and delivers events from the new source", async () => {
  const onEvent = jest.fn();
  const onOpen = jest.fn();
  const onDrop = jest.fn();
  const close = openStream("messaging", { onEvent, onOpen, onDrop });
  await flush();

  FakeEventSource.instances[0]!.emitOpen();
  FakeEventSource.instances[0]!.emitMessage('{"type":"message.new"}');
  FakeEventSource.instances[0]!.emitError();
  await jest.advanceTimersByTimeAsync(1_000);
  await flush();
  FakeEventSource.instances[1]!.emitOpen();
  FakeEventSource.instances[1]!.emitMessage('{"type":"message.edited"}');

  expect(onDrop).toHaveBeenCalledTimes(1);
  expect(onOpen).toHaveBeenCalledTimes(2);
  expect(onEvent.mock.calls.map((c) => c[0])).toEqual([
    '{"type":"message.new"}',
    '{"type":"message.edited"}',
  ]);
  close();
});
