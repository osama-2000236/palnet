import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { CommentsList } from "@/components/CommentsList";
import { apiFetch, apiFetchPage } from "@/lib/api";

const author = (id: string, firstName: string) => ({
  id,
  handle: id,
  firstName,
  lastName: "",
  avatarUrl: null,
});
const comment = (id: string, body: string, parentId: string | null = null) => ({
  id,
  postId: "p_1",
  parentId,
  body,
  author: author(`u_${id}`, `name_${id}`),
  createdAt: "2026-10-01T00:00:00.000Z",
});

jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
  apiFetchPage: jest.fn(),
}));
jest.mock("@/lib/session", () => ({ getAccessToken: jest.fn().mockResolvedValue("tok") }));
jest.mock("@/api/safety", () => ({ useReport: () => ({ isPending: false, mutate: jest.fn() }) }));

describe("CommentsList replies", () => {
  it("shows replies under their root, and a reply to a reply posts to the root", async () => {
    (apiFetchPage as jest.Mock).mockResolvedValue({
      data: [
        {
          ...comment("croot00000001", "جذر"),
          replies: [comment("creply0000001", "رد أول", "croot00000001")],
        },
      ],
      meta: { nextCursor: null, hasMore: false, limit: 20 },
    });
    (apiFetch as jest.Mock).mockResolvedValue(comment("creply0000002", "رد ثان", "croot00000001"));
    const onCountChange = jest.fn();
    const screen = render(<CommentsList postId="p_1" onCountChange={onCountChange} />);

    await waitFor(() => expect(screen.getByText("رد أول")).toBeTruthy());

    // The second Reply button belongs to the existing reply, not the root.
    fireEvent.press(screen.getAllByText("post.reply")[1]!);
    expect(screen.getByText("post.replyingTo")).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText("post.replyPlaceholder"), "رد ثان");
    fireEvent.press(screen.getByText("post.commentSubmit"));

    await waitFor(() => expect(screen.getByText("رد ثان")).toBeTruthy());
    expect(apiFetch).toHaveBeenCalledWith(
      "/posts/p_1/comments",
      expect.anything(),
      expect.objectContaining({ body: { body: "رد ثان", parentId: "croot00000001" } }),
    );
    expect(onCountChange).toHaveBeenCalledWith(1);
    expect(screen.queryByText("post.replyingTo")).toBeNull();
  });
});
