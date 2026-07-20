import { AppHeader, Button, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StateMessage } from "@/components/StateMessage";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken, readSession } from "@/lib/session";

import {
  ActivityMetrics,
  ActivitySkeleton,
  ActivityTaskList,
  useActivityTextStyles,
} from "./_activity/ActivityParts";
import { buildActivityMetrics, buildActivityTasks, fetchActivityState } from "./_activity/api";
import type { ActivityState } from "./_activity/types";

export default function ActivityScreen(): JSX.Element {
  const textStyles = useActivityTextStyles();
  const c = useThemeTokens().color;
  const { t } = useTranslation();
  const [state, setState] = useState<ActivityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const session = await readSession();
    if (!session) {
      router.replace("/(auth)/login");
      return;
    }
    const token = await getAccessToken();
    if (!token) return;
    setError(null);
    try {
      setState(await fetchActivityState(token));
    } catch (caught) {
      setState(null);
      setError(apiErrorMessage(t, caught));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => (state ? buildActivityMetrics(state, t) : []), [state, t]);
  const tasks = useMemo(() => (state ? buildActivityTasks(state, t) : []), [state, t]);

  async function refresh(): Promise<void> {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surfaceMuted }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={c.brand600}
            colors={[c.brand600]}
            onRefresh={() => void refresh()}
          />
        }
        contentContainerStyle={{
          padding: nativeTokens.space[4],
          paddingBottom: nativeTokens.space[8],
          gap: nativeTokens.space[4],
        }}
      >
        <AppHeader title={t("activity.title")} subtitle={t("activity.subtitle")} compact />
        {loading ? (
          <ActivitySkeleton />
        ) : error || !state ? (
          <StateMessage
            message={error ?? t("activity.errorBody")}
            actionLabel={t("common.retry")}
            onAction={() => void load()}
          />
        ) : (
          <>
            <ActivityMetrics metrics={metrics} />
            <ActivityTaskList
              title={t("activity.tasks.title")}
              empty={t("activity.tasks.empty")}
              tasks={tasks}
            />
            <Surface variant="card" padding="4" style={{ gap: nativeTokens.space[3] }}>
              <Text selectable style={textStyles.sectionTitle}>
                {t("activity.jobs.title")}
              </Text>
              {state.jobs.length === 0 ? (
                <Text selectable style={textStyles.body}>
                  {t("activity.jobs.empty")}
                </Text>
              ) : (
                <View style={{ gap: nativeTokens.space[2] }}>
                  {state.jobs.map((job) => (
                    <Button
                      key={job.id}
                      fullWidth
                      variant="secondary"
                      size="md"
                      onPress={() => router.push(`/(app)/jobs/${job.id}` as never)}
                      accessibilityLabel={job.title}
                    >
                      {job.title}
                    </Button>
                  ))}
                </View>
              )}
            </Surface>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
