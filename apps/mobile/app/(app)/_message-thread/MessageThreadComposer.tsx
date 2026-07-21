import { Button, Icon, Input, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { View } from "react-native";

export function MessageThreadComposer({
  draft,
  sending,
  placeholder,
  sendLabel,
  onDraftChange,
  onSubmit,
}: {
  draft: string;
  sending: boolean;
  placeholder: string;
  sendLabel: string;
  onDraftChange(value: string): void;
  onSubmit(): void;
}): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: nativeTokens.space[2],
        borderTopWidth: 1,
        borderTopColor: c.lineSoft,
        backgroundColor: c.surface,
        padding: nativeTokens.space[2],
      }}
    >
      <Input
        fullWidth
        testID="message-composer"
        value={draft}
        onChangeText={onDraftChange}
        placeholder={placeholder}
        multiline
        maxLength={5000}
        style={{ flex: 1 }}
        inputStyle={{
          flex: 1,
          color: c.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.body.size,
          maxHeight: nativeTokens.space[24] + nativeTokens.space[6],
        }}
      />
      <Button
        disabled={sending || draft.trim().length === 0}
        onPress={onSubmit}
        loading={sending}
        accessibilityLabel={sendLabel}
        testID="messages-send-button"
        size="lg"
        leading={<Icon name="send" size={18} color={c.inkInverse} />}
      >
        {sendLabel}
      </Button>
    </View>
  );
}
