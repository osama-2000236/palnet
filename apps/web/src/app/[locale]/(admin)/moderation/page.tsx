"use client";

import { Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const Report = z.object({
  id: z.string(),
  reporterId: z.string(),
  reason: z.string(),
  details: z.string().nullable(),
  targetUserId: z.string().nullable(),
  targetPostId: z.string().nullable(),
  targetCommentId: z.string().nullable(),
  targetMessageId: z.string().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  resolvedNote: z.string().nullable(),
  createdAt: z.string().datetime(),
});
type Report = z.infer<typeof Report>;

export default function ModerationPage(): JSX.Element {
  const router = useRouter();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(null);
    try {
      setReports(await apiFetch("/admin/moderation/reports?status=open", z.array(Report), { token }));
    } catch {
      setError("Could not load moderation queue.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(reportId: string, action: "DISMISS" | "WARN" | "SUSPEND"): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    await apiFetch(`/admin/moderation/reports/${reportId}/actions`, Report, {
      method: "POST",
      token,
      body: { action },
    });
    await load();
  }

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 px-6 py-8">
      <header>
        <p className="text-brand-700 text-sm font-semibold">Admin</p>
        <h1 className="text-ink text-3xl font-bold">Moderation queue</h1>
      </header>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <section className="flex flex-col gap-3">
        {(reports ?? []).map((report) => (
          <Surface key={report.id} as="article" variant="card" padding="4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-ink text-sm font-semibold">{report.reason}</p>
                <p className="text-ink-muted text-xs">
                  {new Date(report.createdAt).toLocaleString()} · reporter {report.reporterId}
                </p>
                <p className="text-ink-muted mt-2 text-sm">
                  Target: {report.targetUserId ?? report.targetPostId ?? report.targetCommentId ?? report.targetMessageId ?? "unknown"}
                </p>
                {report.details ? <p className="text-ink mt-2 text-sm">{report.details}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void act(report.id, "DISMISS")}
                  className="border-line-hard rounded-md border px-3 py-2 text-sm"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => void act(report.id, "WARN")}
                  className="border-line-hard rounded-md border px-3 py-2 text-sm"
                >
                  Warn
                </button>
                <button
                  type="button"
                  onClick={() => void act(report.id, "SUSPEND")}
                  className="bg-danger text-ink-inverse rounded-md px-3 py-2 text-sm font-semibold"
                >
                  Suspend
                </button>
              </div>
            </div>
          </Surface>
        ))}
      </section>
      {reports?.length === 0 ? (
        <Surface variant="flat" padding="4">
          <p className="text-ink-muted text-sm">No open reports.</p>
        </Surface>
      ) : null}
    </main>
  );
}
