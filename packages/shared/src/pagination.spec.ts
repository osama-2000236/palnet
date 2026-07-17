import { takePage } from "./pagination";

describe("takePage", () => {
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("trims the limit+1 overfetch and sets the cursor to the last kept id", () => {
    const { rows: page, meta } = takePage(rows, 2);
    expect(page.map((r) => r.id)).toEqual(["a", "b"]);
    expect(meta).toEqual({ nextCursor: "b", hasMore: true, limit: 2 });
  });

  it("keeps everything with a null cursor when there is no extra row", () => {
    const { rows: page, meta } = takePage(rows, 3);
    expect(page).toHaveLength(3);
    expect(meta).toEqual({ nextCursor: null, hasMore: false, limit: 3 });
  });
});
