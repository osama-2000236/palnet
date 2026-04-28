import * as Sentry from "@sentry/react-native";

let initialized = false;

function runtimeEnvironment(): string {
  return process.env.EXPO_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? (__DEV__ ? "development" : "production");
}

export function initObservability(): void {
  if (initialized) return;

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
    tracesSampleRate: 0.1,
  });
  initialized = true;

  if (__DEV__) {
    console.debug(`[observability] Sentry initialized for ${runtimeEnvironment()}.`);
  }
}

export function captureException(error: unknown): void {
  Sentry.captureException(error);
}

export { Sentry };
