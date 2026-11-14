"use client";

import type { SearchJobHit, SearchPersonHit, SearchPostHit } from "@baydar/shared";
import { Avatar, RetryChip, Skeleton, Surface } from "@baydar/ui-web";
import Link from "next/link";

export function PeopleRow({ item }: { item: SearchPersonHit }): JSX.Element {
  return (
    <Surface as="li" variant="flat" padding="4">
      <Link
        href={`/in/${item.handle}`}
        className="flex items-start gap-3 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      >
        <Avatar
          user={{
            id: item.userId,
            handle: item.handle,
            firstName: item.firstName,
            lastName: item.lastName,
            avatarUrl: item.avatarUrl,
          }}
          size="lg"
        />
        <div className="flex min-w-0 flex-col">
          <span className="text-ink font-semibold">
            {item.firstName} {item.lastName}
          </span>
          <span className="text-ink-muted text-xs">/in/{item.handle}</span>
          {item.headline ? (
            <span className="text-ink-muted mt-1 text-sm">{item.headline}</span>
          ) : null}
          {item.location ? <span className="text-ink-muted text-xs">{item.location}</span> : null}
        </div>
      </Link>
    </Surface>
  );
}

export function PostRow({ item }: { item: SearchPostHit }): JSX.Element {
  return (
    <Surface as="li" variant="flat" padding="4">
      <Link
        href={`/in/${item.authorHandle}`}
        className="flex items-start gap-3 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      >
        <Avatar
          user={{
            id: item.authorId,
            handle: item.authorHandle,
            firstName: item.authorDisplayName,
            lastName: "",
            avatarUrl: item.authorAvatarUrl,
          }}
          size="md"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-ink font-semibold">{item.authorDisplayName}</span>
          <span className="text-ink-muted text-sm">{item.bodyExcerpt}</span>
          <span className="text-ink-muted text-xs">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>
      </Link>
    </Surface>
  );
}

export function JobRow({ item }: { item: SearchJobHit }): JSX.Element {
  const location = [item.city, item.country].filter(Boolean).join(", ");
  return (
    <Surface as="li" variant="flat" padding="4">
      <Link
        href={`/jobs/${item.id}`}
        className="flex items-start gap-3 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      >
        <div className="bg-surface-sunken text-ink flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-sm font-bold">
          {item.companyName.slice(0, 1)}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-ink font-semibold">{item.title}</span>
          <span className="text-ink-muted text-sm">{item.companyName}</span>
          <span className="text-ink-muted text-xs">
            {[location, item.locationMode, item.type].filter(Boolean).join(" · ")}
          </span>
        </div>
      </Link>
    </Surface>
  );
}

export function SearchErrorState({
  title,
  body,
  retryLabel,
  onRetry,
  loading,
}: {
  title: string;
  body: string;
  retryLabel: string;
  onRetry: () => void;
  loading: boolean;
}): JSX.Element {
  return (
    <Surface variant="tinted" padding="6" className="flex flex-col items-start gap-2">
      <h2 className="text-ink text-sm font-semibold">{title}</h2>
      <p className="text-ink-muted text-sm">{body}</p>
      <RetryChip onRetry={onRetry} label={retryLabel} loading={loading} />
    </Surface>
  );
}

export function SearchHitSkeleton(): JSX.Element {
  return (
    <div className="border-ink-muted/20 bg-surface flex items-start gap-3 rounded-md border p-4">
      <Skeleton kind="circle" className="h-14 w-14" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
