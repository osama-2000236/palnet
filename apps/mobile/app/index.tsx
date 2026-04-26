import { router } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, SafeAreaView, Text, View } from "react-native";

import { readSession } from "@/lib/session";

export default function Landing(): JSX.Element {
  const { t } = useTranslation();

  useEffect(() => {
    // If already signed in, drop straight into the app.
    void (async () => {
      const session = await readSession();
      if (session) router.replace("/(app)/feed");
    })();
  }, []);

  return (
    <SafeAreaView className="bg-surface-muted flex-1">
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Text className="text-ink text-center text-3xl font-bold">{t("landing.title")}</Text>
        <Text className="text-ink-muted text-center">{t("landing.subtitle")}</Text>
        <Pressable
          onPress={() => router.push("/(auth)/register")}
          className="bg-brand-600 shadow-card mt-4 rounded-md px-6 py-3"
        >
          <Text className="text-ink-inverse">{t("landing.cta")}</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/(auth)/login")}>
          <Text className="text-brand-600">{t("landing.login")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
