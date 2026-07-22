import { Message, SendMessageBody } from "./message";

const base = { body: "hello", clientMessageId: "client-1" };

describe("SendMessageBody mediaUrl", () => {
  it.each([
    ["https://cdn.example.com/a.jpg", true],
    ["http://cdn.example.com/a.jpg", false],
    ["javascript:alert(1)", false],
    [undefined, true],
  ] as const)("%s → ok=%s", (mediaUrl, ok) => {
    const run = () => SendMessageBody.parse(mediaUrl === undefined ? base : { ...base, mediaUrl });
    if (ok) expect(run().mediaUrl).toBe(mediaUrl);
    else expect(run).toThrow();
  });
});

describe("Message mediaUrl stays permissive on reads", () => {
  it("still parses a stored http:// row so one legacy record can't blank a thread", () => {
    const row = {
      id: "cl00000000000000000000000",
      roomId: "cl00000000000000000000001",
      authorId: "cl00000000000000000000002",
      body: "hi",
      mediaUrl: "http://legacy.example.com/a.jpg",
      createdAt: "2026-07-22T00:00:00.000Z",
      editedAt: null,
      deletedAt: null,
      clientMessageId: null,
    };
    expect(Message.parse(row).mediaUrl).toBe("http://legacy.example.com/a.jpg");
  });
});
