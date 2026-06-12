import { Button, RecordCardSkeleton, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { Text, View } from "react-native";

import type { ActivityMetric, ActivityTask } from "./types";

export function ActivitySkeleton(): JSX.Element {
  return (
    <View style={{ gap: nativeTokens.space[3] }} accessibilityElementsHidden>
      <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
        {[0, 1, 2].map((item) => (
          <Surface key={item} variant="card" padding="4" style={{ flex: 1 }}>
            <RecordCardSkeleton />
          </Surface>
        ))}
      </View>
      <RecordCardSkeleton />
      <RecordCardSkeleton />
    </View>
  );
}

export function ActivityMetrics({ metrics }: { metrics: ActivityMetric[] }): JSX.Element {
  return (
    <View style={{ flexDirection: "row", gap: nativeTokens.space[2] }}>
      {metrics.map((metric) => (
        <Button
          key={metric.id}
          variant="ghost"
          size="md"
          style={{ flex: 1, minHeight: nativeTokens.space[24] }}
          onPress={() => router.push(metric.route as never)}
          accessibilityLabel={`${metric.label}: ${metric.value}`}
        >
          <View style={{ alignItems: "center", gap: nativeTokens.space[1] }}>
            <Text selectable style={metricStyles.value}>
              {metric.value}
            </Text>
            <Text selectable numberOfLines={2} style={metricStyles.label}>
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
  return (
    <Surface variant="card" padding="4" style={{ gap: nativeTokens.space[3] }}>
      <Text selectable style={sectionTitleStyle}>
        {title}
      </Text>
      {tasks.length === 0 ? (
        <Text selectable style={bodyStyle}>
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
  return (
    <Surface
      variant={task.tone === "warning" ? "tinted" : "flat"}
      padding="3"
      style={{ gap: nativeTokens.space[2] }}
    >
      <Text selectable style={taskTitleStyle}>
        {task.title}
      </Text>
      <Text selectable style={bodyStyle}>
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

export const sectionTitleStyle = {
  color: nativeTokens.color.ink,
  fontFamily: nativeTokens.type.family.sans,
  fontSize: nativeTokens.type.scale.h3.size,
  lineHeight: nativeTokens.type.scale.h3.line,
  fontWeight: "700" as const,
  textAlign: "right" as const,
};

export const bodyStyle = {
  color: nativeTokens.color.inkMuted,
  fontFamily: nativeTokens.type.family.body,
  fontSize: nativeTokens.type.scale.small.size,
  lineHeight: nativeTokens.type.scale.small.line,
  textAlign: "right" as const,
};

const taskTitleStyle = {
  ...sectionTitleStyle,
  fontSize: nativeTokens.type.scale.small.size,
  lineHeight: nativeTokens.type.scale.small.line,
};

const metricStyles = {
  value: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    lineHeight: nativeTokens.type.scale.h1.line,
    fontWeight: "800" as const,
    writingDirection: "ltr" as const,
    textAlign: "center" as const,
  },
  label: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
    fontWeight: "700" as const,
    textAlign: "center" as const,
  },
};

export default () => null;
