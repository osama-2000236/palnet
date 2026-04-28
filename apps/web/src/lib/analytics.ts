import posthog from "posthog-js";

type AnalyticsProps = Record<string, unknown>;

let initialized = false;

export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key || key.includes("REPLACE_WITH")) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[analytics] PostHog disabled: NEXT_PUBLIC_POSTHOG_KEY is empty.");
    }
    return;
  }

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false,
  });
}

export function track(event: string, props?: AnalyticsProps): void {
  if (!initialized) initAnalytics();

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key || key.includes("REPLACE_WITH")) {
    if (process.env.NODE_ENV !== "production") console.debug("[analytics]", event, props ?? {});
    return;
  }

  posthog.capture(event, props);
}
