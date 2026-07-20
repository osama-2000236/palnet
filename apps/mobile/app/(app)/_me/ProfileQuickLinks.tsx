import { Button } from "@baydar/ui-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

const QUICK_LINKS = [
  { route: "/(app)/activity", label: "activity.title" },
  { route: "/(app)/saved", label: "saved.title" },
  { route: "/(app)/me/connections", label: "network.myConnections" },
  { route: "/(app)/me/karama", label: "karama.kicker" },
  { route: "/(app)/me/premium", label: "premium.entry" },
  // One settings entry — the settings landing screen owns account, blocked,
  // appearance, privacy, security, and notification prefs.
  { route: "/(app)/settings", label: "settings.title" },
] as const;

export function ProfileQuickLinks(): JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      {QUICK_LINKS.map((item) => (
        <Button
          key={item.route}
          variant="secondary"
          size="md"
          fullWidth
          onPress={() => router.push(item.route as never)}
          accessibilityLabel={t(item.label)}
        >
          {t(item.label)}
        </Button>
      ))}
    </>
  );
}
