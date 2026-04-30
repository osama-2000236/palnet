import { fireEvent, render, waitFor } from "@testing-library/react-native";

import LoginScreen from "../../app/(auth)/login";
import { useNetworkStore } from "../store/network";

const mockReplace = jest.fn();
const mockLoginAction = jest.fn();
const mockResolvePostAuthRoute = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock("@/lib/auth-actions", () => ({
  ApiRequestError: class ApiRequestError extends Error {
    public readonly status: number;
    public readonly code: string;

    constructor(status: number, code: string) {
      super(code);
      this.status = status;
      this.code = code;
    }
  },
  loginAction: (...args: unknown[]) => mockLoginAction(...args),
}));

jest.mock("@/lib/profile-state", () => ({
  resolvePostAuthRoute: (...args: unknown[]) => mockResolvePostAuthRoute(...args),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "ar-PS" },
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.appName": "بيدر",
        "auth.loginKicker": "دخول آمن",
        "auth.welcomeBack": "أهلًا بعودتك",
        "auth.loginSubtitle": "تابع محادثاتك وفرصك المهنية من حيث توقفت.",
        "auth.email": "البريد الإلكتروني",
        "auth.password": "كلمة المرور",
        "auth.submitLogin": "ادخل",
        "auth.secureHintTitle": "بياناتك تبقى محمية",
        "auth.secureHint": "جلسة آمنة",
        "auth.noAccount": "ليس لديك حساب بعد؟",
        "auth.register": "إنشاء حساب",
        "auth.validation.required": "هذا الحقل مطلوب.",
        "auth.validation.email": "اكتب بريدًا إلكترونيًا صحيحًا.",
        "auth.errors.OFFLINE": "تحتاج اتصالًا بالإنترنت لإكمال هذه الخطوة.",
        "auth.errors.INTERNAL": "حدث خطأ غير متوقع.",
      };
      return translations[key] ?? key;
    },
  }),
}));

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNetworkStore.getState().setConnected(true);
    mockResolvePostAuthRoute.mockResolvedValue("/(app)/onboarding");
    mockLoginAction.mockResolvedValue({
      user: { id: "user-1", email: "demo@baydar.ps", role: "USER", locale: "ar-PS" },
      tokens: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        accessExpiresAt: new Date().toISOString(),
        refreshExpiresAt: new Date().toISOString(),
      },
    });
  });

  it("shows field validation before calling auth", async () => {
    const screen = render(<LoginScreen />);

    fireEvent.press(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(screen.getAllByText("هذا الحقل مطلوب.").length).toBeGreaterThanOrEqual(2);
    });
    expect(mockLoginAction).not.toHaveBeenCalled();
  });

  it("routes to mandatory onboarding when the profile is incomplete", async () => {
    const screen = render(<LoginScreen />);

    fireEvent.changeText(screen.getByTestId("login-email-input"), "Demo@Baydar.ps");
    fireEvent.changeText(screen.getByTestId("login-password-input"), "Password1");
    fireEvent.press(screen.getByTestId("login-submit"));

    await waitFor(() => {
      expect(mockLoginAction).toHaveBeenCalledWith({
        email: "demo@baydar.ps",
        password: "Password1",
      });
      expect(mockReplace).toHaveBeenCalledWith("/(app)/onboarding");
    });
  });
});
