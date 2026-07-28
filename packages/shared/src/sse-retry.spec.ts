/**
 * The reconnect loop, tested without a platform.
 *
 * These cases used to live in `apps/web/src/lib/__tests__/sse.test.ts` and
 * covered the browser only. Mobile had the same code path with no reconnection
 * whatsoever and no test that could have noticed — the loop is shared now, so
 * these run once for both clients.
 */
import { openStreamLoop, type StreamSource, type StreamSourceHandlers } from "./sse-retry";

class FakeSource implements StreamSource {
  static instances: FakeSource[] = [];
  closed = false;

  constructor(
    readonly token: string,
    readonly handlers: StreamSourceHandlers,
  ) {
    FakeSource.instances.push(this);
  }

  close(): void {
    this.closed = true;
  }
}

/** Let the queued promise jobs inside `connect()` run. */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

let mintToken: jest.Mock<Promise<string | null>, []>;

function open(handlers: Parameters<typeof openStreamLoop>[0]["handlers"]): () => void {
  return openStreamLoop({
    mintToken: () => mintToken(),
    openSource: (token, sourceHandlers) => new FakeSource(token, sourceHandlers),
    handlers,
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeSource.instances = [];
  let n = 0;
  // Resolved per attempt, not captured — a stale token is exactly how a
  // reconnect after a closed laptop dies.
  mintToken = jest.fn(() => Promise.resolve(`stream-token-${++n}`));
  // Deterministic jitter.
  jest.spyOn(Math, "random").mockReturnValue(0.5);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it("mints a fresh stream token for every connection attempt", async () => {
  const close = open({ onEvent: jest.fn() });
  await flush();
  expect(FakeSource.instances).toHaveLength(1);
  expect(FakeSource.instances[0]!.token).toBe("stream-token-1");

  FakeSource.instances[0]!.handlers.onError();
  await jest.advanceTimersByTimeAsync(1_000);
  await flush();

  expect(FakeSource.instances).toHaveLength(2);
  // The whole point: a *different* token. Replaying the first one is what every
  // platform does on its own, and the server rejects it as already consumed.
  expect(FakeSource.instances[1]!.token).toBe("stream-token-2");
  expect(mintToken).toHaveBeenCalledTimes(2);
  close();
});

it("closes the dead source before retrying, so the platform cannot race us", async () => {
  const close = open({ onEvent: jest.fn() });
  await flush();
  const first = FakeSource.instances[0]!;

  first.handlers.onError();
  expect(first.closed).toBe(true);

  await jest.advanceTimersByTimeAsync(1_000);
  await flush();
  expect(FakeSource.instances).toHaveLength(2);
  close();
});

it("backs off exponentially and resets the backoff once a connection opens", async () => {
  const close = open({ onEvent: jest.fn() });
  await flush();

  // Caps double (1s, 2s, 4s); the jitter is `cap/2 + random*cap/2`, and with
  // Math.random pinned at 0.5 that is 0.75 * cap.
  for (const expected of [750, 1_500, 3_000]) {
    FakeSource.instances.at(-1)!.handlers.onError();
    await jest.advanceTimersByTimeAsync(expected - 1);
    await flush();
    const before = FakeSource.instances.length;
    await jest.advanceTimersByTimeAsync(1);
    await flush();
    expect(FakeSource.instances.length).toBe(before + 1);
  }

  // A successful open resets the ladder: the next drop waits 750ms again, not
  // the 6s the counter would otherwise have reached.
  FakeSource.instances.at(-1)!.handlers.onOpen();
  FakeSource.instances.at(-1)!.handlers.onError();
  const before = FakeSource.instances.length;
  await jest.advanceTimersByTimeAsync(750);
  await flush();
  expect(FakeSource.instances.length).toBe(before + 1);
  close();
});

it("stops retrying once unsubscribed", async () => {
  const close = open({ onEvent: jest.fn() });
  await flush();

  FakeSource.instances[0]!.handlers.onError();
  close();
  await jest.advanceTimersByTimeAsync(60_000);
  await flush();

  expect(FakeSource.instances).toHaveLength(1);
});

it("does not reconnect when the session itself is gone", async () => {
  mintToken.mockResolvedValue(null);
  const onFailed = jest.fn();
  const close = open({ onEvent: jest.fn(), onFailed });
  await flush();

  expect(FakeSource.instances).toHaveLength(0);
  expect(onFailed).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(60_000);
  await flush();
  // One attempt, not an infinite retry loop against a dead session.
  expect(mintToken).toHaveBeenCalledTimes(1);
  close();
});

it("keeps retrying when the mint fails because the server is unreachable", async () => {
  // Caught by killing a live API under a live stream, not by a unit test: the
  // drop fired, the retry 640ms later could not reach the server that had just
  // gone down, and the loop reported `onFailed` and stopped permanently — dead
  // through exactly the restart it existed to survive. An unreachable mint is a
  // drop, not a logged-out account.
  const onFailed = jest.fn();
  const onDrop = jest.fn();
  mintToken.mockRejectedValueOnce(new Error("ECONNREFUSED"));
  mintToken.mockRejectedValueOnce(new Error("ECONNREFUSED"));
  const close = open({ onEvent: jest.fn(), onFailed, onDrop });
  await flush();

  expect(FakeSource.instances).toHaveLength(0);
  expect(onFailed).not.toHaveBeenCalled();

  // Two failed attempts, then the server comes back.
  await jest.advanceTimersByTimeAsync(750);
  await flush();
  await jest.advanceTimersByTimeAsync(1_500);
  await flush();

  expect(mintToken).toHaveBeenCalledTimes(3);
  expect(FakeSource.instances).toHaveLength(1);
  expect(onDrop).toHaveBeenCalledTimes(2);
  expect(onFailed).not.toHaveBeenCalled();
  close();
});

it("still stops for good when the session is gone, not merely unreachable", async () => {
  mintToken.mockResolvedValue(null);
  const onFailed = jest.fn();
  const close = open({ onEvent: jest.fn(), onFailed });
  await flush();

  await jest.advanceTimersByTimeAsync(60_000);
  await flush();

  expect(onFailed).toHaveBeenCalledTimes(1);
  expect(mintToken).toHaveBeenCalledTimes(1);
  expect(FakeSource.instances).toHaveLength(0);
  close();
});

it("reports drop then open across a reconnect, and delivers events from the new source", async () => {
  const onEvent = jest.fn();
  const onOpen = jest.fn();
  const onDrop = jest.fn();
  const close = open({ onEvent, onOpen, onDrop });
  await flush();

  FakeSource.instances[0]!.handlers.onOpen();
  FakeSource.instances[0]!.handlers.onMessage('{"type":"message.new"}');
  FakeSource.instances[0]!.handlers.onError();
  await jest.advanceTimersByTimeAsync(1_000);
  await flush();
  FakeSource.instances[1]!.handlers.onOpen();
  FakeSource.instances[1]!.handlers.onMessage('{"type":"message.edited"}');

  expect(onDrop).toHaveBeenCalledTimes(1);
  expect(onOpen).toHaveBeenCalledTimes(2);
  expect(onEvent.mock.calls.map((c) => c[0])).toEqual([
    '{"type":"message.new"}',
    '{"type":"message.edited"}',
  ]);
  close();
});

it("ignores a late error from a source that has already been replaced", async () => {
  // react-native-sse dispatches `error` from both `onreadystatechange` and
  // `onerror` for one dropped connection, and the two are not simultaneous. If
  // the second arrives after the retry has already reconnected, the pending-timer
  // guard is not holding anything back and the dead source starts a *second*
  // ladder — two live sources on one stream, every event delivered twice, and a
  // notification badge that double-counts.
  const close = open({ onEvent: jest.fn() });
  await flush();
  const first = FakeSource.instances[0]!;

  first.handlers.onError();
  await jest.advanceTimersByTimeAsync(750);
  await flush();
  expect(FakeSource.instances).toHaveLength(2);

  // The replaced source coughs once more, with no retry pending.
  first.handlers.onError();
  await jest.advanceTimersByTimeAsync(60_000);
  await flush();

  expect(FakeSource.instances).toHaveLength(2);
  expect(FakeSource.instances[1]!.closed).toBe(false);
  close();
});
