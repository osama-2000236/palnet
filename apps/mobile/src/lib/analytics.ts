import PostHog from "posthog-react-native";

type AnalyticsProps = Record<string, unknown>;
type PrimitiveAnalyticsProps = Record<string, string | number | boolean | null>;

let client: PostHog | null = null;
let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim();
  if (!key || key.includes("REPLACE_WITH")) {
    if (__DEV__) {
      console.debug("[analytics] PostHog disabled: EXPO_PUBLIC_POSTHOG_KEY is empty.");
    }
    return;
  }

  client = new PostHog(key, {
    host: process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    persistence: "memory",
    captureAppLifecycleEvents: false,
  });
}

export function track(event: string, props?: AnalyticsProps): void {
  if (!initialized) initAnalytics();

  if (!client) {
    if (__DEV__) console.debug("[analytics]", event, props ?? {});
    return;
  }

  void client.capture(event, primitiveProps(props));
}

function primitiveProps(props?: AnalyticsProps): PrimitiveAnalyticsProps | undefined {
  if (!props) return undefined;
  return Object.fromEntries(
    Object.entries(props).flatMap(([key, value]) => {
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        return [[key, value]];
      }
      return [];
    }),
  );
}
