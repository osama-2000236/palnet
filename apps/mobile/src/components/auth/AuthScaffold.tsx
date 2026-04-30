import { Button, Icon, Surface, nativeTokens } from "@baydar/ui-native";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface AuthScaffoldProps {
  appName: string;
  kicker?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  testID: string;
}

interface AuthTextFieldProps extends TextInputProps {
  label: string;
  error?: boolean;
  errorMessage?: string;
  hint?: string;
  testID: string;
}

const headingStyle: TextStyle = {
  color: nativeTokens.color.ink,
  fontFamily: nativeTokens.type.family.sans,
  fontSize: nativeTokens.type.scale.h1.size,
  fontWeight: nativeTokens.type.scale.h1.weight,
  lineHeight: nativeTokens.type.scale.h1.line,
  textAlign: "center",
};

const bodyStyle: TextStyle = {
  color: nativeTokens.color.inkMuted,
  fontFamily: nativeTokens.type.family.body,
  fontSize: nativeTokens.type.scale.body.size,
  fontWeight: nativeTokens.type.scale.body.weight,
  lineHeight: nativeTokens.type.scale.body.line,
  textAlign: "center",
};

export function AuthScaffold({
  appName,
  kicker,
  title,
  subtitle,
  children,
  footer,
  testID,
}: AuthScaffoldProps): JSX.Element {
  return (
    <SafeAreaView
      testID={testID}
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: nativeTokens.space[4],
            gap: nativeTokens.space[5],
          }}
        >
          <View style={{ alignItems: "center", gap: nativeTokens.space[3] }}>
            <View
              accessibilityElementsHidden
              style={{
                width: nativeTokens.space[16],
                height: nativeTokens.space[16],
                borderRadius: nativeTokens.radius.xl,
                borderWidth: 1,
                borderColor: nativeTokens.color.lineSoft,
                backgroundColor: nativeTokens.color.surface,
                alignItems: "center",
                justifyContent: "center",
                ...nativeTokens.shadow.card,
              }}
            >
              <Icon name="logo" size={nativeTokens.space[8]} color={nativeTokens.color.brand600} />
            </View>

            <View style={{ alignItems: "center", gap: nativeTokens.space[1] }}>
              <Text
                selectable
                style={{
                  color: nativeTokens.color.brand600,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.caption.size,
                  fontWeight: nativeTokens.type.scale.caption.weight,
                  lineHeight: nativeTokens.type.scale.caption.line,
                  textAlign: "center",
                }}
              >
                {kicker ?? appName}
              </Text>
              <Text selectable style={headingStyle}>
                {title}
              </Text>
              <Text selectable style={bodyStyle}>
                {subtitle}
              </Text>
            </View>
          </View>

          <Surface
            variant="hero"
            padding="5"
            style={{
              gap: nativeTokens.space[4],
            }}
          >
            {children}
          </Surface>

          {footer ? <View style={{ alignItems: "center" }}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthTextField({
  label,
  error,
  errorMessage,
  hint,
  testID,
  keyboardType,
  style,
  accessibilityLabel,
  ...rest
}: AuthTextFieldProps): JSX.Element {
  const isEmail = keyboardType === "email-address";

  return (
    <View style={{ gap: nativeTokens.space[1] }}>
      <Text
        selectable
        style={{
          color: nativeTokens.color.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.small.size,
          fontWeight: "600",
          lineHeight: nativeTokens.type.scale.small.line,
          textAlign: "right",
        }}
      >
        {label}
      </Text>
      <TextInput
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={nativeTokens.color.inkSubtle}
        keyboardType={keyboardType}
        textAlign={isEmail ? "left" : "right"}
        style={[
          {
            minHeight: nativeTokens.chrome.minHit,
            borderWidth: 1,
            borderColor: error ? nativeTokens.color.danger : nativeTokens.color.lineHard,
            borderRadius: nativeTokens.radius.md,
            backgroundColor: nativeTokens.color.surface,
            color: nativeTokens.color.ink,
            opacity: rest.editable === false ? 0.65 : 1,
            paddingHorizontal: nativeTokens.space[3],
            paddingVertical: nativeTokens.space[2],
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.body.size,
          },
          style,
        ]}
        {...rest}
      />
      {hint ? (
        <Text
          selectable
          style={{
            color: error ? nativeTokens.color.danger : nativeTokens.color.inkSubtle,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
            lineHeight: nativeTokens.type.scale.caption.line,
            textAlign: "right",
          }}
        >
          {hint}
        </Text>
      ) : null}
      {errorMessage ? (
        <Text
          selectable
          accessibilityRole="alert"
          style={{
            color: nativeTokens.color.danger,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
            lineHeight: nativeTokens.type.scale.caption.line,
            textAlign: "right",
          }}
        >
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}

export function AuthError({ message }: { message: string }): JSX.Element {
  return (
    <Surface variant="tinted" padding="3" accessibilityRole="alert" testID="auth-error">
      <Text
        selectable
        style={{
          color: nativeTokens.color.danger,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.small.size,
          lineHeight: nativeTokens.type.scale.small.line,
          textAlign: "right",
        }}
      >
        {message}
      </Text>
    </Surface>
  );
}

export function AuthFooterLink({
  label,
  actionLabel,
  onPress,
  testID,
}: {
  label: string;
  actionLabel: string;
  onPress: () => void;
  testID: string;
}): JSX.Element {
  return (
    <View style={{ alignItems: "center", gap: nativeTokens.space[2] }}>
      <Text
        selectable
        style={{
          color: nativeTokens.color.inkMuted,
          fontFamily: nativeTokens.type.family.body,
          fontSize: nativeTokens.type.scale.small.size,
          lineHeight: nativeTokens.type.scale.small.line,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
      <Button
        variant="ghost"
        size="md"
        accessibilityLabel={actionLabel}
        testID={testID}
        onPress={onPress}
      >
        {actionLabel}
      </Button>
    </View>
  );
}
