import { render, waitFor } from "@testing-library/react-native";

import FeedScreen from "../../app/(app)/feed";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useFocusEffect: (callback: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
        "feed.profileCompletion": `اكتمال الملف ${String(values?.completed ?? "")} من ${String(
          values?.total ?? "",
        )}`,
        "feed.editProfile": "تعديل الملف",
        "feed.jobsEntryTitle": "فرص مهنية تناسب مسارك",
        "feed.jobsEntrySubtitle": "استعرض وظائف محلية.",
        "feed.jobsEntryAction": "عرض الوظائف",
        "common.retry": "إعادة المحاولة",
        "composer.placeholder": "شارك فكرة",
        "search.placeholder": "ابحث عن أشخاص…",
        "notifications.title": "الإشعارات",
        "nav.unreadNotifications": "إشعارات غير مقروءة",
      };
      return translations[key] ?? key;
    },
  }),
}));

jest.mock("@/components/rows/PostRow", () => ({
  PostRow: () => null,
}));

const mockApiFetch = jest.fn(async (path: string) => {
  if (path === "/profiles/me") {
    return {
      id: "profile-1",
      userId: "user-1",
      handle: "demo",
      firstName: "ليان",
      lastName: "خليل",
      headline: "مصممة منتجات",
      location: "رام الله",
      avatarUrl: null,
      experiences: [],
      educations: [],
      skills: [],
    };
  }
  return { count: 0 };
});
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
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    const original = console.error;
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      if (String(args[0]).includes("not wrapped in act")) return;
      original(...args);
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders the localized empty state after loading an empty feed", async () => {
    const screen = render(<FeedScreen />);

    await waitFor(() => {
      expect(screen.getByText("ابدأ بنشر أول منشور لك.")).toBeTruthy();
      expect(screen.getByText("ليان خليل")).toBeTruthy();
      expect(screen.getByTestId("feed-search-button")).toBeTruthy();
      expect(screen.getByTestId("feed-notifications-button")).toBeTruthy();
      expect(screen.getByTestId("jobs-entry-card")).toBeTruthy();
    });
  });
});
