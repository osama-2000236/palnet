/**
 * The native outbox storage, against a fake filesystem.
 *
 * The shared spec proves the queue logic; this proves the half that is
 * genuinely platform-specific — that a queue written on this device is the
 * queue read back, and that a filesystem which refuses to cooperate degrades
 * to "cannot persist" rather than "cannot post".
 */
import type { OutboxEntry } from "@baydar/shared";

// `mock`-prefixed: jest's module factory may only close over names it can
// prove are hoisted with the mock.
const mockFiles = new Map<string, string>();
const mockDisk = { writeThrows: false };

jest.mock("expo-file-system", () => {
  class FakeFile {
    readonly path: string;
    constructor(...parts: unknown[]) {
      this.path = parts.map(String).join("/");
    }
    get exists(): boolean {
      return mockFiles.has(this.path);
    }
    create(): void {
      mockFiles.set(this.path, "");
    }
    text(): Promise<string> {
      return Promise.resolve(mockFiles.get(this.path) ?? "");
    }
    write(content: string): void {
      if (mockDisk.writeThrows) throw new Error("ENOSPC");
      mockFiles.set(this.path, content);
    }
  }
  return { File: FakeFile, Paths: { document: "doc" } };
});

// eslint-disable-next-line import/first -- the mock must be registered first.
import { createNativeOutboxStorage } from "../lib/outbox-storage";

const entry = (id: string): OutboxEntry => ({
  id,
  kind: "POST",
  payload: { body: "منشور لم يُرسل" },
  createdAt: 1,
  attempts: 0,
  state: "queued",
  nextAttemptAt: 1,
});

beforeEach(() => {
  mockFiles.clear();
  mockDisk.writeThrows = false;
});

describe("the native outbox storage", () => {
  it("reads back exactly what it wrote, Arabic and all", async () => {
    const storage = createNativeOutboxStorage();

    await storage.write([entry("a"), entry("b")]);

    expect(await storage.read()).toEqual([entry("a"), entry("b")]);
  });

  it("starts empty rather than failing when there is no file yet", async () => {
    expect(await createNativeOutboxStorage().read()).toEqual([]);
  });

  it("reads a corrupted queue as empty instead of throwing into the composer", async () => {
    // The write is not atomic, so a kill mid-write can leave half a file.
    // Losing the queue there is bad; throwing out of every composer is worse.
    const storage = createNativeOutboxStorage();
    await storage.write([entry("a")]);
    mockFiles.set([...mockFiles.keys()][0]!, '[{"id":"a"');

    expect(await storage.read()).toEqual([]);
  });

  it("keeps posting when the disk refuses the write", async () => {
    // A queue that cannot persist still sends. Refusing to post because the
    // disk is full would be the worse failure.
    mockDisk.writeThrows = true;

    await expect(createNativeOutboxStorage().write([entry("a")])).resolves.toBeUndefined();
  });
});
