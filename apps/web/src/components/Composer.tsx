"use client";

// Thin web wrapper around @baydar/ui-web's <Composer>. This file owns the
// network concerns: profile fetch (for the avatar), media upload, post
// creation. The shared component owns the UI, state machine, and i18n.

import { CreatePostBody, MediaKind, type MediaRef, Post, Profile } from "@baydar/shared";
import { Composer as ComposerShell, type ComposerMedia } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadFile } from "@/lib/uploads";

export function Composer({
  me = null,
  onPosted,
}: {
  /**
   * The signed-in viewer's profile, for the avatar + audience line. Optional
   * — the shell renders a neutral avatar until the host fetches it.
   */
  me?: Profile | null;
  onPosted: (post: Post) => void;
}): JSX.Element {
  const t = useTranslations("composer");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const [media, setMedia] = useState<ComposerMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear the error when the user begins a new action.
  useEffect(() => {
    if (busy) setError(null);
  }, [busy]);

  async function onPickMedia(file: File, kind: "IMAGE" | "VIDEO"): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setError(null);
    try {
      const publicUrl = await uploadFile({
        file,
        purpose: "POST_MEDIA",
        token,
      });
      setMedia((prev) => [
        ...prev,
        {
          id: publicUrl,
          url: publicUrl,
          kind,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      ]);
    } catch {
      setError(t("uploadFailed"));
    }
  }

  function onRemoveMedia(id: string): void {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  async function onSubmit(body: string): Promise<void> {
    const apiMedia: MediaRef[] = media.map((m) => ({
      url: m.url,
      kind: m.kind === "IMAGE" ? MediaKind.IMAGE : MediaKind.VIDEO,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
    }));
    const parsed = CreatePostBody.safeParse({
      body,
      language: "ar",
      media: apiMedia,
    });
    if (!parsed.success) {
      setError(tAuth("errors.VALIDATION_FAILED"));
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const post = await apiFetch("/posts", Post, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onPosted(post);
      setMedia([]);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const key = `errors.${err.code}`;
        try {
          setError(tAuth(key as Parameters<typeof tAuth>[0]));
        } catch {
          setError(tCommon("genericError"));
        }
      } else {
        setError(tCommon("genericError"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ComposerShell
      me={
        me
          ? {
              id: me.userId,
              handle: me.handle,
              firstName: me.firstName,
              lastName: me.lastName,
              avatarUrl: me.avatarUrl ?? null,
            }
          : null
      }
      labels={{
        startPrompt: t("placeholder"),
        expandedPlaceholder: t("placeholder"),
        audienceHint: t("audienceHint"),
        addImage: t("addImage"),
        addVideo: t("addVideo"),
        addEvent: t("addEvent"),
        cancel: tCommon("cancel"),
        submit: t("submit"),
        uploading: t("uploading"),
        removeMedia: t("removeMedia"),
        uploadFailed: t("uploadFailed"),
      }}
      media={media}
      busy={busy}
      error={error}
      onSubmit={onSubmit}
      onPickMedia={onPickMedia}
      onRemoveMedia={onRemoveMedia}
    />
  );
}
