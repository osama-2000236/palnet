import { fireEvent, render, waitFor } from "@testing-library/react-native";

import RegisterScreen from "../../app/(auth)/register";
import { useNetworkStore } from "../store/network";

const mockReplace = jest.fn();
const mockRegisterAction = jest.fn();

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
  registerAction: (...args: unknown[]) => mockRegisterAction(...args),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "ar-PS" },
    t: (key: string, options?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        "common.appName": "بيدر",
        "auth.registerKicker": "انضم إلى بيدر",
        "auth.createProfile": "أنشئ ملفك المهني",
        "auth.registerSubtitle": "ابدأ بحساب واضح وموثوق.",
        "auth.firstName": "الاسم الأول",
        "auth.lastName": "الاسم الأخير",
        "auth.email": "البريد الإلكتروني",
        "auth.password": "كلمة المرور",
        "auth.passwordHint": "استخدم 8 أحرف على الأقل.",
        "auth.acceptTerms": "أوافق على الشروط وسياسة الخصوصية",
        "auth.submitRegister": "أنشئ حسابي",
        "auth.haveAccount": "لديك حساب بالفعل؟",
        "auth.login": "تسجيل الدخول",
        "auth.validation.required": "هذا الحقل مطلوب.",
        "auth.validation.email": "اكتب بريدًا إلكترونيًا صحيحًا.",
        "auth.validation.terms": "يجب الموافقة على الشروط.",
        "auth.errors.CONFLICT": "يوجد حساب بهذا البريد بالفعل.",
        "auth.errors.NETWORK_ERROR": "تعذّر الوصول إلى بيدر.",
        "auth.errors.OFFLINE": "تحتاج اتصالًا بالإنترنت لإكمال هذه الخطوة.",
        "auth.errors.INTERNAL": "حدث خطأ غير متوقع.",
      };
      return translations[key] ?? options?.defaultValue ?? key;
    },
  }),
}));

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNetworkStore.getState().setConnected(true);
    mockRegisterAction.mockResolvedValue({
      user: { id: "user-1", email: "qa@baydar.test", role: "USER", locale: "ar-PS" },
      tokens: {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        accessExpiresAt: new Date().toISOString(),
        refreshExpiresAt: new Date().toISOString(),
      },
    });
  });

  it("renders exactly one first-name field and one last-name field", () => {
    const screen = render(<RegisterScreen />);

    expect(screen.getAllByTestId("register-first-name-input")).toHaveLength(1);
    expect(screen.getAllByTestId("register-last-name-input")).toHaveLength(1);
  });

  it("registers and routes to mandatory onboarding", async () => {
    const screen = render(<RegisterScreen />);

    fireEvent.changeText(screen.getByTestId("register-first-name-input"), "Osama");
    fireEvent.changeText(screen.getByTestId("register-last-name-input"), "Abujarad");
    fireEvent.changeText(screen.getByTestId("register-email-input"), "QA@Baydar.Test");
    fireEvent.changeText(screen.getByTestId("register-password-input"), "Password123");
    fireEvent.press(screen.getByTestId("register-accept-terms"));
    fireEvent.press(screen.getByTestId("register-submit"));

    await waitFor(() => {
      expect(mockRegisterAction).toHaveBeenCalledWith({
        firstName: "Osama",
        lastName: "Abujarad",
        email: "qa@baydar.test",
        password: "Password123",
        locale: "ar-PS",
        acceptTerms: true,
      });
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/(app)/onboarding",
        params: { firstName: "Osama", lastName: "Abujarad" },
      });
    });
  });

  it("shows specific API errors instead of the generic unexpected error", async () => {
    const { ApiRequestError } = jest.requireMock("@/lib/auth-actions") as {
      ApiRequestError: new (status: number, code: string) => Error;
    };
    mockRegisterAction.mockRejectedValue(new ApiRequestError(0, "NETWORK_ERROR"));
    const screen = render(<RegisterScreen />);

    fireEvent.changeText(screen.getByTestId("register-first-name-input"), "Osama");
    fireEvent.changeText(screen.getByTestId("register-last-name-input"), "Abujarad");
    fireEvent.changeText(screen.getByTestId("register-email-input"), "qa@baydar.test");
    fireEvent.changeText(screen.getByTestId("register-password-input"), "Password123");
    fireEvent.press(screen.getByTestId("register-accept-terms"));
    fireEvent.press(screen.getByTestId("register-submit"));

    await waitFor(() => {
      expect(screen.getByText("تعذّر الوصول إلى بيدر.")).toBeTruthy();
    });
  });

  it("blocks submit while offline", async () => {
    useNetworkStore.getState().setConnected(false);
    const screen = render(<RegisterScreen />);

    fireEvent.press(screen.getByTestId("register-submit"));

    expect(screen.getAllByText("تحتاج اتصالًا بالإنترنت لإكمال هذه الخطوة.").length).toBeGreaterThan(
      0,
    );
    expect(mockRegisterAction).not.toHaveBeenCalled();
  });
});
