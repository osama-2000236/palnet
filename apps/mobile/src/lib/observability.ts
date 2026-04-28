import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Sentry from "@sentry/react-native";

let initialized = false;

/**
 * `true` when the JS bundle is running inside Expo Go (sandbox without our
 * native bridge). Sentry's native module is not present there, so we skip
 * `init()` and `wrap()` to avoid crashes on first frame.
 */
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function runtimeEnvironment(): string {
  return (
    process.env.EXPO_PUBLIC_APP_ENV ??
    process.env.NODE_ENV ??
    (__DEV__ ? "development" : "production")
  );
}

export function initObservability(): void {
  if (initialized) return;

  if (IS_EXPO_GO) {
    if (__DEV__) {
      console.debug("[observability] Sentry skipped: running inside Expo Go.");
    }
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn || dsn.includes("REPLACE_WITH")) {
    if (__DEV__) {
      console.debug("[observability] Sentry disabled: EXPO_PUBLIC_SENTRY_DSN is empty.");
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: runtimeEnvironment(),
    release: process.env.EXPO_PUBLIC_APP_VERSION?.trim() || undefined,
    tracesSampleRate: 0.1,
  });
  initialized = true;

  if (__DEV__) {
    console.debug(`[observability] Sentry initialized for ${runtimeEnvironment()}.`);
  }
}

export function captureException(error: unknown): void {
  if (IS_EXPO_GO || !initialized) return;
  Sentry.captureException(error);
}

/**
 * Wraps the root component in Sentry's error reporter when running in a
 * proper dev/release client. In Expo Go (no native module), returns the
 * component untouched so the app boots.
 */
export function wrapApp<T>(component: T): T {
  if (IS_EXPO_GO) return component;
  return Sentry.wrap(component as never) as T;
}

export { Sentry };
