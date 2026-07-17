import * as Haptics from "expo-haptics";

// Haptics are best-effort: simulators, web, and low-power modes can no-op.
export function tapHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function successHaptic(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
