"use client";

import {
  BlockedUserDTO,
  ReportReason,
  cursorPage,
  type BlockBody,
  type ReportBody,
} from "@baydar/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiCall, apiFetch, apiFetchPage, getValidAccessToken } from "@/lib/api";

export type ReportTarget =
  | { kind: "user"; id: string }
  | { kind: "post"; id: string }
  | { kind: "comment"; id: string }
  | { kind: "message"; id: string };

export interface ReportInput {
  target: ReportTarget;
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

async function token(): Promise<string> {
  const value = await getValidAccessToken();
  if (!value) throw new Error("AUTH_UNAUTHORIZED");
  return value;
}

function useInvalidateSafetySurfaces(): () => void {
  const queryClient = useQueryClient();
  return () => {
    for (const queryKey of INVALIDATE_KEYS) {
      void queryClient.invalidateQueries({ queryKey: [...queryKey] });
    }
  };
}

export function useReport() {
  return useMutation({
    mutationFn: async (input: ReportInput) =>
      apiFetch("/reports", ReportResult, {
        method: "POST",
        token: await token(),
        body: reportBody(input),
      }),
  });
}

export function useBlock() {
  const invalidate = useInvalidateSafetySurfaces();
  return useMutation({
    mutationFn: async (body: BlockBody) =>
      apiFetch("/blocks", BlockResult, { method: "POST", token: await token(), body }),
    onSuccess: invalidate,
  });
}

export function useUnblock() {
  const invalidate = useInvalidateSafetySurfaces();
  return useMutation({
    mutationFn: async (blockedUserId: string) =>
      apiCall(`/blocks/${blockedUserId}`, { method: "DELETE", token: await token() }),
    onSuccess: invalidate,
  });
}

export function useBlockedUsers(after?: string | null, limit = 20) {
  return useQuery({
    queryKey: [...safetyQueryKeys.blockedList, { after: after ?? null, limit }],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (after) qs.set("after", after);
      return apiFetchPage(`/blocks?${qs.toString()}`, BlockedUsersPage, { token: await token() });
    },
  });
}
