import path from "node:path";

export const qaRunStatePath = path.join(process.cwd(), "test-results", "qa-run.json");

export interface QaRunState {
  runId: string;
}

export function createQaRunId(): string {
  return `qa-${Date.now().toString(36)}`;
}
