import { render, waitFor } from "@testing-library/react-native";

import FeedScreen from "../../app/(app)/feed";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "ar-PS" },
    t: (key: string, values?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "feed.title": "الخلاصة",
        "feed.empty": "ابدأ بنشر أول منشور لك.",
        "feed.welcome": `أهلًا ${String(values?.name ?? "")}`,
        "composer.placeholder": "شارك فكرة",
        "nav.unreadNotifications": "إشعارات غير مقروءة",
      };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock("@/components/rows/PostRow", () => ({
  PostRow: () => null,
}));

const mockApiFetch = jest.fn(async () => ({ count: 0 }));
const mockApiFetchPage = jest.fn(async () => ({
  data: [],
  meta: { nextCursor: null, hasMore: false },
}));

jest.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiFetchPage: (...args: unknown[]) => mockApiFetchPage(...args),
}));

jest.mock("@/lib/session", () => ({
  getAccessToken: jest.fn(async () => "access-token"),
  readSession: jest.fn(async () => ({
    user: { id: "u1", email: "demo@baydar.ps" },
    tokens: { accessToken: "access-token", refreshToken: "refresh-token" },
  })),
}));

describe("FeedScreen empty state", () => {
  it("renders the localized empty state after loading an empty feed", async () => {
    const screen = render(<FeedScreen />);

    await waitFor(() => {
      expect(screen.getByText("ابدأ بنشر أول منشور لك.")).toBeTruthy();
    });
  });
});
