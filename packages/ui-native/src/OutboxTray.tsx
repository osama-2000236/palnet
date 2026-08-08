// OutboxTray - native twin of packages/ui-web/src/OutboxTray.tsx.
//
// Same prop vocabulary: entries / labels / onRetry / onDiscard. Native has no
// `className`; everything else matches, including the rule that a queue with
// nothing to decide renders nothing at all.

import { StyleSheet, Text, View } from "react-native";

import { Button } from "./Button";
import { Surface } from "./Surface";
import { useThemeTokens } from "./ThemeProvider";
import { nativeTokens } from "./tokens";

export type OutboxTrayState = "queued" | "sending" | "failed";

export interface OutboxTrayEntry {
  id: string;
  /** POST | MESSAGE | APPLICATION | WORK_PROOF_CONFIRM. */
  kind: string;
  state: OutboxTrayState;
  /** One line of what the member's copy is, for a row they can recognise. */
  preview?: string;
}

export interface OutboxTrayLabels {
  title: string;
  /** Keyed by kind, so a row says "منشور" rather than "POST". */
  kinds: Record<string, string>;
  queued: string;
  retry: string;
  discard: string;
}

export interface OutboxTrayProps {
  entries: OutboxTrayEntry[];
  labels: OutboxTrayLabels;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}

export function OutboxTray({
  entries,
  labels,
  onRetry,
  onDiscard,
}: OutboxTrayProps): JSX.Element | null {
  const c = useThemeTokens().color;
  const failed = entries.filter((entry) => entry.state === "failed");
  const pending = entries.length - failed.length;

  // Nothing to decide, nothing to show.
  if (failed.length === 0 && pending === 0) return null;

  return (
    <Surface variant="tinted" padding="4" style={styles.tray}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.ink }]}>{labels.title}</Text>
        {pending > 0 ? (
          <Text style={[styles.pending, { color: c.inkMuted }]}>{labels.queued}</Text>
        ) : null}
      </View>

      {failed.map((entry) => (
        <View
          key={entry.id}
          style={[styles.row, { borderColor: c.lineSoft, backgroundColor: c.surface }]}
        >
          <View style={styles.rowText}>
            <Text style={[styles.kind, { color: c.inkMuted }]}>
              {labels.kinds[entry.kind] ?? entry.kind}
            </Text>
            {entry.preview ? (
              <Text numberOfLines={2} style={[styles.preview, { color: c.ink }]}>
                {entry.preview}
              </Text>
            ) : null}
          </View>
          <View style={styles.actions}>
            <Button size="sm" variant="secondary" onPress={() => onRetry(entry.id)}>
              {labels.retry}
            </Button>
            <Button size="sm" variant="ghost" onPress={() => onDiscard(entry.id)}>
              {labels.discard}
            </Button>
          </View>
        </View>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  tray: { gap: nativeTokens.space[3] },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: nativeTokens.space[3],
  },
  title: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    fontWeight: "600",
  },
  pending: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  row: {
    borderWidth: 1,
    borderRadius: nativeTokens.radius.md,
    padding: nativeTokens.space[3],
    gap: nativeTokens.space[2],
  },
  rowText: { gap: nativeTokens.space[1] },
  kind: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  preview: {
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.body.size,
  },
  actions: { flexDirection: "row", gap: nativeTokens.space[2] },
});
