import { PeopleSearchQuery } from "./search";

describe("PeopleSearchQuery", () => {
  it("rejects punctuation-only queries", () => {
    expect(PeopleSearchQuery.safeParse({ q: "!", limit: 20 }).success).toBe(false);
  });

  it("accepts opaque pagination cursors", () => {
    const parsed = PeopleSearchQuery.parse({
      q: "محمد",
      after: "eyJyYW5rIjowLjcsImlkIjoicF8xIn0",
      limit: 20,
    });

    expect(parsed.after).toBe("eyJyYW5rIjowLjcsImlkIjoicF8xIn0");
  });
});
