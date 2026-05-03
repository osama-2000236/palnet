import { render, waitFor } from "@testing-library/react-native";

import MessagesListScreen from "../../app/(app)/messages/index";

const mockReplace = jest.fn();
const mockApiFetchPage = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args) },
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require("react");
    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock("@/components/rows/RoomRow", () => ({
  RoomRow: () => null,
}));

jest.mock("@/lib/api", () => ({
  ApiRequestError: class ApiRequestError extends Error {
    public readonly status: number;
    public readonly code: string;

    constructor(status: number, code: string) {
      super(code);
      this.status = status;
      this.code = code;
    }
  },
  apiCall: jest.fn(),
  apiFetchPage: (...args: unknown[]) => mockApiFetchPage(...args),
}));

jest.mock("@/lib/session", () => ({
  getAccessToken: jest.fn(async () => "access-token"),
  readSession: jest.fn(async () => ({
    user: { id: "user-1", email: "qa@baydar.test", role: "USER", locale: "ar-PS" },
    tokens: { accessToken: "access-token", refreshToken: "refresh-token" },
  })),
}));

jest.mock("@/lib/haptics", () => ({
  successHaptic: jest.fn(),
  tapHaptic: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "ar-PS" },
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        "common.retry": "إعادة المحاولة",
        "messaging.title": "الرسائل",
        "messaging.newMessage": "رسالة جديدة",
        "messaging.newGroup.title": "مجموعة جديدة",
        "messaging.archive": "أرشفة",
        "messaging.emptyList": "لا توجد محادثات بعد.",
        "api.errors.RATE_LIMITED": "الطلبات كثيرة الآن. انتظر قليلًا ثم حاول مرة أخرى.",
      };
      return translations[key] ?? options?.defaultValue ?? key;
    },
  }),
}));

describe("MessagesListScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("dedupes initial room loads and renders rate-limit errors without crashing", async () => {
    const { ApiRequestError } = jest.requireMock("@/lib/api") as {
      ApiRequestError: new (status: number, code: string) => Error;
    };
    mockApiFetchPage.mockRejectedValue(new ApiRequestError(429, "RATE_LIMITED"));

    const screen = render(<MessagesListScreen />);

    await waitFor(() => {
      expect(screen.getByText("الطلبات كثيرة الآن. انتظر قليلًا ثم حاول مرة أخرى.")).toBeTruthy();
    });

    expect(mockApiFetchPage).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
