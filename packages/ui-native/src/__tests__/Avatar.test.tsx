import { render } from "@testing-library/react-native";

import { Avatar } from "../Avatar";

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
});
