import { useTranslation } from "react-i18next";
import { Pressable, SafeAreaView, Text, View } from "react-native";

export default function Landing(): JSX.Element {
  const { t } = useTranslation();
  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-3xl font-bold text-ink">
          {t("landing.title")}
        </Text>
        <Text className="mt-4 text-center text-ink-muted">{t("landing.subtitle")}</Text>
        <Pressable className="mt-8 rounded-md bg-brand-600 px-6 py-3 shadow-card">
          <Text className="text-white">{t("landing.cta")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
