/**
 * The browser half of the SSE client.
 *
 * The retry ladder, the per-attempt mint and the dead-session stop are the
 * shared loop's and are tested once in `packages/shared/src/sse-retry.spec.ts`.
 * What is browser-specific — and what this file pins — is that `EventSource`
 * cannot send an Authorization header, so the freshly minted token has to reach
 * the server in the query string of the right per-scope path, and the three
 * `on*` properties have to be wired to the loop.
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
}

/** Let the queued promise jobs inside the loop's `connect()` run. */
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
  getValidAccessToken.mockResolvedValue("access-1");
  apiFetch.mockResolvedValue({ token: "stream-token-1" });
  (globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

it.each([
  ["notifications", "/notifications/stream"],
  ["messaging", "/messaging/stream"],
] as const)("puts the minted token in the query string of the %s path", async (scope, path) => {
  const close = openStream(scope, { onEvent: jest.fn() });
  await flush();

  expect(apiFetch).toHaveBeenCalledWith(
    "/auth/stream-token",
    expect.anything(),
    expect.objectContaining({ method: "POST", token: "access-1", body: { scope } }),
  );
  const url = FakeEventSource.instances[0]!.url;
  expect(url).toContain(path);
  expect(url).toContain("token=stream-token-1");
  close();
});

it("never reaches the mint endpoint without an access token", async () => {
  getValidAccessToken.mockResolvedValue(null);
  const onFailed = jest.fn();
  const close = openStream("notifications", { onEvent: jest.fn(), onFailed });
  await flush();

  expect(apiFetch).not.toHaveBeenCalled();
  expect(FakeEventSource.instances).toHaveLength(0);
  expect(onFailed).toHaveBeenCalledTimes(1);
  close();
});

it("wires open, message and error through to the caller's handlers", async () => {
  const onEvent = jest.fn();
  const onOpen = jest.fn();
  const onDrop = jest.fn();
  const close = openStream("messaging", { onEvent, onOpen, onDrop });
  await flush();
  const source = FakeEventSource.instances[0]!;

  source.onopen!();
  source.onmessage!({ data: '{"type":"message.new"}' } as MessageEvent<string>);
  source.onerror!();

  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(onEvent).toHaveBeenCalledWith('{"type":"message.new"}');
  expect(onDrop).toHaveBeenCalledTimes(1);
  // Closed before the retry is scheduled, so the browser's own doomed retry
  // loop cannot run against the spent token in parallel with ours.
  expect(source.closed).toBe(true);
  close();
});
