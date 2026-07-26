import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Icon, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";

import i18n from "@/i18n";
import { captureException } from "@/lib/observability";

interface Props {
  children: ReactNode;
}

interface State {
  crashed: boolean;
}

/**
 * The visible crash screen, split out as a function component purely so it can
 * call `useThemeTokens()`.
 *
 * `ErrorBoundary` has to be a class — `getDerivedStateFromError` and
 * `componentDidCatch` have no hook equivalent — and a class cannot read the
 * theme, so its colours sat frozen in `StyleSheet.create` and the crash screen
 * rendered light-on-light in dark mode. The one screen a user reaches when
 * everything else has already failed.
 */
function CrashScreen({ onRetry }: { onRetry: () => void }): ReactNode {
  const tk = useThemeTokens();
  return (
    <View style={[styles.screen, { backgroundColor: tk.color.surfaceMuted }]}>
      <Surface variant="hero" padding="8" style={styles.card}>
        <Icon name="logo" size={nativeTokens.space[16]} />
        <Text style={[styles.title, { color: tk.color.ink }]}>
          {i18n.t("system.errorBoundary.title")}
        </Text>
        <Text style={[styles.body, { color: tk.color.inkMuted }]}>
          {i18n.t("system.errorBoundary.body")}
        </Text>
        <Button
          variant="primary"
          size="lg"
          onPress={onRetry}
          accessibilityLabel={i18n.t("system.errorBoundary.retry")}
        >
          {i18n.t("system.errorBoundary.retry")}
        </Button>
      </Surface>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  override componentDidCatch(error: Error, _info: ErrorInfo): void {
    captureException(error);
  }

  private retry = (): void => {
    this.setState({ crashed: false });
  };

  override render(): ReactNode {
    if (!this.state.crashed) return this.props.children;
    return <CrashScreen onRetry={this.retry} />;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: nativeTokens.space[4],
  },
  card: {
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  title: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    fontWeight: "700",
    lineHeight: nativeTokens.type.scale.h1.line,
    textAlign: "center",
  },
  body: {
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "center",
  },
});
