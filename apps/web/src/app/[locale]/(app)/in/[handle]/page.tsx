"use client";

import { ChatRoom as ChatRoomSchema, Profile as ProfileSchema, type Profile } from "@baydar/shared";
import {
  Badge,
  BlockButton,
  Button,
  ProfileHeader,
  ReportDialog,
  Surface,
  useToast,
  type BlockButtonLabels,
} from "@baydar/ui-web";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { ConnectButton } from "@/components/ConnectButton";
import { ApiRequestError, apiFetch } from "@/lib/api";
import { useBlock, useReport, useUnblock } from "@/lib/api/safety";
import { toErrorMessage } from "@/lib/error-message";
import { getAccessToken } from "@/lib/session";
import { ProfileTabsContent, type ProfileTab } from "./_components/ProfileTabsContent";
import { useReportLabels } from "@/lib/report-labels";

export default function ProfileRoute(): JSX.Element {
  const params = useParams<{ locale?: string; handle: string }>();
  const locale = params?.locale ?? "ar-PS";
  const handle = params?.handle;
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const tMsg = useTranslations("messaging");
  const tSafety = useTranslations("safety");
  const { showToast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openingDm, setOpeningDm] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("about");
  const [reportOpen, setReportOpen] = useState(false);
  const block = useBlock();
  const unblock = useUnblock();
  const report = useReport();
  const reportLabels = useReportLabels();

  const loadProfile = useCallback((): void => {
    if (!handle) return;
    const token = getAccessToken() ?? undefined;
    setLoading(true);
    setError(null);
    setMissing(false);
    apiFetch(`/profiles/${handle}`, ProfileSchema, { token })
      .then((p) => setProfile(p))
      .catch((caught: unknown) => {
        if (caught instanceof ApiRequestError && caught.status === 404) {
          setMissing(true);
          return;
        }
        setError(toErrorMessage(caught, tErr));
      })
      .finally(() => setLoading(false));
  }, [handle, tErr]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (missing) {
    notFound();
  }

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
      <main className="mx-auto flex max-w-[840px] flex-col px-6 py-10">
        <Surface
          variant="tinted"
          padding="6"
          className="flex flex-col items-center gap-3 text-center"
        >
          <h1 className="text-ink sr-only">{t("title")}</h1>
          <p className="text-ink-muted text-sm">{error ?? tErr("fallback")}</p>
          <Button variant="secondary" size="sm" onClick={loadProfile}>
            {tCommon("retry")}
          </Button>
        </Surface>
      </main>
    );
  }

  const isBlocked = profile.viewer?.connection?.status === "BLOCKED";
  const blockLabels: BlockButtonLabels = isBlocked
    ? {
        block: tSafety("block.button"),
        unblock: tSafety("unblock.button"),
        confirmTitle: tSafety("unblock.confirm.title"),
        confirmBody: tSafety("unblock.confirm.body"),
        confirmCta: tSafety("unblock.confirm.cta"),
        cancel: tCommon("cancel"),
      }
    : {
        block: tSafety("block.button"),
        unblock: tSafety("unblock.button"),
        confirmTitle: tSafety("block.confirm.title"),
        confirmBody: tSafety("block.confirm.body"),
        confirmCta: tSafety("block.confirm.cta"),
        cancel: tCommon("cancel"),
      };

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-6 px-6 py-8">
      <ProfileHeader
        user={{
          id: profile.userId,
          handle: profile.handle,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl ?? null,
        }}
        fullName={`${profile.firstName} ${profile.lastName}`}
        headline={profile.headline}
        meta={
          <>
            {profile.location ? `${profile.location} · ` : ""}
            <span dir="ltr">@{profile.handle}</span>
          </>
        }
        badges={
          <>
            {profile.openToWork ? (
              <Badge tone="brand" dot srLabel={t("openToWork")}>
                {t("openToWork")}
              </Badge>
            ) : null}
            {profile.hiring ? (
              <Badge tone="accent" dot srLabel={t("hiring")}>
                {t("hiring")}
              </Badge>
            ) : null}
          </>
        }
        actions={
          profile.viewer?.isSelf ? (
            <>
              <Link
                href="/me/edit"
                className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 focus-visible:outline-hidden rounded-md border px-4 py-2 text-sm focus-visible:[box-shadow:var(--focus-ring)]"
              >
                {t("edit")}
              </Link>
              <Link
                href="/cv"
                className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 focus-visible:outline-hidden rounded-md border px-4 py-2 text-sm focus-visible:[box-shadow:var(--focus-ring)]"
              >
                {t("cvLink")}
              </Link>
            </>
          ) : (
            <>
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
                className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 focus-visible:outline-hidden rounded-md border px-4 py-2 text-sm focus-visible:[box-shadow:var(--focus-ring)] disabled:opacity-60"
              >
                {tMsg("newMessage")}
              </button>
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="border-line-hard text-ink hover:bg-surface-subtle focus-visible:outline-hidden rounded-md border px-4 py-2 text-sm focus-visible:[box-shadow:var(--focus-ring)]"
              >
                {tSafety("report.action")}
              </button>
              <BlockButton
                userId={profile.userId}
                isBlocked={isBlocked}
                variant={isBlocked ? "unblock" : "block"}
                loading={block.isPending || unblock.isPending}
                labels={blockLabels}
                onChange={(nextBlocked, userId) => {
                  if (nextBlocked) {
                    block.mutate(
                      { blockedUserId: userId },
                      {
                        onSuccess: () => {
                          showToast({ message: tSafety("block.success"), kind: "success" });
                          router.replace(`/${locale}/feed`);
                        },
                        onError: () =>
                          showToast({ message: tSafety("block.error"), kind: "error" }),
                      },
                    );
                  } else {
                    unblock.mutate(userId, {
                      onSuccess: () => {
                        setProfile({
                          ...profile,
                          viewer: { isSelf: false, connection: null },
                        });
                        showToast({ message: tSafety("unblock.success"), kind: "success" });
                      },
                      onError: () =>
                        showToast({ message: tSafety("unblock.error"), kind: "error" }),
                    });
                  }
                }}
              />
            </>
          )
        }
      />

      <ProfileTabsContent profile={profile} tab={tab} onTabChange={setTab} />
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        target={{ kind: "user", id: profile.userId }}
        labels={reportLabels}
        submitting={report.isPending}
        onSubmit={(input) => {
          report.mutate(input, {
            onSuccess: () => {
              setReportOpen(false);
              showToast({ message: tSafety("report.success"), kind: "success" });
            },
            onError: () => showToast({ message: tSafety("report.error"), kind: "error" }),
          });
        }}
      />
    </main>
  );
}
