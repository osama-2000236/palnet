import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { AppShell, type AppShellLabels } from "../AppShell";

const labels: AppShellLabels = {
  logoAlt: "بيدر",
  searchPlaceholder: "ابحث في بيدر…",
  searchLabel: "بحث",
  nav: {
    feed: "الرئيسية",
    network: "شبكتي",
    jobs: "الوظائف",
    messages: "الرسائل",
    notifications: "الإشعارات",
    saved: "المحفوظات",
    employer: "أصحاب العمل",
  },
  mainNavLabel: "التنقل الرئيسي",
  myProfile: "ملفي",
  viewProfile: "عرض الملف",
  settings: "الإعدادات",
  signOut: "تسجيل الخروج",
  unreadTemplate: {
    messages: "{count} رسائل غير مقروءة",
    notifications: "{count} إشعارات غير مقروءة",
    saved: "{count} عناصر محفوظة",
    employer: "{count} تحديثات",
  },
  bellDisconnected: "انقطع الاتصال بالإشعارات",
};

function renderShell(overrides: Partial<Parameters<typeof AppShell>[0]> = {}) {
  return render(
    <AppShell currentRoute="feed" me={null} labels={labels} onNavigate={jest.fn()} {...overrides}>
      <Text>المحتوى</Text>
    </AppShell>,
  );
}

describe("AppShell (native)", () => {
  it("renders the search pill with the placeholder copy and fires onSearchPress", () => {
    const onSearchPress = jest.fn();
    const screen = renderShell({ onSearchPress });

    expect(screen.getByText("ابحث في بيدر…")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("بحث"));
    expect(onSearchPress).toHaveBeenCalledTimes(1);
  });

  it("fires onViewProfile from the profile trigger", () => {
    const onViewProfile = jest.fn();
    const screen = renderShell({ onViewProfile });

    fireEvent.press(screen.getByLabelText("ملفي"));
    expect(onViewProfile).toHaveBeenCalledTimes(1);
  });

  it("fires onNavigate with the pressed route", () => {
    const onNavigate = jest.fn();
    const screen = renderShell({ onNavigate });

    fireEvent.press(screen.getByLabelText("الوظائف"));
    expect(onNavigate).toHaveBeenCalledWith("jobs");
  });
});
