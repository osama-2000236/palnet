"use client";

import {
  formatRelativeTime,
  type SearchCompanyHit,
  type SearchJobHit,
  type SearchPersonHit,
  type SearchPostHit,
} from "@baydar/shared";
import { Avatar, RetryChip, Skeleton, staggerDelay, Surface } from "@baydar/ui-web";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { ConnectButton } from "@/components/ConnectButton";

export function PeopleRow({
  item,
  index = 0,
}: {
  item: SearchPersonHit;
  index?: number;
}): JSX.Element {
  // A people result that only links to a profile is a dead end; carry the
  // connection action here so search can act like the network page.
  const [viewer, setViewer] = useState<SearchPersonHit["viewer"] | undefined>(item.viewer);
  return (
    <Surface
      as="li"
      variant="flat"
      padding="4"
      className="animate-enter-up"
      style={{ animationDelay: `${staggerDelay(index)}ms` }}
    >
      <div className="flex items-start gap-3">
        <Link
          href={`/in/${item.handle}`}
          className="flex min-w-0 flex-1 items-start gap-3 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
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
            <span dir="auto" className="text-ink font-semibold">
              {item.firstName} {item.lastName}
            </span>
            <span dir="ltr" className="text-ink-muted text-xs">
              @{item.handle}
            </span>
            {item.headline ? (
              <span dir="auto" className="text-ink-muted mt-1 text-sm">
                {item.headline}
              </span>
            ) : null}
            {item.location ? <span className="text-ink-muted text-xs">{item.location}</span> : null}
          </div>
        </Link>
        <div className="shrink-0">
          <ConnectButton targetUserId={item.userId} viewer={viewer} onChange={setViewer} />
        </div>
      </div>
    </Surface>
  );
}

export function PostRow({ item, index = 0 }: { item: SearchPostHit; index?: number }): JSX.Element {
  const locale = useLocale();
  return (
    <Surface
      as="li"
      variant="flat"
      padding="4"
      className="animate-enter-up"
      style={{ animationDelay: `${staggerDelay(index)}ms` }}
    >
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
          <span dir="auto" className="text-ink font-semibold">
            {item.authorDisplayName}
          </span>
          <span dir="auto" className="text-ink-muted text-sm">
            {item.bodyExcerpt}
          </span>
          <span className="text-ink-muted text-xs">
            {formatRelativeTime(item.createdAt, locale)}
          </span>
        </div>
      </Link>
    </Surface>
  );
}

export function JobRow({ item, index = 0 }: { item: SearchJobHit; index?: number }): JSX.Element {
  const location = [item.city, item.country].filter(Boolean).join(", ");
  return (
    <Surface
      as="li"
      variant="flat"
      padding="4"
      className="animate-enter-up"
      style={{ animationDelay: `${staggerDelay(index)}ms` }}
    >
      <Link
        href={`/jobs/${item.id}`}
        className="flex items-start gap-3 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      >
        <div className="bg-surface-sunken text-ink flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-sm font-bold">
          {item.companyName.slice(0, 1)}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span dir="auto" className="text-ink font-semibold">
            {item.title}
          </span>
          <span dir="auto" className="text-ink-muted text-sm">
            {item.companyName}
          </span>
          <span className="text-ink-muted text-xs">
            {[location, item.locationMode, item.type].filter(Boolean).join(" · ")}
          </span>
        </div>
      </Link>
    </Surface>
  );
}

export function CompanyRow({
  item,
  index = 0,
}: {
  item: SearchCompanyHit;
  index?: number;
}): JSX.Element {
  const t = useTranslations("search");
  const location = [item.city, item.country].filter(Boolean).join(", ");
  return (
    <Surface
      as="li"
      variant="flat"
      padding="4"
      className="animate-enter-up"
      style={{ animationDelay: `${staggerDelay(index)}ms` }}
    >
      <Link
        href={`/company/${item.slug}`}
        className="flex items-start gap-3 focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
      >
        <div className="bg-surface-sunken text-ink flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-sm font-bold">
          {item.logoUrl ? (
            <Image
              src={item.logoUrl}
              alt=""
              width={48}
              height={48}
              sizes="48px"
              className="h-full w-full object-cover"
            />
          ) : (
            item.name.slice(0, 1)
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-ink font-semibold">
            {item.name}
            {item.verified ? (
              <span className="text-brand-700 ms-2 text-xs font-semibold">{t("verified")}</span>
            ) : null}
          </span>
          {item.tagline ? <span className="text-ink-muted text-sm">{item.tagline}</span> : null}
          <span className="text-ink-muted text-xs">
            {[item.industry, location].filter(Boolean).join(" · ")}
          </span>
          {item.activeJobs > 0 ? (
            <span className="text-brand-700 text-xs font-semibold">
              {t("activeJobsCount", { count: item.activeJobs })}
            </span>
          ) : null}
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
