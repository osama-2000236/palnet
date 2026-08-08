import { OutboxKind, OutboxState, type OutboxEntry } from "./outbox";
import { isPermanentRejection, outboxRequest } from "./outbox-request";

const entry = (kind: OutboxKind, payload: unknown): OutboxEntry => ({
  id: "ob-abc123",
  kind,
  payload,
  createdAt: 0,
  attempts: 0,
  state: OutboxState.QUEUED,
  nextAttemptAt: 0,
});

describe("what an entry becomes on the wire", () => {
  it("always carries its id as the idempotency key", () => {
    // This is what makes the retry safe on the server: the same entry sent
    // twice is one write, because the key does not change between attempts.
    for (const kind of Object.values(OutboxKind)) {
      const request = outboxRequest(entry(kind, { roomId: "r", jobId: "j", workProofId: "w" }));
      expect(request.headers["Idempotency-Key"]).toBe("ob-abc123");
      expect(request.method).toBe("POST");
    }
  });

  it("routes each kind to its endpoint", () => {
    expect(outboxRequest(entry(OutboxKind.POST, { body: "نص" })).path).toBe("/posts");
    expect(outboxRequest(entry(OutboxKind.MESSAGE, { roomId: "room-1" })).path).toBe(
      "/messaging/rooms/room-1/messages",
    );
    expect(outboxRequest(entry(OutboxKind.APPLICATION, { jobId: "job-1" })).path).toBe(
      "/jobs/job-1/apply",
    );
    expect(outboxRequest(entry(OutboxKind.WORK_PROOF_CONFIRM, { workProofId: "wp-1" })).path).toBe(
      "/work-proofs/wp-1/confirm",
    );
  });

  it("moves the path parameter out of the body", () => {
    const request = outboxRequest(entry(OutboxKind.MESSAGE, { roomId: "room-1", body: "أهلا" }));
    expect(request.body).toMatchObject({ body: "أهلا", roomId: undefined });
  });

  it("defaults a message's clientMessageId to the entry id", () => {
    // The server's natural unique key outlives the 48-hour idempotency record,
    // so a message queued through a long outage is still de-duplicated.
    const auto = outboxRequest(entry(OutboxKind.MESSAGE, { roomId: "r" }));
    expect(auto.body).toMatchObject({ clientMessageId: "ob-abc123" });

    const explicit = outboxRequest(
      entry(OutboxKind.MESSAGE, { roomId: "r", clientMessageId: "mine" }),
    );
    expect(explicit.body).toMatchObject({ clientMessageId: "mine" });
  });
});

describe("which failures are worth retrying", () => {
  it("gives up on a request the server will refuse again", () => {
    expect(isPermanentRejection(400)).toBe(true);
    expect(isPermanentRejection(403)).toBe(true);
    expect(isPermanentRejection(404)).toBe(true);
    expect(isPermanentRejection(409)).toBe(true);
    expect(isPermanentRejection(422)).toBe(true);
  });

  it("keeps retrying when the answer means 'later'", () => {
    // 408 and 429 say so outright; 5xx is the server's problem, not the
    // request's; and a network failure never reaches here at all.
    expect(isPermanentRejection(408)).toBe(false);
    expect(isPermanentRejection(429)).toBe(false);
    expect(isPermanentRejection(500)).toBe(false);
    expect(isPermanentRejection(503)).toBe(false);
    expect(isPermanentRejection(200)).toBe(false);
  });
});
