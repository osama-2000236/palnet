import { render } from "@testing-library/react-native";

import { Avatar } from "../Avatar";

// `apps/mobile/jest-setup.ts` mocks expo-image to a Fragment that renders
// nothing and drops every prop, so the photo branch never reaches the tree. The
// duplicate-label bug guarded below lived ON that <Image>, which made the first
// version of this test pass against the broken code — a check that could not
// fail. Give the photo a real host node here instead.
jest.mock("expo-image", () => {
  const { View } = jest.requireActual("react-native");
  return { Image: View };
});

describe("Avatar", () => {
  it("renders initials and an accessible person label", () => {
    const screen = render(
      <Avatar
        user={{
          id: "u1",
          handle: "osama",
          firstName: "Osama",
          lastName: "Saleh",
          avatarUrl: null,
        }}
      />,
    );

    expect(screen.getByLabelText("Osama Saleh")).toBeTruthy();
    expect(screen.getByText("OS", { includeHiddenElements: true })).toBeTruthy();
  });

  it("skips the Arabic definite article when building initials", () => {
    const screen = render(
      <Avatar
        user={{
          id: "u2",
          handle: "layan",
          firstName: "ليان",
          lastName: "الخطيب",
          avatarUrl: null,
        }}
      />,
    );

    // "لخ", never "لا" ("no").
    expect(screen.getByText("لخ", { includeHiddenElements: true })).toBeTruthy();
  });

  it("passes blurhash placeholders to expo-image avatars", () => {
    const screen = render(
      <Avatar
        user={{
          id: "u1",
          handle: "osama",
          firstName: "Osama",
          lastName: "Saleh",
          avatarUrl: "https://media.baydar.ps/avatar.jpg",
          avatarBlurhash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH",
        }}
      />,
    );

    expect(screen.getByLabelText("Osama Saleh")).toBeTruthy();
  });

  // The three below are the a11y contract this twin shares with
  // ui-web/src/Avatar.tsx. Each records a real divergence, not a style choice.

  it("announces the person exactly once when there is a photo", () => {
    const screen = render(
      <Avatar
        user={{
          id: "u1",
          handle: "osama",
          firstName: "Osama",
          lastName: "Saleh",
          avatarUrl: "https://media.baydar.ps/avatar.jpg",
        }}
      />,
    );

    // The wrapper owns the label and the photo must not repeat it — web says
    // the same thing with `alt=""` and a comment. Two labelled nodes means
    // VoiceOver/TalkBack reads the name twice.
    expect(screen.getAllByLabelText("Osama Saleh")).toHaveLength(1);
  });

  it("exposes a named avatar as an image, and hides a nameless one", () => {
    // Both halves matter, and the first is what makes the second worth having.
    //
    // `accessibilityRole` alone does not make a View an accessibility element —
    // `accessible` defaults to false — so before the fix the wrapper carried a
    // role and a label that nothing could reach, and `queryByRole` returned
    // null for BOTH cases. Asserting only the nameless half therefore passed
    // against the broken code. Proving the named case is found is what turns
    // the nameless assertion into evidence.
    const named = render(
      <Avatar user={{ id: "u1", handle: "osama", firstName: "Osama", lastName: "Saleh" }} />,
    );
    expect(named.getByRole("image", { name: "Osama Saleh" })).toBeTruthy();

    // Nameless: hidden outright, like ui-web's `aria-hidden` branch. An "image"
    // with no label is noise — nothing a screen-reader user can act on.
    const nameless = render(<Avatar user={{ id: "u3", avatarUrl: null }} />);
    expect(nameless.queryByRole("image")).toBeNull();
    expect(nameless.getByText("?", { includeHiddenElements: true })).toBeTruthy();
  });

  it("hides the initials on Android as well as iOS", () => {
    const screen = render(
      <Avatar user={{ id: "u1", handle: "osama", firstName: "Osama", lastName: "Saleh" }} />,
    );

    // `accessibilityElementsHidden` is iOS-only, so shipping it alone left the
    // initials exposed on Android — read after the wrapper's own label, as
    // "Osama Saleh, O S". Both props, or the fix only works on one platform.
    const initials = screen.getByText("OS", { includeHiddenElements: true });
    expect(initials.props.accessibilityElementsHidden).toBe(true);
    expect(initials.props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
