import { CompanySummary } from "@baydar/shared";
import { Surface, nativeTokens } from "@baydar/ui-native";
import { Link, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

const CompanyList = z.array(CompanySummary);

export default function EmployerHomeScreen(): JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<CompanySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await apiFetch("/companies/me", CompanyList);
        setItems(list);
      } catch (e) {
        setError(apiErrorMessage(t, e));
      }
    })();
  }, [t]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <Stack.Screen options={{ title: t("employer.title"), headerShown: true }} />
      <FlatList
        contentContainerStyle={{ padding: nativeTokens.space[4], gap: nativeTokens.space[3] }}
        data={items ?? []}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={
          error ? (
            <Text style={{ color: nativeTokens.color.danger }}>{error}</Text>
          ) : items === null ? (
            <Text style={{ color: nativeTokens.color.inkMuted }}>{t("common.loading")}</Text>
          ) : (
            <Surface variant="card" padding="4">
              <Text style={{ color: nativeTokens.color.ink }}>{t("employer.empty")}</Text>
            </Surface>
          )
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: "/(app)/employer/[slug]", params: { slug: item.slug } }} asChild>
            <Pressable>
              <Surface variant="card" padding="4">
                <Text
                  style={{
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.h3.size,
                    fontWeight: "700",
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    color: nativeTokens.color.inkMuted,
                    fontSize: nativeTokens.type.scale.caption.size,
                    marginTop: nativeTokens.space[1],
                  }}
                >
                  {item.viewerRole ?? "EDITOR"}
                  {item.verified ? " · ✓" : ""}
                </Text>
              </Surface>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}
