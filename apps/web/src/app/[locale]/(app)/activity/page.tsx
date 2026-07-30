"use client";

import {
  ConnectionListItem as ConnectionListItemSchema,
  cursorPage,
  formatNumber,
  isProfileComplete,
  Job as JobSchema,
  Profile as ProfileSchema,
  type ConnectionListItem,
  type Job,
  type Profile,
  jobSource,
} from "@baydar/shared";
import { EmptyState, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { getAccessToken, readSession } from "@/lib/session";
import {
  ActivityError,
  ActivityMetrics,
  ActivitySection,
  ActivitySkeleton,
  ActivityTaskList,
  type ActivityMetric,
  type ActivityTask,
} from "./_components/ActivityParts";

const ConnectionsEnvelope = z.array(ConnectionListItemSchema);
const JobsPage = cursorPage(JobSchema);
const UnreadEnvelope = z.object({ count: z.number().int().nonnegative() });

interface ActivityState {
  profile: Profile;
  incoming: ConnectionListItem[];
  jobs: Job[];
  unreadNotifications: number;
}

export default function ActivityRoute(): JSX.Element {
  const locale = useLocale();
  const t = useTranslations("activity");
  const common = useTranslations("common");
  const router = useRouter();
  const [state, setState] = useState<ActivityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setLoading(true);
    setError(false);
    try {
      const [profile, incoming, unread, jobs] = await Promise.all([
        apiFetch("/profiles/me", ProfileSchema, { token }),
        apiFetch("/connections?filter=INCOMING", ConnectionsEnvelope, { token }),
        apiFetch("/notifications/unread-count", UnreadEnvelope, { token }),
        apiFetchPage("/jobs?limit=3", JobsPage, { token }),
      ]);
      setState({
        profile,
        incoming,
        unreadNotifications: unread.count,
        jobs: jobs.data,
      });
    } catch {
      setError(true);
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo<ActivityMetric[]>(() => {
    if (!state) return [];
    return [
      {
        label: t("metrics.notifications"),
        value: formatNumber(state.unreadNotifications, locale),
        count: state.unreadNotifications,
        href: "/notifications",
      },
      {
        label: t("metrics.requests"),
        value: formatNumber(state.incoming.length, locale),
        count: state.incoming.length,
        href: "/network",
      },
      {
        label: t("metrics.jobs"),
        value: formatNumber(state.jobs.length, locale),
        count: state.jobs.length,
        href: "/jobs",
      },
    ];
  }, [locale, state, t]);

  const tasks = useMemo<ActivityTask[]>(() => {
    if (!state) return [];
    const next: ActivityTask[] = [];
    if (!isProfileComplete(state.profile)) {
      next.push({
        id: "profile",
        title: t("tasks.profile.title"),
        body: t("tasks.profile.body"),
        href: "/me/edit",
        cta: t("tasks.profile.cta"),
        tone: "warning",
      });
    }
    if (state.incoming.length > 0) {
      next.push({
        id: "network",
        title: t("tasks.network.title", { count: state.incoming.length }),
        body: t("tasks.network.body"),
        href: "/network",
        cta: t("tasks.network.cta"),
      });
    }
    if (state.unreadNotifications > 0) {
      next.push({
        id: "notifications",
        title: t("tasks.notifications.title", { count: state.unreadNotifications }),
        body: t("tasks.notifications.body"),
        href: "/notifications",
        cta: t("tasks.notifications.cta"),
      });
    }
    next.push({
      id: "security",
      title: t("tasks.security.title"),
      body: t("tasks.security.body"),
      href: "/settings/security",
      cta: t("tasks.security.cta"),
    });
    return next;
  }, [state, t]);

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-5 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted mt-2 max-w-2xl text-sm">{t("subtitle")}</p>
      </header>

      {loading ? (
        <ActivitySkeleton />
      ) : error || !state ? (
        <ActivityError
          title={t("errorTitle")}
          body={t("errorBody")}
          retryLabel={common("retry")}
          onRetry={() => void load()}
        />
      ) : (
        <>
          <ActivityMetrics metrics={metrics} />
          <ActivityTaskList title={t("tasks.title")} empty={t("tasks.empty")} tasks={tasks} />
          <ActivitySection title={t("jobs.title")}>
            {state.jobs.length === 0 ? (
              <Surface variant="card" padding="0">
                <EmptyState motif="jobs" title={t("jobs.empty")} />
              </Surface>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-3">
                {state.jobs.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="focus-visible:outline-hidden block h-full rounded-md focus-visible:[box-shadow:var(--focus-ring)]"
                    >
                      <Surface variant="flat" padding="4" className="h-full">
                        <p className="text-ink text-sm font-semibold">{job.title}</p>
                        <p className="text-ink-muted mt-1 text-sm">{jobSource(job).name}</p>
                      </Surface>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </ActivitySection>
        </>
      )}
    </main>
  );
}
