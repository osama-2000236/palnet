"use client";

import {
  Bookmark,
  cursorPage,
  formatRelativeTime,
  type Bookmark as BookmarkDto,
} from "@baydar/shared";
import { Alert, Button, EmptyState, Icon, Skeleton, Surface, useToast } from "@baydar/ui-web";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetchPage } from "@/lib/api";
import { getErrorCode, toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";
import { useRouter } from "next/navigation";

const SavedPage = cursorPage(Bookmark);

function buildQs(after: string | null): string {
  const qs = new URLSearchParams({ limit: "20" });
  if (after) qs.set("after", after);
  return qs.toString();
}

export default function SavedPageRoute(): JSX.Element {
  const t = useTranslations("saved");
  const tJobs = useTranslations("jobs");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<BookmarkDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setToken(session.tokens.accessToken);
  }, [router]);

  const load = useCallback(
    async (tk: string, after: string | null): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const page = await apiFetchPage(`/bookmarks?${buildQs(after)}`, SavedPage, { token: tk });
        setItems((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } catch (caught) {
        if (getErrorCode(caught) === "PROFILE_ONBOARDING_REQUIRED") {
          router.replace(`/${locale}/onboarding?return=${encodeURIComponent("/saved")}`);
          return;
        }
        setError(toErrorMessage(caught, tErr));
      } finally {
        setLoading(false);
        setFirstLoad(false);
      }
    },
    [locale, router, tErr],
  );

  useEffect(() => {
    if (!token) return;
    void load(token, null);
  }, [load, token]);

  const remove = useCallback(
    async (bookmark: BookmarkDto): Promise<void> => {
      if (!token || removingId) return;
      setRemovingId(bookmark.id);
      const before = items;
      setItems((prev) => prev.filter((item) => item.id !== bookmark.id));
      try {
        await apiCall(`/bookmarks/${bookmark.id}`, { method: "DELETE", token });
        showToast({ message: t("removedToast"), kind: "success" });
      } catch {
        setItems(before);
        showToast({ message: t("removeFailed"), kind: "error" });
      } finally {
        setRemovingId(null);
      }
    },
    [items, removingId, showToast, t, token],
  );

  return (
    <main className="mx-auto w-full max-w-[820px] px-4 py-6">
      <div className="mb-5">
        <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted mt-1 text-sm">{t("subtitle")}</p>
      </div>

      {firstLoad ? (
        <Surface variant="flat" padding="0" aria-hidden="true">
          <ul>
            {[0, 1, 2].map((item) => (
              <li key={item} className="border-line-soft border-b last:border-b-0">
                <SavedSkeleton />
              </li>
            ))}
          </ul>
        </Surface>
      ) : error ? (
        <Alert
          kind="danger"
          title={t("loadFailedTitle")}
          action={
            <Button variant="secondary" size="sm" onClick={() => token && void load(token, null)}>
              {tCommon("retry")}
            </Button>
          }
        >
          {error}
        </Alert>
      ) : items.length === 0 ? (
        <Surface variant="card" padding="0">
          <EmptyState motif="saved" title={t("emptyTitle")} body={t("emptyDesc")} />
        </Surface>
      ) : (
        <>
          <Surface variant="flat" padding="0">
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-line-soft border-b last:border-b-0">
                  <SavedRow
                    item={item}
                    metaLabel={jobMetaLabel(item, tJobs)}
                    typeLabel={t(`types.${item.type}`)}
                    savedLabel={formatRelativeTime(item.savedAt, locale)}
                    removeLabel={t("remove")}
                    removing={removingId === item.id}
                    onRemove={() => void remove(item)}
                  />
                </li>
              ))}
            </ul>
          </Surface>
          {hasMore ? (
            <div className="mt-4 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                loading={loading}
                onClick={() => token && cursor && void load(token, cursor)}
              >
                {loading ? tCommon("loading") : t("loadMore")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}

/** Job bookmarks carry raw enums; the labels live in this app's catalog. */
function jobMetaLabel(item: BookmarkDto, tJobs: (key: string) => string): string | null {
  if (!item.jobMeta) return null;
  return [
    item.jobMeta.city,
    tJobs(`locationLabels.${item.jobMeta.locationMode}`),
    tJobs(`typeLabels.${item.jobMeta.type}`),
  ]
    .filter(Boolean)
    .join(" · ");
}

function SavedRow({
  item,
  metaLabel,
  typeLabel,
  savedLabel,
  removeLabel,
  removing,
  onRemove,
}: {
  item: BookmarkDto;
  metaLabel: string | null;
  typeLabel: string;
  savedLabel: string;
  removeLabel: string;
  removing: boolean;
  onRemove: () => void;
}): JSX.Element {
  return (
    <Surface variant="row" padding="4" className="hover:bg-surface-subtle transition-colors">
      <div className="flex items-start gap-3">
        <Link
          href={item.href}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <div
            className="bg-surface-sunken text-ink-muted relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md"
            aria-hidden="true"
          >
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <Icon name={item.type === "JOB" ? "briefcase" : "bookmark"} size={20} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="bidi-plaintext text-ink truncate text-sm font-semibold">{item.title}</p>
            {item.subtitle ? (
              <p className="bidi-plaintext text-ink-muted truncate text-sm">{item.subtitle}</p>
            ) : null}
            {metaLabel ? <p className="text-ink-muted mt-1 text-sm">{metaLabel}</p> : null}
            {item.description ? (
              <p className="bidi-plaintext text-ink-muted mt-1 line-clamp-2 text-sm">
                {item.description}
              </p>
            ) : null}
            <p className="text-ink-subtle mt-2 text-xs">
              {typeLabel} · <span dir="ltr">{savedLabel}</span>
            </p>
          </div>
        </Link>
        <button
          type="button"
          className="text-ink-muted hover:bg-surface-subtle hover:text-danger target-area state-layer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={removeLabel}
          disabled={removing}
          onClick={onRemove}
        >
          <Icon name="x" size={18} />
        </button>
      </div>
    </Surface>
  );
}

function SavedSkeleton(): JSX.Element {
  return (
    <Surface variant="row" padding="4">
      <div className="flex items-start gap-3">
        <Skeleton radius="var(--radius-md)" className="h-12 w-12 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </Surface>
  );
}
