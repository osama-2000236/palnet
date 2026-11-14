import { DEFAULT_NOTIFICATION_PREFERENCES } from "@baydar/shared";
import { ToastProvider } from "@baydar/ui-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";

import NotificationsSettingsScreen from "../../app/(app)/settings/notifications";

// Hoisted mock pattern matches feed-empty.test.tsx.
const mockApiFetch = jest.fn(async () => DEFAULT_NOTIFICATION_PREFERENCES);
const mockApiCall = jest.fn(async () => undefined);

jest.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

jest.mock("@/lib/api-errors", () => ({
  apiErrorMessage: (): string => "load failed",
}));

const mockT = (key: string): string => key;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockT }),
}));

function renderWithToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("NotificationsSettingsScreen", () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiCall.mockReset();
    mockApiFetch.mockImplementation(async () => DEFAULT_NOTIFICATION_PREFERENCES);
    mockApiCall.mockImplementation(async () => undefined);
  });

  it("renders the preference form after a successful load", async () => {
    const screen = renderWithToast(<NotificationsSettingsScreen />);

    await waitFor(() => {
      expect(screen.getByText("common.save")).toBeTruthy();
      expect(screen.queryByText("common.retry")).toBeNull();
    });
  });

  it("does not seed default prefs into editable state on load failure", async () => {
    // Keep rejecting for every call (including React Strict Mode remounts).
    mockApiFetch.mockImplementation(() => Promise.reject(new Error("network down")));

    const screen = await renderWithToast(<NotificationsSettingsScreen />);

    expect(await screen.findByText("common.retry")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("load failed")).toBeTruthy();
      expect(screen.queryByText("common.save")).toBeNull();
      expect(screen.queryByText("common.revert")).toBeNull();
    });
  });

  it("keeps the newer result when an older request resolves late", async () => {
    let rejectOlder!: (reason: Error) => void;
    mockApiFetch
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectOlder = reject;
          }),
      )
      .mockResolvedValueOnce(DEFAULT_NOTIFICATION_PREFERENCES);

    const screen = renderWithToast(<NotificationsSettingsScreen />);
    screen.rerender(
      <ToastProvider>
        <NotificationsSettingsScreen key="new-request" />
      </ToastProvider>,
    );

    await waitFor(() => expect(screen.getByText("common.save")).toBeTruthy());
    await act(async () => {
      rejectOlder(new Error("late failure"));
    });
    expect(screen.queryByText("common.retry")).toBeNull();
    expect(screen.getByText("common.save")).toBeTruthy();
  });

  it("shows an error when saving preferences fails", async () => {
    mockApiCall.mockRejectedValue(new Error("network down"));

    const screen = renderWithToast(<NotificationsSettingsScreen />);
    await waitFor(() => expect(screen.getByText("common.save")).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getAllByRole("switch")[0]);
    });
    await act(async () => {
      fireEvent.press(screen.getByText("common.save"));
    });

    expect(await screen.findByText("load failed")).toBeTruthy();
  });
});
