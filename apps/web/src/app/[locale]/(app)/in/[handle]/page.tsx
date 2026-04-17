"use client";

import { Profile as ProfileSchema, type Profile } from "@palnet/shared";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ConnectButton } from "@/components/ConnectButton";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function ProfileRoute(): JSX.Element {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle;
  const t = useTranslations("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!handle) return;
    const token = getAccessToken() ?? undefined;
    setLoading(true);
    setError(null);
    apiFetch(`/profiles/${handle}`, ProfileSchema, { token })
      .then((p) => setProfile(p))
      .catch(() => setError(t("notFound")))
      .finally(() => setLoading(false));
  }, [handle, t]);

  if (loading) {
    return (
      <main className="mx-auto max-w-[840px] px-6 py-10 text-ink-muted">
        …
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="mx-auto max-w-[840px] px-6 py-10">
        <p className="text-ink-muted">{error ?? t("notFound")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-6 px-6 py-8">
      <section className="rounded-md border border-ink-muted/20 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-ink">
              {profile.firstName} {profile.lastName}
            </h1>
            {profile.headline ? (
              <p className="text-ink-muted">{profile.headline}</p>
            ) : null}
            {profile.location ? (
              <p className="text-sm text-ink-muted">{profile.location}</p>
            ) : null}
            <p className="text-xs text-ink-muted">/in/{profile.handle}</p>
          </div>
          {profile.viewer?.isSelf ? (
            <Link
              href="/me/edit"
              className="rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink hover:bg-ink-muted/5"
            >
              {t("edit")}
            </Link>
          ) : (
            <ConnectButton
              targetUserId={profile.userId}
              viewer={profile.viewer}
              onChange={(next) => setProfile({ ...profile, viewer: next })}
            />
          )}
        </div>
      </section>

      {profile.about ? (
        <section className="rounded-md border border-ink-muted/20 bg-white p-6">
          <h2 className="mb-2 text-xl font-semibold text-ink">{t("about")}</h2>
          <p className="whitespace-pre-wrap text-ink">{profile.about}</p>
        </section>
      ) : null}

      {profile.experiences.length > 0 ? (
        <section className="rounded-md border border-ink-muted/20 bg-white p-6">
          <h2 className="mb-3 text-xl font-semibold text-ink">
            {t("experience")}
          </h2>
          <ul className="flex flex-col gap-4">
            {profile.experiences.map((e) => (
              <li key={e.id ?? `${e.companyName}-${e.startDate}`}>
                <p className="font-semibold text-ink">{e.title}</p>
                <p className="text-sm text-ink-muted">{e.companyName}</p>
                {e.description ? (
                  <p className="mt-1 text-sm text-ink">{e.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.educations.length > 0 ? (
        <section className="rounded-md border border-ink-muted/20 bg-white p-6">
          <h2 className="mb-3 text-xl font-semibold text-ink">
            {t("education")}
          </h2>
          <ul className="flex flex-col gap-4">
            {profile.educations.map((e) => (
              <li key={e.id ?? e.school}>
                <p className="font-semibold text-ink">{e.school}</p>
                {e.degree ? (
                  <p className="text-sm text-ink-muted">
                    {e.degree}
                    {e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.skills.length > 0 ? (
        <section className="rounded-md border border-ink-muted/20 bg-white p-6">
          <h2 className="mb-3 text-xl font-semibold text-ink">{t("skills")}</h2>
          <ul className="flex flex-wrap gap-2">
            {profile.skills.map((s) => (
              <li
                key={s.id}
                className="rounded-full border border-ink-muted/30 px-3 py-1 text-sm text-ink"
              >
                {s.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
