import { fireEvent, render } from "@testing-library/react-native";

import AccountSettingsScreen from "../../app/(app)/settings/account";

jest.mock("@/lib/api", () => ({
  apiCall: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/session", () => ({
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

describe("AccountSettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders export and delete actions", () => {
    const screen = render(<AccountSettingsScreen />);

    expect(screen.getByText("account.export.button")).toBeTruthy();
    expect(screen.getByText("account.delete.button")).toBeTruthy();
  });

  it("shows the confirmation phrase input before deletion", () => {
    const screen = render(<AccountSettingsScreen />);

    fireEvent.press(screen.getByText("account.delete.button"));
    expect(screen.getByLabelText("account.delete.confirmInput")).toBeTruthy();
    expect(screen.getByText("account.delete.confirmButton")).toBeTruthy();
  });
});
