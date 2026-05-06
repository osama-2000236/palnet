import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ForgotPasswordScreen from "../../app/(auth)/forgot-password";
import { useNetworkStore } from "../store/network";

const mockReplace = jest.fn();
const mockForgotPasswordAction = jest.fn();

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
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
  forgotPasswordAction: (...args: unknown[]) => mockForgotPasswordAction(...args),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "common.appName": "بيدر",
        "auth.forgot.kicker": "استعادة كلمة المرور",
        "auth.forgot.title": "استعادة كلمة المرور",
        "auth.forgot.body": "أدخل بريدك وسنرسل رابط الاستعادة إن كان الحساب موجودًا.",
        "auth.forgot.submit": "إرسال رابط الاستعادة",
        "auth.forgot.sent": "إن كان هناك حساب بهذا البريد، فقد أُرسل رابط الاستعادة.",
        "auth.forgot.backToLogin": "العودة إلى تسجيل الدخول",
        "auth.email": "البريد الإلكتروني",
        "auth.validation.required": "هذا الحقل مطلوب.",
        "auth.validation.email": "اكتب بريدًا إلكترونيًا صحيحًا.",
        "auth.errors.OFFLINE": "تحتاج اتصالًا بالإنترنت لإكمال هذه الخطوة.",
        "auth.errors.INTERNAL": "حدث خطأ غير متوقع.",
      };
      return translations[key] ?? key;
    },
  }),
}));

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNetworkStore.getState().setConnected(true);
    mockForgotPasswordAction.mockResolvedValue(undefined);
  });

  it("submits email and shows enumeration-safe confirmation", async () => {
    const screen = render(<ForgotPasswordScreen />);

    fireEvent.changeText(screen.getByTestId("forgot-email-input"), "Demo@Baydar.ps");
    fireEvent.press(screen.getByTestId("forgot-password-submit"));

    await waitFor(() => {
      expect(mockForgotPasswordAction).toHaveBeenCalledWith("demo@baydar.ps");
      expect(
        screen.getByText("إن كان هناك حساب بهذا البريد، فقد أُرسل رابط الاستعادة."),
      ).toBeTruthy();
    });
  });
});
