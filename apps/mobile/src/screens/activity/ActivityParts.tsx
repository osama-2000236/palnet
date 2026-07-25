import {
  Button,
  RecordCardSkeleton,
  Surface,
  nativeTokens,
  useThemeTokens,
} from "@baydar/ui-native";
import { formatNumber } from "@baydar/shared";
import { router } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import type { ActivityMetric, ActivityTask } from "./types";

export function ActivitySkeleton(): JSX.Element {
  return (
    <View style={{ gap: nativeTokens.space[3] }} accessibilityElementsHidden>
      <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
        {[0, 1, 2].map((item) => (
          <Surface key={item} variant="card" padding="4" style={{ flex: 1 }}>
            <RecordCardSkeleton variant="row" />
          </Surface>
        ))}
      </View>
      <RecordCardSkeleton variant="row" />
      <RecordCardSkeleton variant="row" />
    </View>
  );
}

export function ActivityMetrics({ metrics }: { metrics: ActivityMetric[] }): JSX.Element {
  const text = useActivityTextStyles();
  const { i18n } = useTranslation();
  const digits = (value: number | string): string =>
    typeof value === "number" ? formatNumber(value, i18n.language) : value;
  return (
    <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
      {metrics.map((metric) => (
        <Button
          key={metric.id}
          variant="ghost"
          size="md"
          style={{ flex: 1, minHeight: nativeTokens.space[24] }}
          onPress={() => router.push(metric.route as never)}
          accessibilityLabel={`${metric.label}: ${digits(metric.value)}`}
        >
          <View style={{ alignItems: "center", gap: nativeTokens.space[1] }}>
            <Text selectable style={text.metricValue}>
              {digits(metric.value)}
            </Text>
            <Text selectable numberOfLines={2} style={text.metricLabel}>
              {metric.label}
            </Text>
          </View>
        </Button>
      ))}
    </View>
  );
}

export function ActivityTaskList({
  empty,
  tasks,
  title,
}: {
  empty: string;
  tasks: ActivityTask[];
  title: string;
}): JSX.Element {
  const text = useActivityTextStyles();
  return (
    <Surface variant="card" padding="4" style={{ gap: nativeTokens.space[3] }}>
      <Text selectable style={text.sectionTitle}>
        {title}
      </Text>
      {tasks.length === 0 ? (
        <Text selectable style={text.body}>
          {empty}
        </Text>
      ) : (
        <View style={{ gap: nativeTokens.space[2] }}>
          {tasks.map((task) => (
            <ActivityTaskRow key={task.id} task={task} />
          ))}
        </View>
      )}
    </Surface>
  );
}

export function ActivityTaskRow({ task }: { task: ActivityTask }): JSX.Element {
  const text = useActivityTextStyles();
  return (
    <Surface
      variant={task.tone === "warning" ? "tinted" : "flat"}
      padding="3"
      style={{ gap: nativeTokens.space[2] }}
    >
      <Text selectable style={text.taskTitle}>
        {task.title}
      </Text>
      <Text selectable style={text.body}>
        {task.body}
      </Text>
      <Button
        variant="secondary"
        size="sm"
        onPress={() => router.push(task.route as never)}
        accessibilityLabel={task.cta}
      >
        {task.cta}
      </Button>
    </Surface>
  );
}

export function useActivityTextStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => {
    const sectionTitle = {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700" as const,
      textAlign: "auto" as const,
    };
    return {
      sectionTitle,
      taskTitle: {
        ...sectionTitle,
        fontSize: nativeTokens.type.scale.small.size,
        lineHeight: nativeTokens.type.scale.small.line,
      },
      body: {
        color: c.inkMuted,
        fontFamily: nativeTokens.type.family.body,
        fontSize: nativeTokens.type.scale.small.size,
        lineHeight: nativeTokens.type.scale.small.line,
        textAlign: "auto" as const,
      },
      metricValue: {
        color: c.ink,
        fontFamily: nativeTokens.type.family.sans,
        fontSize: nativeTokens.type.scale.h1.size,
        lineHeight: nativeTokens.type.scale.h1.line,
        fontWeight: "800" as const,
        writingDirection: "ltr" as const,
        textAlign: "center" as const,
      },
      metricLabel: {
        color: c.inkMuted,
        fontFamily: nativeTokens.type.family.sans,
        fontSize: nativeTokens.type.scale.caption.size,
        lineHeight: nativeTokens.type.scale.caption.line,
        fontWeight: "700" as const,
        textAlign: "center" as const,
      },
    };
  }, [c]);
}
