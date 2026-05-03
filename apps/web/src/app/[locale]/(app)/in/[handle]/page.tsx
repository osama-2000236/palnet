"use client";

import { ChatRoom as ChatRoomSchema, Profile as ProfileSchema, type Profile } from "@baydar/shared";
import { Avatar, Surface, Tab, Tabs } from "@baydar/ui-web";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ConnectButton } from "@/components/ConnectButton";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type ProfileTab = "about" | "exp" | "edu" | "skills" | "activity";

export default function ProfileRoute(): JSX.Element {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle;
  const t = useTranslations("profile");
  const tMsg = useTranslations("messaging");
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingDm, setOpeningDm] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("about");

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
      <main className="mx-auto max-w-[840px] px-6 py-10">
        <h1 className="text-ink sr-only">{t("title")}</h1>
        <p className="text-ink-muted">…</p>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="mx-auto max-w-[840px] px-6 py-10">
        <h1 className="text-ink sr-only">{t("title")}</h1>
        <p className="text-ink-muted">{error ?? t("notFound")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-6 px-6 py-8">
      <Surface as="section" variant="hero" padding="6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar
              user={{
                id: profile.userId,
                handle: profile.handle,
                firstName: profile.firstName,
                lastName: profile.lastName,
                avatarUrl: profile.avatarUrl ?? null,
              }}
              size="xl"
              ring
            />
            <div className="flex flex-col">
              <h1 className="text-ink text-3xl font-bold">
                {profile.firstName} {profile.lastName}
              </h1>
              {profile.headline ? <p className="text-ink-muted">{profile.headline}</p> : null}
              {profile.location ? (
                <p className="text-ink-muted text-sm">{profile.location}</p>
              ) : null}
              <p className="text-ink-muted text-xs">/in/{profile.handle}</p>
            </div>
          </div>
          {profile.viewer?.isSelf ? (
            <Link
              href="/me/edit"
              className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 rounded-md border px-4 py-2 text-sm"
            >
              {t("edit")}
            </Link>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <ConnectButton
                targetUserId={profile.userId}
                viewer={profile.viewer}
                onChange={(next) => setProfile({ ...profile, viewer: next })}
              />
              <button
                type="button"
                disabled={openingDm}
                onClick={async () => {
                  const token = getAccessToken();
                  if (!token) return;
                  setOpeningDm(true);
                  try {
                    await apiFetch("/messaging/rooms", ChatRoomSchema, {
                      method: "POST",
                      token,
                      body: { otherUserId: profile.userId },
                    });
                    router.push("/messages");
                  } catch {
                    // no-op; keeps profile page stable
                  } finally {
                    setOpeningDm(false);
                  }
                }}
                className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 rounded-md border px-4 py-2 text-sm disabled:opacity-60"
              >
                {tMsg("newMessage")}
              </button>
            </div>
          )}
        </div>
      </Surface>

      <Surface variant="flat" padding="0" className="px-5">
        <Tabs
          value={tab}
          onChange={(next) => setTab(next as ProfileTab)}
          label={t("sectionsLabel")}
        >
          <Tab value="about">{t("about")}</Tab>
          <Tab value="exp" count={profile.experiences.length}>
            {t("experience")}
          </Tab>
          <Tab value="edu" count={profile.educations.length}>
            {t("education")}
          </Tab>
          <Tab value="skills" count={profile.skills.length}>
            {t("skills")}
          </Tab>
          <Tab value="activity">{t("posts")}</Tab>
        </Tabs>
      </Surface>

      {tab === "about" ? (
        profile.about ? (
          <Surface as="section" variant="flat" padding="6">
            <h2 className="text-ink mb-2 text-xl font-semibold">{t("about")}</h2>
            <p className="text-ink whitespace-pre-wrap">{profile.about}</p>
          </Surface>
        ) : (
          <Surface variant="tinted" padding="6">
            <p className="text-ink-muted text-center text-sm">{t("aboutEmpty")}</p>
          </Surface>
        )
      ) : null}

      {tab === "exp" ? (
        <Surface as="section" variant="card" padding="0">
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <h2 className="text-ink text-xl font-semibold">{t("experience")}</h2>
          </div>
          {profile.experiences.length === 0 ? (
            <p className="text-ink-muted px-5 pb-4 text-sm">{t("expEmpty")}</p>
          ) : (
            <ul className="flex flex-col">
              {profile.experiences.map((e, i) => (
                <li key={e.id ?? i} className="border-line-soft flex gap-4 border-t px-5 py-4">
                  <div className="bg-surface-sunken text-ink-muted flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                    {(e.companyName[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-ink font-semibold">{e.title}</p>
                    <p className="text-ink-muted text-sm">{e.companyName}</p>
                    {e.description ? (
                      <p className="text-ink mt-1 text-sm">{e.description}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      ) : null}

      {tab === "edu" ? (
        <Surface as="section" variant="flat" padding="6">
          <h2 className="text-ink mb-3 text-xl font-semibold">{t("education")}</h2>
          {profile.educations.length === 0 ? (
            <p className="text-ink-muted text-sm">{t("eduEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {profile.educations.map((e, i) => (
                <li key={e.id ?? i}>
                  <p className="text-ink font-semibold">{e.school}</p>
                  {e.degree ? (
                    <p className="text-ink-muted text-sm">
                      {e.degree}
                      {e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Surface>
      ) : null}

      {tab === "skills" ? (
        <Surface as="section" variant="flat" padding="6">
          <h2 className="text-ink mb-3 text-xl font-semibold">{t("skills")}</h2>
          {profile.skills.length === 0 ? (
            <p className="text-ink-muted text-sm">{t("skillsEmpty")}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {profile.skills.map((s) => (
                <li
                  key={s.id}
                  className="border-ink-muted/30 text-ink rounded-full border px-3 py-1 text-sm"
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </Surface>
      ) : null}

      {tab === "activity" ? (
        <Surface as="section" variant="flat" padding="6">
          <h2 className="text-ink mb-4 text-xl font-semibold">{t("posts")}</h2>
          <p className="text-ink-muted text-sm">{t("postsEmpty")}</p>
        </Surface>
      ) : null}
    </main>
  );
}
