import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Icon, Surface, nativeTokens } from "@baydar/ui-native";

import i18n from "@/i18n";
import { captureException } from "@/lib/observability";

interface Props {
  children: ReactNode;
}

interface State {
  crashed: boolean;
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

    return (
      <View style={styles.screen}>
        <Surface variant="hero" padding="8" style={styles.card}>
          <Icon name="logo" size={nativeTokens.space[16]} />
          <Text style={styles.title}>{i18n.t("system.errorBoundary.title")}</Text>
          <Text style={styles.body}>{i18n.t("system.errorBoundary.body")}</Text>
          <Button
            variant="primary"
            size="lg"
            onPress={this.retry}
            accessibilityLabel={i18n.t("system.errorBoundary.retry")}
          >
            {i18n.t("system.errorBoundary.retry")}
          </Button>
        </Surface>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: nativeTokens.space[4],
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  card: {
    alignItems: "center",
    gap: nativeTokens.space[3],
  },
  title: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h1.size,
    fontWeight: "700",
    lineHeight: nativeTokens.type.scale.h1.line,
    textAlign: "center",
  },
  body: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
    textAlign: "center",
  },
});
