import { SendMessageBody } from "./message";

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
