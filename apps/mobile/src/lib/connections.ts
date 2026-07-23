// One connection state machine for every screen that can act on a person —
// the profile detail screen and the people search results. Screens keep their
// own UI state; this returns the next viewer state to store.
import type { Profile } from "@baydar/shared";
import { z } from "zod";

import { apiFetch } from "@/lib/api";

export type ConnectionAction = "CONNECT" | "WITHDRAW" | "ACCEPT" | "DECLINE" | "REMOVE";

type ViewerState = NonNullable<Profile["viewer"]>;

const Raw = z.object({}).passthrough();

export async function runConnectionAction(
  action: ConnectionAction,
  viewer: ViewerState,
  targetUserId: string,
  token: string,
): Promise<ViewerState> {
  if (action === "CONNECT") {
    const row = (await apiFetch("/connections", Raw, {
      method: "POST",
      token,
      body: { receiverId: targetUserId },
    })) as { id: string };
    return {
      isSelf: false,
      connection: { status: "PENDING", direction: "OUTGOING", connectionId: row.id },
    };
  }

  const conn = viewer.connection;
  if (!conn) return viewer;

  if (action === "WITHDRAW") {
    await apiFetch(`/connections/${conn.connectionId}/withdraw`, Raw, { method: "POST", token });
    return { isSelf: false, connection: null };
  }

  if (action === "ACCEPT" || action === "DECLINE") {
    await apiFetch(`/connections/${conn.connectionId}/respond`, Raw, {
      method: "POST",
      token,
      body: { action },
    });
    return {
      isSelf: false,
      connection: {
        status: action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
        direction: "INCOMING",
        connectionId: conn.connectionId,
      },
    };
  }

  await apiFetch(`/connections/${conn.connectionId}`, Raw, { method: "DELETE", token });
  return { isSelf: false, connection: null };
}
