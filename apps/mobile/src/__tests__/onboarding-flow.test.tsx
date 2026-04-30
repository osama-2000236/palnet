import { fireEvent, render, waitFor } from "@testing-library/react-native";

import OnboardingScreen from "../../app/(app)/onboarding";
import { useNetworkStore } from "../store/network";

const mockReplace = jest.fn();
const mockApiFetch = jest.fn();
const mockWriteProfileCache = jest.fn();

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  useLocalSearchParams: () => ({ firstName: "ليان", lastName: "خليل" }),
}));

jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
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
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

jest.mock("@/lib/haptics", () => ({
  successHaptic: jest.fn(),
  tapHaptic: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
  getAccessToken: jest.fn(async () => "access-token"),
  readSession: jest.fn(async () => ({
    user: { id: "user-1", email: "lina@baydar.ps", role: "USER", locale: "ar-PS" },
    tokens: { accessToken: "access-token", refreshToken: "refresh-token" },
  })),
  writeProfileCache: (...args: unknown[]) => mockWriteProfileCache(...args),
}));

jest.mock("@/lib/uploads", () => ({
  uploadAsset: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "ar-PS" },
    t: (key: string, values?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "common.continue": "متابعة",
        "common.retry": "إعادة المحاولة",
        "auth.firstName": "الاسم الأول",
        "auth.lastName": "الاسم الأخير",
        "onboarding.progress": `الخطوة ${String(values?.current ?? "")} من ${String(
          values?.total ?? "",
        )}`,
        "onboarding.steps.identity": "تحقق من هويتك المهنية",
        "onboarding.steps.profile": "عرّف الناس بك",
        "onboarding.steps.location": "أضف موقعك",
        "onboarding.steps.background": "أضف عملًا أو تعليمًا",
        "onboarding.steps.photo": "أضف صورة شخصية",
        "onboarding.steps.network": "ابدأ شبكة أولية",
        "onboarding.stepCopy.identity": "استخدم اسمك الحقيقي.",
        "onboarding.stepCopy.profile": "اكتب معرّفًا ومسمى.",
        "onboarding.stepCopy.location": "أضف موقعك.",
        "onboarding.stepCopy.background": "أضف عملًا أو تعليمًا.",
        "onboarding.stepCopy.photo": "أضف صورة.",
        "onboarding.stepCopy.network": "اختر أشخاصًا.",
        "onboarding.identity.confirm": "أؤكد أن هذه المعلومات تمثلني مهنيًا.",
        "onboarding.handle": "المعرّف الخاص بك",
        "onboarding.handleHint": "سيظهر كرابط",
        "onboarding.headline": "المسمى الوظيفي",
        "onboarding.headlineHint": "مثال",
        "onboarding.about": "نبذة قصيرة",
        "onboarding.aboutHint": "اختياري",
        "onboarding.location": "الموقع",
        "onboarding.locationHint": "مثال",
        "onboarding.country": "رمز البلد",
        "onboarding.countryHint": "حرفان",
        "onboarding.background.work": "عمل",
        "onboarding.background.education": "تعليم",
        "onboarding.background.startYear": "سنة البداية",
        "onboarding.photo.choose": "اختيار صورة",
        "onboarding.photo.change": "تغيير الصورة",
        "onboarding.photo.remove": "إزالة الصورة",
        "onboarding.photo.hint": "صورة واضحة",
        "onboarding.network.message": "رسالة قصيرة",
        "onboarding.network.messageHint": "اختياري",
        "onboarding.network.loading": "جارٍ تحميل اقتراحات التواصل…",
        "onboarding.network.empty": "لا توجد اقتراحات الآن.",
        "onboarding.network.failed": "تعذّر تحميل اقتراحات التواصل.",
        "onboarding.network.offline": "اقتراحات التواصل تحتاج اتصالًا.",
        "onboarding.network.select": "اختيار",
        "onboarding.network.selected": "مختار",
        "onboarding.back": "رجوع",
        "onboarding.submit": "ادخل إلى الخلاصة",
        "profile.expTitle": "المسمى الوظيفي",
        "profile.company": "الشركة",
        "profile.description": "الوصف",
      };
      return translations[key] ?? key;
    },
  }),
}));

const baseProfile = {
  id: "profile-1",
  userId: "user-1",
  handle: "lina-khalil",
  firstName: "ليان",
  lastName: "خليل",
  headline: "مديرة منتج",
  about: null,
  location: "رام الله",
  country: "PS",
  avatarUrl: null,
  coverUrl: null,
  website: null,
  pronouns: null,
  openToWork: false,
  hiring: false,
  experiences: [],
  educations: [],
  skills: [],
};

describe("OnboardingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNetworkStore.getState().setConnected(true);
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === "/connections/suggestions?limit=8") return [];
      if (path === "/profiles/me/experiences") {
        return {
          ...baseProfile,
          experiences: [
            {
              id: "exp-1",
              title: "مديرة منتج",
              companyName: "بيدر",
              location: "رام الله",
              locationMode: "ONSITE",
              startDate: new Date().toISOString(),
              endDate: null,
              description: null,
            },
          ],
        };
      }
      return baseProfile;
    });
  });

  it("saves profile setup, work history, and enters the feed", async () => {
    const screen = render(<OnboardingScreen />);

    fireEvent.press(screen.getByTestId("onboarding-identity-confirm"));
    fireEvent.press(screen.getByTestId("onboarding-next"));

    await waitFor(() => expect(screen.getByTestId("onboarding-handle")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("onboarding-handle"), "lina-khalil");
    fireEvent.changeText(screen.getByTestId("onboarding-headline"), "مديرة منتج");
    fireEvent.press(screen.getByTestId("onboarding-next"));

    await waitFor(() => expect(screen.getByTestId("onboarding-location")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("onboarding-location"), "رام الله");
    fireEvent.press(screen.getByTestId("onboarding-next"));

    await waitFor(() => expect(screen.getByTestId("onboarding-work-title")).toBeTruthy());
    fireEvent.changeText(screen.getByTestId("onboarding-work-title"), "مديرة منتج");
    fireEvent.changeText(screen.getByTestId("onboarding-company"), "بيدر");
    fireEvent.changeText(screen.getByTestId("onboarding-work-start-year"), "2024");
    fireEvent.press(screen.getByTestId("onboarding-next"));

    await waitFor(() => expect(screen.getByText("اختيار صورة")).toBeTruthy());
    fireEvent.press(screen.getByTestId("onboarding-next"));

    await waitFor(() => expect(screen.getByTestId("onboarding-submit")).toBeTruthy());
    fireEvent.press(screen.getByTestId("onboarding-submit"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/profiles/onboard",
        expect.anything(),
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            handle: "lina-khalil",
            headline: "مديرة منتج",
            location: "رام الله",
          }),
        }),
      );
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/profiles/me/experiences",
        expect.anything(),
        expect.objectContaining({ method: "POST" }),
      );
      expect(mockWriteProfileCache).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/(app)/feed");
    });
  });
});
