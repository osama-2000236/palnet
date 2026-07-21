import { OnboardingProgress } from "@baydar/ui-web";

const steps = ["الأساسيات", "الخبرة", "المهارات", "التفضيلات"];

export const Styles = () => (
  <div style={{ display: "grid", gap: 24, maxWidth: 420 }}>
    <OnboardingProgress current={2} total={4} style="bar" />
    <OnboardingProgress current={2} total={4} style="dots" />
    <OnboardingProgress current={2} total={4} style="segmented" />
  </div>
);

export const WithLabels = () => (
  <div style={{ maxWidth: 460 }}>
    <OnboardingProgress current={3} total={4} style="segmented" labels={steps} />
  </div>
);

export const Progression = () => (
  <div style={{ display: "grid", gap: 20, maxWidth: 420 }}>
    <OnboardingProgress current={1} total={4} style="bar" />
    <OnboardingProgress current={3} total={4} style="bar" />
    <OnboardingProgress current={4} total={4} style="bar" />
  </div>
);

export const EnglishLocale = () => (
  <div style={{ maxWidth: 420 }} dir="ltr">
    <OnboardingProgress current={2} total={4} style="bar" locale="en" />
  </div>
);
