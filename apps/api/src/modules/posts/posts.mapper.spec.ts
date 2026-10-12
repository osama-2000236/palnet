import { postInclude } from "./posts.mapper";

describe("postInclude", () => {
  it("counts the same comments the comments endpoint lists: live and top-level", () => {
    expect(postInclude("u_1", ["u_blocked"])._count.select.comments.where).toEqual({
      deletedAt: null,
      parentId: null,
      authorId: { notIn: ["u_blocked"] },
    });
  });
});
