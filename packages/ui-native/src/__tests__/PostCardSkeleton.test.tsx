import { render } from "@testing-library/react-native";
import { Animated, StyleSheet, type ViewStyle } from "react-native";

import { PostCard } from "../PostCard";
import { PostCardSkeleton } from "../PostCardSkeleton";
import { nativeTokens } from "../tokens";

type TestNode = {
  type: string;
  props: Record<string, unknown>;
  children?: Array<TestNode | string> | null;
};

function mockAnimatedLoop(): void {
  jest.spyOn(Animated, "loop").mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
    reset: jest.fn(),
  } as unknown as ReturnType<typeof Animated.loop>);
}

function asNode(json: unknown): TestNode {
  expect(json).toBeTruthy();
  expect(Array.isArray(json)).toBe(false);
  return json as TestNode;
}

function collectNodes(node: TestNode | string | null | undefined): TestNode[] {
  if (!node || typeof node === "string") {
    return [];
  }

  return [node, ...(node.children ?? []).flatMap((child) => collectNodes(child))];
}

function styleOf(node: TestNode): ViewStyle {
  return StyleSheet.flatten(node.props.style) as ViewStyle;
}

function renderPostCardRoot(): TestNode {
  return asNode(
    render(
      <PostCard
        author={{ id: "u1", firstName: "ليان", lastName: "خليل", handle: "layan" }}
        authorName="ليان خليل"
        authorHeadline="مهندسة برمجيات"
        timestamp="الآن"
        body="تحديث مهني قصير"
        actions={[
          { key: "like", label: "أعجبني", icon: "thumb" },
          { key: "comment", label: "تعليقات", icon: "comment" },
          { key: "repost", label: "إعادة نشر", icon: "repost" },
          { key: "send", label: "إرسال", icon: "send" },
        ]}
      />,
    ).toJSON(),
  );
}

describe("PostCardSkeleton", () => {
  beforeEach(() => {
    mockAnimatedLoop();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders without crashing as an accessibility-hidden placeholder", () => {
    const root = asNode(render(<PostCardSkeleton />).toJSON());

    expect(root).toBeTruthy();
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it("composes multiple Skeleton primitives", () => {
    const root = asNode(render(<PostCardSkeleton />).toJSON());
    const skeletonNodes = collectNodes(root).filter(
      (node) => styleOf(node).backgroundColor === nativeTokens.color.surfaceSubtle,
    );

    expect(skeletonNodes.length).toBeGreaterThan(1);
  });

  it("uses the same outer Surface and role shape as PostCard", () => {
    const skeletonRoot = asNode(render(<PostCardSkeleton />).toJSON());
    const postRoot = renderPostCardRoot();
    const skeletonStyle = styleOf(skeletonRoot);
    const postStyle = styleOf(postRoot);

    expect(skeletonRoot.type).toBe(postRoot.type);
    expect(skeletonRoot.props.accessibilityRole).toBe(postRoot.props.accessibilityRole);
    expect(skeletonStyle.borderRadius).toBe(postStyle.borderRadius);
    expect(skeletonStyle.borderWidth).toBe(postStyle.borderWidth);
    expect(skeletonStyle.backgroundColor).toBe(postStyle.backgroundColor);
    expect(skeletonStyle.overflow).toBe(postStyle.overflow);
  });
});
