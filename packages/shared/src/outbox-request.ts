// What an outbox entry becomes on the wire.
//
// Split from the queue itself because it changes for a different reason: this
// file moves when a route moves, `outbox.ts` when the retry rules do. Both
// live in `@baydar/shared` so the two platforms cannot end up queueing the
// same action against different endpoints — the exact drift the
// one-implementation rule exists to prevent.

import { OutboxKind, type OutboxEntry } from "./outbox";

/**
 * The request one entry becomes.
 *
 * Here rather than in each app's sender so the two platforms cannot end up
 * queueing the same action against different routes — the exact drift the
 * one-implementation rule exists to prevent. `id` travels as the idempotency
 * key, which is what makes a retry safe on the server side.
 */
export interface OutboxRequest {
  method: "POST";
  path: string;
  body: unknown;
  headers: Record<string, string>;
}

export function outboxRequest(entry: OutboxEntry): OutboxRequest {
  const headers = { "Idempotency-Key": entry.id };
  const payload = entry.payload as Record<string, unknown>;

  switch (entry.kind) {
    case OutboxKind.POST:
      return { method: "POST", path: "/posts", body: payload, headers };
    case OutboxKind.MESSAGE:
      return {
        method: "POST",
        path: `/messaging/rooms/${String(payload.roomId)}/messages`,
        // `clientMessageId` defaults to the entry id so the server's natural
        // unique key does the work even past the 48-hour record TTL.
        body: {
          ...payload,
          roomId: undefined,
          clientMessageId: payload.clientMessageId ?? entry.id,
        },
        headers,
      };
    case OutboxKind.APPLICATION:
      return {
        method: "POST",
        path: `/jobs/${String(payload.jobId)}/apply`,
        body: { ...payload, jobId: undefined },
        headers,
      };
    case OutboxKind.WORK_PROOF_CONFIRM:
      return {
        method: "POST",
        path: `/work-proofs/${String(payload.workProofId)}/confirm`,
        body: { ...payload, workProofId: undefined },
        headers,
      };
  }
}

/**
 * Whether a status means "do not bother trying again".
 *
 * A closed job or a malformed body will refuse the eighth attempt for the same
 * reason it refused the first, and spending seven more requests on 2G to learn
 * that is the opposite of the point. 408 and 429 are excluded because both
 * explicitly mean "later", and 5xx is the server's problem, not the request's.
 */
export function isPermanentRejection(status: number): boolean {
  if (status === 408 || status === 429) return false;
  return status >= 400 && status < 500;
}
