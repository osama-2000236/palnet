import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import type { ApiClient } from "../api-client";
import type { ReportReason } from "../enums";
import { cursorPage } from "../pagination";
import { BlockedUserDTO, type BlockBody, type ReportBody } from "../schemas/moderation-safety";

/**
 * Report / block / unblock, for both apps.
 *
 * Web and mobile carried this file twice, 112 identical lines out of 116 — the
 * only differences were a `"use client"` directive and which module the token
 * getter came from. Both platforms now expose the same `ApiClient`, so the
 * whole thing is one function taking that client.
 */

// ponytail: a fourth copy of this union lives in packages/ui-web/src/safety.tsx
// and packages/ui-native/src/safety.tsx, each exporting it as `ReportTarget`.
// They are structurally identical. Converging the name is a design-system API
// change and belongs with the ui-* lockstep pass, not here.
export type ReportSubject =
  | { kind: "user"; id: string }
  | { kind: "post"; id: string }
  | { kind: "comment"; id: string }
  | { kind: "message"; id: string };

export interface ReportInput {
  target: ReportSubject;
  reason: ReportReason;
  details?: string;
}

export const safetyQueryKeys = {
  blockedList: ["blocked", "list"] as const,
};

const ReportResult = z.object({ id: z.string(), createdAt: z.string() });
const BlockResult = z.object({
  id: z.string(),
  blockedUserId: z.string(),
  createdAt: z.string(),
});
const BlockedUsersPage = cursorPage(BlockedUserDTO);

/**
 * Blocking hides the other person everywhere at once, so every surface that
 * could be showing them has to be refetched — not just the blocked list.
 */
const INVALIDATE_KEYS = [
  ["feed"],
  ["posts", "byId"],
  ["comments", "byPost"],
  ["search", "people"],
  ["messaging", "rooms"],
  ["notifications", "list"],
  safetyQueryKeys.blockedList,
] as const;

function reportBody(input: ReportInput): ReportBody {
  const base = { reason: input.reason, details: input.details?.trim() || undefined };
  switch (input.target.kind) {
    case "user":
      return { ...base, targetUserId: input.target.id };
    case "post":
      return { ...base, targetPostId: input.target.id };
    case "comment":
      return { ...base, targetCommentId: input.target.id };
    case "message":
      return { ...base, targetMessageId: input.target.id };
  }
}

export function createSafetyApi(client: ApiClient) {
  const token = async (): Promise<string> => {
    const value = await client.getValidAccessToken();
    if (!value) throw new Error("AUTH_UNAUTHORIZED");
    return value;
  };

  function useInvalidateSafetySurfaces(): () => void {
    const queryClient = useQueryClient();
    return () => {
      for (const queryKey of INVALIDATE_KEYS) {
        void queryClient.invalidateQueries({ queryKey: [...queryKey] });
      }
    };
  }

  function useReport() {
    return useMutation({
      mutationFn: async (input: ReportInput) =>
        client.apiFetch("/reports", ReportResult, {
          method: "POST",
          token: await token(),
          body: reportBody(input),
        }),
    });
  }

  function useBlock() {
    const invalidate = useInvalidateSafetySurfaces();
    return useMutation({
      mutationFn: async (body: BlockBody) =>
        client.apiFetch("/blocks", BlockResult, { method: "POST", token: await token(), body }),
      onSuccess: invalidate,
    });
  }

  function useUnblock() {
    const invalidate = useInvalidateSafetySurfaces();
    return useMutation({
      mutationFn: async (blockedUserId: string) =>
        client.apiCall(`/blocks/${blockedUserId}`, { method: "DELETE", token: await token() }),
      onSuccess: invalidate,
    });
  }

  function useBlockedUsers(after?: string | null, limit = 20) {
    return useQuery({
      queryKey: [...safetyQueryKeys.blockedList, { after: after ?? null, limit }],
      queryFn: async () => {
        // Built by hand rather than with URLSearchParams: that is a host global,
        // and this package compiles against `lib: ["ES2022"]` with no DOM or
        // node types. Two params do not justify declaring the API.
        const qs = `limit=${limit}${after ? `&after=${encodeURIComponent(after)}` : ""}`;
        return client.apiFetchPage(`/blocks?${qs}`, BlockedUsersPage, { token: await token() });
      },
    });
  }

  return { useReport, useBlock, useUnblock, useBlockedUsers };
}
