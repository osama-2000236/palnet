"use client";

import { formatRelativeTime, NotificationType, type Notification } from "@baydar/shared";
import { Avatar, Button, EmptyState, RecordCardSkeleton, Skeleton, Surface } from "@baydar/ui-web";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

export function NotificationsList({
  items,
  dismissing,
  onDismiss,
}: {
  items: Notification[];
  dismissing: boolean;
  onDismiss: (item: Notification) => void;
}): JSX.Element {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <NotificationRow item={item} dismissing={dismissing} onDismiss={onDismiss} />
        </li>
      ))}
    </ul>
  );
}

export function NotificationsSkeleton(): JSX.Element {
  return (
    <ul className="flex flex-col gap-2" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <li key={i}>
          <NotificationRowSkeleton />
        </li>
      ))}
    </ul>
  );
}

export function NotificationsErrorState({
  title,
  body,
  retryLabel,
  loading,
  onRetry,
}: {
  title: string;
  body: string;
  retryLabel: string;
  loading: boolean;
  onRetry: () => void;
}): JSX.Element {
  return (
    <Surface variant="card" padding="0">
      <EmptyState motif="notifications" title={title} body={body} />
      <div className="border-line-soft flex justify-center border-t px-6 pb-5 pt-4">
        <Button variant="secondary" size="sm" loading={loading} onClick={onRetry}>
          {retryLabel}
        </Button>
      </div>
    </Surface>
  );
}

export function NotificationsLoadMore({
  loading,
  label,
  loadingLabel,
  onClick,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={loading}
      variant="secondary"
      className="self-center"
    >
      {loading ? loadingLabel : label}
    </Button>
  );
}

function NotificationRow({
  item,
  dismissing,
  onDismiss,
}: {
  item: Notification;
  dismissing: boolean;
  onDismiss: (item: Notification) => void;
}): JSX.Element {
  const t = useTranslations("notifications");
  const tTemplates = useTranslations("notifications.templates");
  const locale = useLocale();
  const actor = item.actor;
  const actorName = actor ? `${actor.firstName} ${actor.lastName}`.trim() || actor.handle : "";
  const data = item.data as { jobTitle?: string } | null;
  const body = tTemplates(templateKeyFor(item.type), {
    actor: actorName,
    jobTitle: data?.jobTitle ?? "",
  });
  const unread = item.readAt === null;
  const href = hrefFor(item);

  const content = (
    <>
      <Avatar user={actor ?? { handle: "system" }} size="md" />
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-ink text-sm">{body}</p>
        <p className="text-ink-muted text-xs">{formatRelativeTime(item.createdAt, locale)}</p>
      </div>
      {unread ? (
        <span aria-hidden="true" className="bg-accent-600 mt-1 h-2 w-2 flex-none rounded-full" />
      ) : null}
    </>
  );

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 transition ${
        unread ? "border-brand-500/30 bg-brand-50" : "border-ink-muted/20 bg-surface"
      }`}
    >
      {href ? (
        <Link
          href={href}
          className="focus-visible:outline-hidden flex min-w-0 flex-1 items-start gap-3 rounded-sm hover:opacity-90 focus-visible:[box-shadow:var(--focus-ring)]"
        >
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
      )}
      <button
        type="button"
        className="target-area state-layer text-ink-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-hidden flex h-9 w-9 flex-none items-center justify-center rounded-md focus-visible:[box-shadow:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={t("dismiss.aria")}
        title={t("dismiss.action")}
        disabled={dismissing}
        onClick={() => onDismiss(item)}
      >
        <Trash2 aria-hidden="true" size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

function NotificationRowSkeleton(): JSX.Element {
  return (
    <RecordCardSkeleton
      variant="card"
      density="compact"
      meta={false}
      leading={<Skeleton kind="circle" className="h-10 w-10 shrink-0" />}
    />
  );
}

function templateKeyFor(type: Notification["type"]): string {
  return type;
}

function hrefFor(notification: Notification): string | null {
  if (notification.type === NotificationType.MESSAGE_RECEIVED) {
    const data = notification.data as { roomId?: string } | null;
    if (data?.roomId) return `/messages?room=${encodeURIComponent(data.roomId)}`;
    return "/messages";
  }
  if (
    notification.type === NotificationType.CONNECTION_REQUEST ||
    notification.type === NotificationType.CONNECTION_ACCEPTED
  ) {
    return "/network";
  }
  if (
    notification.type === NotificationType.POST_REACTION ||
    notification.type === NotificationType.POST_COMMENT ||
    notification.type === NotificationType.POST_MENTION
  ) {
    if (notification.postId) return `/feed#post-${notification.postId}`;
    return "/feed";
  }
  if (
    (notification.type === NotificationType.JOB_ALERT ||
      notification.type === NotificationType.JOB_APPLICATION_UPDATE) &&
    notification.jobId
  ) {
    return `/jobs/${notification.jobId}`;
  }
  if (notification.type === NotificationType.PROFILE_VIEW && notification.actor?.handle) {
    return `/in/${notification.actor.handle}`;
  }
  return null;
}
