"use client";

// CV export — a print-optimized resume rendered straight from the profile.
// The browser's print dialog IS the PDF exporter (RTL Arabic shaping comes
// free from the browser; no PDF library, no server rendering). The route
// lives outside the (app) group on purpose: no AppShell chrome to hide when
// printing — the action bar below is the only non-CV element and it carries
// print:hidden.

import { localeTag, Profile as ProfileSchema, type Profile } from "@baydar/shared";
import { Button } from "@baydar/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiFetch, getValidAccessToken } from "@/lib/api";

export default function CvPage(): JSX.Element {
  const t = useTranslations("cv");
  const locale = useLocale();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await getValidAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const me = await apiFetch("/profiles/me", ProfileSchema, { token });
        if (!cancelled) setProfile(me);
      } catch {
        if (!cancelled) router.replace("/me/edit");
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [router]);

  if (!profile) {
    return (
      <main role="status" aria-busy="true" className="mx-auto w-full max-w-[210mm] px-8 py-16">
        <p className="text-ink-muted text-sm">{t("loading")}</p>
      </main>
    );
  }

  const monthYear = new Intl.DateTimeFormat(localeTag(locale), {
    year: "numeric",
    month: "short",
  });
  const range = (start: string | null | undefined, end: string | null | undefined): string => {
    const from = start ? monthYear.format(new Date(start)) : "";
    const to = end ? monthYear.format(new Date(end)) : t("present");
    return from ? `${from} – ${to}` : "";
  };

  return (
    <main className="bg-surface text-ink mx-auto min-h-screen w-full max-w-[210mm] px-8 py-8">
      {/* Action bar — screen only. */}
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/${locale}/me`}
          className="text-ink-muted hover:text-ink text-sm focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
        >
          <span aria-hidden="true" className="inline-block rtl:rotate-180">
            ←
          </span>{" "}
          {t("back")}
        </Link>
        <Button variant="primary" size="sm" onClick={() => window.print()}>
          {t("print")}
        </Button>
      </div>

      {/* ── CV header ── */}
      <header className="border-line-hard border-b pb-4">
        <h1 className="font-sans text-3xl font-bold">
          {profile.firstName} {profile.lastName}
        </h1>
        {profile.headline ? (
          <p className="text-ink-muted mt-1 text-base">{profile.headline}</p>
        ) : null}
        <p className="text-ink-muted mt-2 text-sm" dir="auto">
          {[profile.location, `baydar.ps/in/${profile.handle}`, profile.website]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {profile.about ? (
        <CvSection title={t("about")}>
          <p className="whitespace-pre-wrap text-sm leading-6">{profile.about}</p>
        </CvSection>
      ) : null}

      {profile.experiences.length > 0 ? (
        <CvSection title={t("experience")}>
          <ul className="flex flex-col gap-4">
            {profile.experiences.map((exp) => (
              <li key={exp.id ?? `${exp.title}-${exp.startDate}`} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="text-sm font-semibold">
                    {exp.title} — {exp.companyName}
                  </h3>
                  <span className="text-ink-muted text-xs">
                    {range(exp.startDate, exp.endDate)}
                  </span>
                </div>
                {exp.location ? <p className="text-ink-muted text-xs">{exp.location}</p> : null}
                {exp.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{exp.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </CvSection>
      ) : null}

      {profile.educations.length > 0 ? (
        <CvSection title={t("education")}>
          <ul className="flex flex-col gap-3">
            {profile.educations.map((edu) => (
              <li key={edu.id ?? edu.school} className="break-inside-avoid">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="text-sm font-semibold">{edu.school}</h3>
                  <span className="text-ink-muted text-xs">
                    {range(edu.startDate, edu.endDate)}
                  </span>
                </div>
                {edu.degree || edu.fieldOfStudy ? (
                  <p className="text-ink-muted text-xs">
                    {[edu.degree, edu.fieldOfStudy].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </CvSection>
      ) : null}

      {profile.skills.length > 0 ? (
        <CvSection title={t("skills")}>
          <p className="text-sm leading-6">{profile.skills.map((s) => s.name).join(" · ")}</p>
        </CvSection>
      ) : null}
    </main>
  );
}

function CvSection({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="mt-5">
      <h2 className="text-brand-700 mb-2 text-xs font-bold uppercase tracking-[0.1em]">{title}</h2>
      {children}
    </section>
  );
}
