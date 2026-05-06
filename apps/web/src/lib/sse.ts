import { StreamTokenResponse, type StreamTokenScope } from "@baydar/shared";

import { apiFetch } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const STREAM_PATHS: Record<StreamTokenScope, string> = {
  messaging: "/messaging/stream",
  notifications: "/notifications/stream",
};

export async function openStream(
  scope: StreamTokenScope,
  accessToken: string,
): Promise<EventSource> {
  const streamToken = await apiFetch("/auth/stream-token", StreamTokenResponse, {
    method: "POST",
    token: accessToken,
    body: { scope },
  });
  const path = STREAM_PATHS[scope];
  const url = `${API_BASE}${path}?token=${encodeURIComponent(streamToken.token)}`;
  return new EventSource(url);
}
