import { ToastProvider } from "@baydar/ui-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";

import AccountSettingsScreen from "../../app/(app)/settings/account";

const mockApiFetch = jest.fn();
const mockSendVerifyEmail = jest.fn();

jest.mock("@/lib/api", () => ({
  apiCall: jest.fn().mockResolvedValue(undefined),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("@/lib/auth-actions", () => ({
  sendVerifyEmailAction: (...args: unknown[]) => mockSendVerifyEmail(...args),
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
    mockApiFetch.mockResolvedValue({
      id: "user-1",
      email: "lina@baydar.ps",
      role: "USER",
      locale: "ar-PS",
      emailVerified: null,
    });
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

  it("offers to send a verification link when email is unverified", async () => {
    const screen = renderWithToast(<AccountSettingsScreen />);

    const sendButton = await screen.findByTestId("account-send-verification");
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockSendVerifyEmail).toHaveBeenCalledWith("lina@baydar.ps");
    });
  });

  it("shows the verified badge without a send button when email is verified", async () => {
    mockApiFetch.mockResolvedValue({
      id: "user-1",
      email: "lina@baydar.ps",
      role: "USER",
      locale: "ar-PS",
      emailVerified: "2026-07-01T10:00:00.000Z",
    });
    const screen = renderWithToast(<AccountSettingsScreen />);

    await screen.findByText("account.email.verified");
    expect(screen.queryByTestId("account-send-verification")).toBeNull();
  });
});
