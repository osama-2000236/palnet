"use client";

import { CompanySummary } from "@baydar/shared";
import { Surface } from "@baydar/ui-web";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace(`/${locale}/login`);
      return;
    }
    (async () => {
      try {
        const list = await apiFetch("/companies/me", CompanyList, {
          token: session.tokens.accessToken,
        });
        setCompanies(list);
      } catch (e) {
        setError(toErrorMessage(e, tErr));
      }
    })();
  }, [router, locale, tErr]);

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
          <p className="text-ink-muted text-sm">{t("subtitle")}</p>
        </div>
        <Link
          href={`/${locale}/employer/new`}
          className="bg-brand-500 hover:bg-brand-600 inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold text-white"
        >
          {t("createCompany")}
        </Link>
      </header>

      {error ? (
        <Surface variant="card" padding="4">
          <p className="text-status-danger text-sm">{error}</p>
        </Surface>
      ) : null}

      {companies === null && !error ? (
        <p className="text-ink-muted text-sm">{tCommon("loading")}</p>
      ) : null}

      {companies && companies.length === 0 ? (
        <Surface variant="card" padding="4">
          <p className="text-ink text-sm">{t("empty")}</p>
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
