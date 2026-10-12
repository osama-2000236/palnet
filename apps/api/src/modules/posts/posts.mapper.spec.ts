import { postInclude } from "./posts.mapper";

describe("postInclude", () => {
  it("counts the same comments the thread shows: live, and replies under a shown root", () => {
    const hidden = { authorId: { notIn: ["u_blocked"] } };
    expect(postInclude("u_1", ["u_blocked"])._count.select.comments.where).toEqual({
      deletedAt: null,
      ...hidden,
      OR: [{ parentId: null }, { parent: { deletedAt: null, ...hidden } }],
    });
  });
});
