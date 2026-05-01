import { fireEvent, render } from "@testing-library/react-native";

import { PostCard } from "../PostCard";

describe("PostCard", () => {
  it("renders the four action anatomy required by the design docs", () => {
    const onLike = jest.fn();
    const screen = render(
      <PostCard
        author={{ id: "u1", firstName: "ليان", lastName: "خليل", handle: "layan" }}
        authorName="ليان خليل"
        authorHeadline="Full Stack Engineer"
        timestamp="الآن"
        body="تحديث مهني قصير"
        reactionCount={3}
        commentCount={2}
        repostCount={1}
        actions={[
          { key: "like", label: "أعجبني", icon: "thumb", onPress: onLike },
          { key: "comment", label: "تعليقات", icon: "comment" },
          { key: "repost", label: "إعادة نشر", icon: "repost" },
          { key: "send", label: "إرسال", icon: "send" },
        ]}
      />,
    );

    fireEvent.press(screen.getByText("أعجبني"));

    expect(onLike).toHaveBeenCalledTimes(1);
    expect(screen.getByText("تعليقات")).toBeTruthy();
    expect(screen.getByText("إعادة نشر")).toBeTruthy();
    expect(screen.getByText("إرسال")).toBeTruthy();
  });
});
