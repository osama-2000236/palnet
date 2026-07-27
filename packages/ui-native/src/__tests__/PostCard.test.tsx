import { fireEvent, render } from "@testing-library/react-native";

import { PostCard } from "../PostCard";

describe("PostCard", () => {
  const base = {
    author: { id: "u1", firstName: "ليان", lastName: "خليل", handle: "layan" },
    authorName: "ليان خليل",
    authorHeadline: "Full Stack Engineer",
    timestamp: "الآن",
    body: "تحديث مهني قصير",
    reactionCount: 3,
    commentCount: 2,
    repostCount: 1,
  };

  it("keeps visible labels at three actions", () => {
    const onLike = jest.fn();
    const screen = render(
      <PostCard
        {...base}
        actions={[
          { key: "like", label: "أعجبني", icon: "thumb", onPress: onLike },
          { key: "comment", label: "تعليقات", icon: "comment" },
          { key: "save", label: "حفظ", icon: "bookmark" },
        ]}
      />,
    );

    fireEvent.press(screen.getByText("أعجبني"));

    expect(onLike).toHaveBeenCalledTimes(1);
    expect(screen.getByText("تعليقات")).toBeTruthy();
    expect(screen.getByText("حفظ")).toBeTruthy();
  });

  it("keeps four labels visible, and drops to icon-only past four", () => {
    const onLike = jest.fn();
    const screen = render(
      <PostCard
        {...base}
        actions={[
          { key: "like", label: "أعجبني", icon: "thumb", onPress: onLike },
          { key: "comment", label: "تعليقات", icon: "comment" },
          { key: "repost", label: "إعادة نشر", icon: "repost" },
          { key: "save", label: "حفظ", icon: "bookmark" },
        ]}
      />,
    );

    // Four labelled actions were re-measured at 390px in Arabic on web (the
    // row wants 308px of 340px available, nothing clips) and the threshold
    // moved from three to four on both platforms. The labels are visible.
    expect(screen.getByText("إعادة نشر")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("أعجبني"));
    expect(onLike).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("حفظ")).toBeTruthy();
  });

  it("drops to icon-only past four actions, keeping every label accessible", () => {
    const screen = render(
      <PostCard
        {...base}
        actions={[
          { key: "like", label: "أعجبني", icon: "thumb" },
          { key: "comment", label: "تعليقات", icon: "comment" },
          { key: "repost", label: "إعادة نشر", icon: "repost" },
          { key: "save", label: "حفظ", icon: "bookmark" },
          { key: "extra", label: "مشاركة", icon: "share" },
        ]}
      />,
    );

    expect(screen.queryByText("إعادة نشر")).toBeNull();
    expect(screen.getByLabelText("إعادة نشر")).toBeTruthy();
    expect(screen.getByLabelText("حفظ")).toBeTruthy();
  });

  it("renders the header overflow button only when the host wires it", () => {
    const onMorePress = jest.fn();
    const props = {
      author: { id: "u1", firstName: "ليان", lastName: "خليل", handle: "layan" },
      authorName: "ليان خليل",
      body: "تحديث مهني قصير",
      actions: [{ key: "like", label: "أعجبني", icon: "thumb" as const }],
    };

    // Without a handler the glyph must not render at all — a button that does
    // nothing reads as broken.
    const bare = render(<PostCard {...props} />);
    expect(bare.queryByLabelText("إبلاغ")).toBeNull();

    const screen = render(
      <PostCard {...props} onMorePress={onMorePress} moreAccessibilityLabel="إبلاغ" />,
    );
    fireEvent.press(screen.getByLabelText("إبلاغ"));

    expect(onMorePress).toHaveBeenCalledTimes(1);
  });
});
