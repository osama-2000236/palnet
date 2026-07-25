import { fireEvent, render } from "@testing-library/react-native";

import { EducationsCard } from "@/screens/edit-profile/EducationsCard";

jest.mock("@/lib/api", () => ({ apiFetch: jest.fn() }));
jest.mock("@/lib/session", () => ({ getAccessToken: jest.fn().mockResolvedValue("tok") }));

const profile = { educations: [] } as never;

describe("EducationsCard school suggestions", () => {
  it("matches folded Arabic input and fills the canonical university name", () => {
    const screen = render(
      <EducationsCard profile={profile} onChanged={jest.fn()} onError={jest.fn()} />,
    );

    fireEvent.press(screen.getByText("profile.add"));
    const input = screen.getByPlaceholderText("profile.school");

    // Bare-alef + heh input must match the hamza + teh-marbuta canonical name.
    fireEvent.changeText(input, "الاسلاميه");
    const chip = screen.getByText("الجامعة الإسلامية بغزة");

    fireEvent.press(chip);
    expect(screen.getByPlaceholderText("profile.school").props.value).toBe(
      "الجامعة الإسلامية بغزة",
    );
  });

  it("hides suggestions once the input is an exact canonical match", () => {
    const screen = render(
      <EducationsCard profile={profile} onChanged={jest.fn()} onError={jest.fn()} />,
    );

    fireEvent.press(screen.getByText("profile.add"));
    fireEvent.changeText(screen.getByPlaceholderText("profile.school"), "جامعة بيرزيت");

    expect(screen.queryByText("جامعة بيرزيت", { exact: true })).toBeNull();
  });
});
