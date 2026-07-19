import type { Href } from "expo-router";

// Canonical web origin — share links built in the app point here so recipients
// without the app land on the public web page (and app holders deep-link back).
export const WEB_ORIGIN = "https://baydar.ps";

export function routeFromUrl(url: string): Href | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const isWebLink = parsed.protocol === "https:" && parsed.hostname === "baydar.ps";
  const isAppLink = parsed.protocol === "baydar:";
  if (!isWebLink && !isAppLink) return null;

  const pathParts = parsed.pathname.split("/").filter(Boolean);
  const parts = isAppLink && parsed.hostname ? [parsed.hostname, ...pathParts] : pathParts;
  const [first, second, third, fourth] = parts;
  if (!first) return null;

  const hasLocalePrefix = first === "ar-PS" || first === "en";
  const [resource, id, token] = hasLocalePrefix ? [second, third, fourth] : [first, second, third];
  if (!resource || !id) return null;

  if (resource === "u") {
    return { pathname: "/(app)/in/[handle]", params: { handle: id } } as Href;
  }
  if (resource === "post") {
    return { pathname: "/(app)/feed", params: { postId: id } } as Href;
  }
  if (resource === "messages") {
    return { pathname: "/(app)/messages/[roomId]", params: { roomId: id } } as Href;
  }
  // "j" is the public share path (baydar.ps/{locale}/j/{id}) — app holders
  // tapping a shared link land straight on the in-app job detail.
  if (resource === "jobs" || resource === "j") {
    return { pathname: "/(app)/jobs/[id]", params: { id } } as Href;
  }
  if (resource === "auth" && id === "verify-email" && token) {
    return { pathname: "/(auth)/verify-email/[token]", params: { token } } as unknown as Href;
  }
  if (resource === "auth" && id === "reset-password" && token) {
    return { pathname: "/(auth)/reset-password/[token]", params: { token } } as unknown as Href;
  }
  if (resource === "verify-email" && id) {
    return { pathname: "/(auth)/verify-email/[token]", params: { token: id } } as unknown as Href;
  }
  if (resource === "reset-password" && id) {
    return { pathname: "/(auth)/reset-password/[token]", params: { token: id } } as unknown as Href;
  }

  return null;
}
