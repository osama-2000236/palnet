import { CompanySummary } from "@baydar/shared";
import {
  AppHeader,
  EmptyState,
  RecordCard,
  RecordCardSkeleton,
  nativeTokens,
} from "@baydar/ui-native";
import { Link, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { StateMessage } from "@/components/StateMessage";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

const CompanyList = z.array(CompanySummary);

export default function EmployerHomeScreen(): JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<CompanySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const list = await apiFetch("/companies/me", CompanyList);
        setItems(list);
      } catch (e) {
        setError(apiErrorMessage(t, e));
      }
    })();
  }, [reloadKey, t]);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ title: t("employer.title"), headerShown: false }} />
      <View style={styles.content}>
        <AppHeader title={t("employer.title")} subtitle={t("employer.subtitle")} compact />
        <FlatList
          contentContainerStyle={styles.listContent}
          data={items ?? []}
          keyExtractor={(c) => c.id}
          ListEmptyComponent={
            error ? (
              <StateMessage
                message={error}
                actionLabel={t("common.retry")}
                onAction={() => {
                  setItems(null);
                  setReloadKey((key) => key + 1);
                }}
              />
            ) : items === null ? (
              <View style={styles.skeletonStack}>
                <RecordCardSkeleton />
                <RecordCardSkeleton />
              </View>
            ) : (
              <EmptyState motif="jobs" title={t("employer.empty")} />
            )
          }
          renderItem={({ item }) => (
            <Link
              href={{ pathname: "/(app)/employer/[slug]", params: { slug: item.slug } }}
              asChild
            >
              <Pressable>
                <RecordCard
                  title={item.name}
                  subtitle={t(`employer.viewerRole.${item.viewerRole ?? "EDITOR"}`)}
                  meta={item.verified ? t("employer.verified") : null}
                />
              </Pressable>
            </Link>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: nativeTokens.space[4],
    paddingTop: nativeTokens.space[3],
  },
  listContent: {
    gap: nativeTokens.space[3],
    paddingBottom: nativeTokens.space[6],
  },
  skeletonStack: {
    gap: nativeTokens.space[3],
  },
});
