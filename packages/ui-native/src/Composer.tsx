import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Avatar, type AvatarUser } from "./Avatar";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Surface } from "./Surface";
import { nativeTokens } from "./tokens";

export interface ComposerMedia {
  id: string;
  url: string;
  kind: "IMAGE" | "VIDEO";
  mimeType: string;
  sizeBytes?: number;
  blurhash?: string | null;
}

export interface ComposerLabels {
  startPrompt: string;
  expandedPlaceholder: string;
  audienceHint: string;
  addImage: string;
  addVideo: string;
  addEvent: string;
  cancel: string;
  submit: string;
  uploading: string;
  removeMedia: string;
  uploadFailed: string;
}

export interface ComposerProps {
  me: AvatarUser | null;
  labels: ComposerLabels;
  media: ComposerMedia[];
  maxLength?: number;
  busy?: boolean;
  error?: string | null;
  onSubmit(body: string): Promise<void> | void;
  mediaPicker?: () => Promise<void> | void;
  onRemoveMedia?(id: string): void;
  defaultExpanded?: boolean;
}

export function Composer({
  me,
  labels,
  media,
  maxLength = 3000,
  busy = false,
  error,
  onSubmit,
  mediaPicker,
  onRemoveMedia,
  defaultExpanded = false,
}: ComposerProps): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [body, setBody] = useState("");

  if (!expanded) {
    return (
      <Surface variant="card" padding="3">
        <View style={styles.collapsed}>
          <Avatar user={me} size="md" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labels.startPrompt}
            style={styles.prompt}
            onPress={() => setExpanded(true)}
          >
            <Text style={styles.promptText}>{labels.startPrompt}</Text>
          </Pressable>
        </View>
      </Surface>
    );
  }

  return (
    <Surface variant="card" padding="4">
      <View style={styles.stack}>
        <View style={styles.header}>
          <Avatar user={me} size="md" />
          <Text style={styles.audience}>{labels.audienceHint}</Text>
        </View>
        <TextInput
          value={body}
          onChangeText={(next) => setBody(next.slice(0, maxLength))}
          placeholder={labels.expandedPlaceholder}
          placeholderTextColor={nativeTokens.color.inkMuted}
          multiline
          style={styles.input}
          accessibilityLabel={labels.expandedPlaceholder}
        />
        {media.length > 0 ? (
          <View style={styles.mediaList}>
            {media.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={labels.removeMedia}
                onPress={() => onRemoveMedia?.(item.id)}
                style={styles.mediaChip}
              >
                <Icon name={item.kind === "IMAGE" ? "image" : "video"} size={16} />
                <Text style={styles.mediaText}>{item.mimeType}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          {mediaPicker ? (
            <Button variant="ghost" size="sm" onPress={() => void mediaPicker()}>
              {labels.addImage}
            </Button>
          ) : null}
          <Text style={styles.count}>
            {body.length} / {maxLength}
          </Text>
          <Button variant="ghost" size="sm" onPress={() => setExpanded(false)}>
            {labels.cancel}
          </Button>
          <Button
            size="sm"
            loading={busy}
            disabled={busy || (body.trim().length === 0 && media.length === 0)}
            onPress={() => {
              void onSubmit(body.trim());
              setBody("");
            }}
          >
            {labels.submit}
          </Button>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  stack: { gap: nativeTokens.space[3] },
  collapsed: { flexDirection: "row", alignItems: "center", gap: nativeTokens.space[3] },
  prompt: {
    flex: 1,
    borderWidth: 1,
    borderColor: nativeTokens.color.lineSoft,
    borderRadius: nativeTokens.radius.full,
    backgroundColor: nativeTokens.color.surfaceSubtle,
    paddingHorizontal: nativeTokens.space[4],
    paddingVertical: nativeTokens.space[3],
  },
  promptText: { color: nativeTokens.color.inkMuted, fontFamily: nativeTokens.type.family.sans },
  header: { flexDirection: "row", alignItems: "center", gap: nativeTokens.space[3] },
  audience: { color: nativeTokens.color.inkMuted, fontFamily: nativeTokens.type.family.sans },
  input: {
    minHeight: 112,
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    textAlignVertical: "top",
  },
  mediaList: { flexDirection: "row", flexWrap: "wrap", gap: nativeTokens.space[2] },
  mediaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[1],
    borderRadius: nativeTokens.radius.md,
    backgroundColor: nativeTokens.color.surfaceSubtle,
    paddingHorizontal: nativeTokens.space[2],
    paddingVertical: nativeTokens.space[1],
  },
  mediaText: { color: nativeTokens.color.inkMuted, fontSize: nativeTokens.type.scale.small.size },
  error: { color: nativeTokens.color.danger, fontFamily: nativeTokens.type.family.sans },
  actions: { flexDirection: "row", alignItems: "center", gap: nativeTokens.space[2] },
  count: { flex: 1, color: nativeTokens.color.inkMuted, fontSize: nativeTokens.type.scale.small.size },
});
