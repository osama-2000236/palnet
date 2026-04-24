"use client";

import {
  ChatRoom as ChatRoomSchema,
  Profile as ProfileSchema,
  type Profile,
} from "@palnet/shared";
import { Avatar, Image, ProfilePageSkeleton, Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { ConnectButton } from "@/components/ConnectButton";
import { MoreMenu } from "@/components/MoreMenu";
import { ReportDialog } from "@/components/ReportDialog";
import { apiCall, apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function ProfileRoute(): JSX.Element {
  const params = useParams<{ handle: string }>();
  const handle = params?.handle;
  const t = useTranslations("profile");
  const tMsg = useTranslations("messaging");
  const tModeration = useTranslations("moderation");
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingDm, setOpeningDm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

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
    return <ProfilePageSkeleton />;
  }

  if (error || !profile) {
    return (
      <main className="mx-auto max-w-[840px] px-6 py-10">
        <p className="text-ink-muted">{error ?? t("notFound")}</p>
      </main>
    );
  }

  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || profile.handle;

  async function blockProfile(): Promise<void> {
    if (!profile || blocking) return;
    const token = getAccessToken();
    if (!token) return;
    const ok = window.confirm(
      `${tModeration("blockConfirmTitle", { name: displayName })}\n\n${tModeration(
        "blockConfirmBody",
      )}`,
    );
    if (!ok) return;
    setBlocking(true);
    try {
      await apiCall("/blocks", {
        method: "POST",
        token,
        body: { userId: profile.userId },
      });
      router.push("/feed");
    } catch {
      window.alert(tModeration("blockErrorToast"));
    } finally {
      setBlocking(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-6 px-6 py-8">
      {profile.coverUrl ? (
        <Image
          src={profile.coverUrl}
          alt=""
          blurhash={profile.coverBlur ?? null}
          wrapperClassName="h-40 w-full rounded-lg sm:h-52"
        />
      ) : null}
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
          </div>
          {profile.viewer?.isSelf ? (
            <Link
              href="/me/edit"
              className="rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink hover:bg-ink-muted/5"
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
                    const room = await apiFetch("/messaging/rooms", ChatRoomSchema, {
                      method: "POST",
                      token,
                      body: { otherUserId: profile.userId },
                    });
                    router.push(`/messages?room=${encodeURIComponent(room.id)}`);
                  } catch {
                    // no-op; keeps profile page stable
                  } finally {
                    setOpeningDm(false);
                  }
                }}
                className="rounded-md border border-ink-muted/30 px-4 py-2 text-sm text-ink hover:bg-ink-muted/5 disabled:opacity-60"
              >
                {tMsg("newMessage")}
              </button>
              <MoreMenu
                label={tModeration("more")}
                items={[
                  {
                    key: "report",
                    label: tModeration("reportUser"),
                    onClick: () => setReportOpen(true),
                  },
                  {
                    key: "block",
                    label: tModeration("blockUser", { name: displayName }),
                    danger: true,
                    onClick: () => void blockProfile(),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Surface>
      <ReportDialog
        open={reportOpen}
        targetKind="USER"
        targetId={profile.userId}
        onClose={() => setReportOpen(false)}
      />

      {profile.about ? (
        <Surface as="section" variant="flat" padding="6">
          <h2 className="mb-2 text-xl font-semibold text-ink">{t("about")}</h2>
          <p className="whitespace-pre-wrap text-ink">{profile.about}</p>
        </Surface>
      ) : null}

      {profile.experiences.length > 0 ? (
        <Surface as="section" variant="flat" padding="6">
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
        </Surface>
      ) : null}

      {profile.educations.length > 0 ? (
        <Surface as="section" variant="flat" padding="6">
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
        </Surface>
      ) : null}

      {profile.skills.length > 0 ? (
        <Surface as="section" variant="flat" padding="6">
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
        </Surface>
      ) : null}
    </main>
  );
}
