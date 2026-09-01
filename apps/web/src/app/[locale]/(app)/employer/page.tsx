"use client";

import { CompanySummary } from "@baydar/shared";
import { Alert, EmptyState, RecordCardSkeleton, Surface } from "@baydar/ui-web";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { readSession } from "@/lib/session";

const CompanyList = z.array(CompanySummary);

export default function EmployerHomePage(): JSX.Element {
  const t = useTranslations("employer");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const locale = useLocale();

  const [companies, setCompanies] = useState<CompanySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tErrRef = useRef(tErr);
  useEffect(() => {
    tErrRef.current = tErr;
  }, [tErr]);

  const load = useCallback(async (): Promise<void> => {
    const session = readSession();
    if (!session) {
      router.replace(`/${locale}/login`);
      return;
    }
    setError(null);
    try {
      const list = await apiFetch("/companies/me", CompanyList, {
        token: session.tokens.accessToken,
      });
      setCompanies(list);
    } catch (e) {
      setError(toErrorMessage(e, tErrRef.current));
    }
  }, [router, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
          <p className="text-ink-muted text-sm">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${locale}/employer/new`}
          className="bg-brand-600 text-ink-inverse hover:bg-brand-700 focus-visible:outline-hidden inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold focus-visible:[box-shadow:var(--focus-ring)]"
        >
          {t("createCompany")}
        </Link>
      </header>

      {/* Was a bare red sentence in a card: severity with no icon and no way
          to try again, on a screen whose whole content is the failed request. */}
      {error ? (
        <Alert kind="danger" body={error} cta={tCommon("retry")} onAction={() => void load()} />
      ) : null}

      {/* A skeleton, not a "loading…" line: every list in the product draws the
          shape it is about to fill, and this screen's whole content is the
          list. Same split #158 and #166 made elsewhere. */}
      {companies === null && !error ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <RecordCardSkeleton variant="card" />
          <RecordCardSkeleton variant="card" />
        </div>
      ) : null}

      {companies && companies.length === 0 ? (
        <Surface variant="card" padding="0">
          <EmptyState
            motif="jobs"
            title={t("empty")}
            body={t("emptyDesc")}
            cta={t("createCompany")}
            onAction={() => router.push(`/${locale}/employer/new`)}
          />
        </Surface>
      ) : null}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(companies ?? []).map((c) => (
          <li key={c.id}>
            <Link href={`/${locale}/employer/${c.slug}`} className="block">
              <Surface variant="card" padding="4">
                <div className="flex items-center gap-3">
                  {c.logoUrl ? (
                    <Image
                      src={c.logoUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="bg-surface-muted h-12 w-12 rounded-md object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="bg-surface-muted h-12 w-12 rounded-md" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-ink truncate text-base font-semibold">{c.name}</h2>
                    <p className="text-ink-muted text-xs">
                      {t(`viewerRole.${c.viewerRole ?? "EDITOR"}`)}
                      {c.verified ? " · ✓" : ""}
                    </p>
                  </div>
                </div>
              </Surface>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
