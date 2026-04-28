import type { Href } from "expo-router";

export const LinkingOptions = {
  prefixes: ["baydar://", "https://baydar.ps"],
  config: {
    screens: {
      "(app)": {
        screens: {
          "in/[handle]": "u/:handle",
          feed: "post/:postId",
          "messages/[roomId]": "messages/:roomId",
          "jobs/[id]": "jobs/:id",
        },
      },
    },
  },
} as const;

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
  const [resource, id] = parts;
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
  if (resource === "jobs") {
    return { pathname: "/(app)/jobs/[id]", params: { id } } as Href;
  }

  return null;
}
