import * as Haptics from "expo-haptics";

type Feedback = "tap" | "success" | "warning" | "error";

const IMPACT_STYLE: Record<Feedback, Haptics.ImpactFeedbackStyle | null> = {
  tap: Haptics.ImpactFeedbackStyle.Light,
  success: null,
  warning: null,
  error: null,
};

const NOTIFICATION_STYLE: Record<Feedback, Haptics.NotificationFeedbackType | null> = {
  tap: null,
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

export async function haptic(feedback: Feedback): Promise<void> {
  try {
    const impact = IMPACT_STYLE[feedback];
    if (impact) {
      await Haptics.impactAsync(impact);
      return;
    }
    const notification = NOTIFICATION_STYLE[feedback];
    if (notification) await Haptics.notificationAsync(notification);
  } catch {
    // Haptics are best-effort: simulators, web, and low-power modes can no-op.
  }
}

export function tapHaptic(): void {
  void haptic("tap");
}

export function successHaptic(): void {
  void haptic("success");
}

export function warningHaptic(): void {
  void haptic("warning");
}

export function errorHaptic(): void {
  void haptic("error");
}
