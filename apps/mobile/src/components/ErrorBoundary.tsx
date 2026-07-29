import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { StyleSheet, View } from "react-native";

import { EmptyState, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";

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
 *
 * `direction="block"` is DESIGN.md §7.5's failure register, and it is what
 * web's `(app)/error.tsx` renders for the same event. Mobile used to show the
 * Baydar logo here — the brand mark, on the one screen that has just failed the
 * user — and it was also the reason the whole block kit was unreachable on
 * native.
 */
function CrashScreen({ onRetry }: { onRetry: () => void }): ReactNode {
  const tk = useThemeTokens();
  return (
    <View style={[styles.screen, { backgroundColor: tk.color.surfaceMuted }]}>
      <Surface variant="hero" padding="8">
        <EmptyState
          motif="error"
          direction="block"
          title={i18n.t("system.errorBoundary.title")}
          body={i18n.t("system.errorBoundary.body")}
          cta={i18n.t("system.errorBoundary.retry")}
          onAction={onRetry}
        />
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
});
