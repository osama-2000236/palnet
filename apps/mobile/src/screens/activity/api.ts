import {
  ConnectionListItem as ConnectionListItemSchema,
  cursorPage,
  isProfileComplete,
  Job as JobSchema,
  Profile as ProfileSchema,
} from "@baydar/shared";
import type { TFunction } from "i18next";
import { z } from "zod";

import { apiFetch, apiFetchPage } from "@/lib/api";

import type { ActivityMetric, ActivityState, ActivityTask } from "./types";

const ConnectionsEnvelope = z.array(ConnectionListItemSchema);
const JobsPage = cursorPage(JobSchema);
const UnreadEnvelope = z.object({ count: z.number().int().nonnegative() });

export async function fetchActivityState(token: string): Promise<ActivityState> {
  const [profile, incoming, unread, jobs] = await Promise.all([
    apiFetch("/profiles/me", ProfileSchema, { token }),
    apiFetch("/connections?filter=INCOMING", ConnectionsEnvelope, { token }),
    apiFetch("/notifications/unread-count", UnreadEnvelope, { token }),
    apiFetchPage("/jobs?limit=3", JobsPage, { token }),
  ]);

  return {
    profile,
    incoming,
    unreadNotifications: unread.count,
    jobs: jobs.data,
  };
}

export function buildActivityMetrics(state: ActivityState, t: TFunction): ActivityMetric[] {
  return [
    {
      id: "notifications",
      label: t("activity.metrics.notifications"),
      value: state.unreadNotifications,
      route: "/(app)/notifications",
    },
    {
      id: "network",
      label: t("activity.metrics.requests"),
      value: state.incoming.length,
      route: "/(app)/network",
    },
    {
      id: "jobs",
      label: t("activity.metrics.jobs"),
      value: state.jobs.length,
      route: "/(app)/jobs",
    },
  ];
}

export function buildActivityTasks(state: ActivityState, t: TFunction): ActivityTask[] {
  const next: ActivityTask[] = [];
  if (!isProfileComplete(state.profile)) {
    next.push({
      id: "profile",
      title: t("activity.tasks.profile.title"),
      body: t("activity.tasks.profile.body"),
      route: "/(app)/me/edit",
      cta: t("activity.tasks.profile.cta"),
      tone: "warning",
    });
  }
  if (state.incoming.length > 0) {
    next.push({
      id: "network",
      title: t("activity.tasks.network.title", { count: state.incoming.length }),
      body: t("activity.tasks.network.body"),
      route: "/(app)/network",
      cta: t("activity.tasks.network.cta"),
    });
  }
  if (state.unreadNotifications > 0) {
    next.push({
      id: "notifications",
      title: t("activity.tasks.notifications.title", { count: state.unreadNotifications }),
      body: t("activity.tasks.notifications.body"),
      route: "/(app)/notifications",
      cta: t("activity.tasks.notifications.cta"),
    });
  }
  next.push({
    id: "security",
    title: t("activity.tasks.security.title"),
    body: t("activity.tasks.security.body"),
    route: "/(app)/settings/security",
    cta: t("activity.tasks.security.cta"),
  });
  return next;
}
