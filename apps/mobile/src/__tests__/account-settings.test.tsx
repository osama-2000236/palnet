import { ToastProvider } from "@baydar/ui-native";
import { fireEvent, render } from "@testing-library/react-native";
import type { ReactElement } from "react";

import AccountSettingsScreen from "../../app/(app)/settings/account";

jest.mock("@/lib/api", () => ({
  apiCall: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/session", () => ({
  clearSession: jest.fn().mockResolvedValue(undefined),
}));

function renderWithToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("AccountSettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders export and delete actions", () => {
    const screen = renderWithToast(<AccountSettingsScreen />);

    expect(screen.getByText("account.export.button")).toBeTruthy();
    expect(screen.getByText("account.delete.button")).toBeTruthy();
  });

  it("shows the confirmation phrase input before deletion", () => {
    const screen = renderWithToast(<AccountSettingsScreen />);

    fireEvent.press(screen.getByText("account.delete.button"));
    expect(screen.getByLabelText("account.delete.confirmInput")).toBeTruthy();
    expect(screen.getByText("account.delete.confirmButton")).toBeTruthy();
  });
});
