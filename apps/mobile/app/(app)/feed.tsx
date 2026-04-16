import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView, Text, View } from "react-native";

import { readSession } from "@/lib/session";

export default function FeedScreen(): JSX.Element {
  const { t } = useTranslation();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const session = await readSession();
      if (!session) {
        router.replace("/(auth)/login");
        return;
      }
      setName(session.user.email.split("@")[0] ?? session.user.email);
    })();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <View className="flex-1 gap-4 px-6 pt-12">
        <Text className="text-3xl font-bold text-ink">{t("feed.title")}</Text>
        {name ? (
          <Text className="text-ink-muted">{t("feed.welcome", { name })}</Text>
        ) : null}
        <View className="rounded-md border border-ink-muted/20 p-6">
          <Text className="text-ink-muted">{t("feed.empty")}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
