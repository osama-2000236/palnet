import { Message, SendMessageBody } from "./message";

describe("SendMessageBody mediaUrl", () => {
  const base = {
    body: "hello",
    clientMessageId: "client-1",
  };

  it("accepts https media URLs", () => {
    const parsed = SendMessageBody.parse({
      ...base,
      mediaUrl: "https://cdn.example.com/post_media/u1/photo.jpg",
    });
    expect(parsed.mediaUrl).toBe("https://cdn.example.com/post_media/u1/photo.jpg");
  });

  it("rejects http media URLs", () => {
    expect(() =>
      SendMessageBody.parse({
        ...base,
        mediaUrl: "http://cdn.example.com/photo.jpg",
      }),
    ).toThrow();
  });

  it("rejects javascript: URLs", () => {
    expect(() =>
      SendMessageBody.parse({
        ...base,
        mediaUrl: "javascript:alert(1)",
      }),
    ).toThrow();
  });

  it("rejects data: URLs", () => {
    expect(() =>
      SendMessageBody.parse({
        ...base,
        mediaUrl: "data:text/html,<script>alert(1)</script>",
      }),
    ).toThrow();
  });

  it("allows omitting mediaUrl", () => {
    const parsed = SendMessageBody.parse(base);
    expect(parsed.mediaUrl).toBeUndefined();
  });
});

describe("Message mediaUrl", () => {
  const base = {
    id: "clzzzzzzzzzzzzzzzzzzzzzzz",
    roomId: "claaaaaaaaaaaaaaaaaaaaaaa",
    authorId: "clbbbbbbbbbbbbbbbbbbbbbbb",
    body: "hi",
    createdAt: "2026-07-01T00:00:00.000Z",
    editedAt: null,
    deletedAt: null,
    clientMessageId: null,
  };

  it("accepts null mediaUrl", () => {
    expect(Message.parse({ ...base, mediaUrl: null }).mediaUrl).toBeNull();
  });

  it("rejects non-https mediaUrl on the wire DTO", () => {
    expect(() => Message.parse({ ...base, mediaUrl: "http://evil.test/x.png" })).toThrow();
  });
});
