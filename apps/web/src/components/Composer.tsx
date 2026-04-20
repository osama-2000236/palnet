"use client";

import { CreatePostBody, MediaKind, type MediaRef, Post } from "@palnet/shared";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadFile } from "@/lib/uploads";

export function Composer({
  onPosted,
}: {
  onPosted: (post: Post) => void;
}): JSX.Element {
  const t = useTranslations("composer");
  const tAuth = useTranslations("auth");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<MediaRef[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPickImage(
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getAccessToken();
    if (!token) return;
    setError(null);
    setUploading(true);
    try {
      const publicUrl = await uploadFile({
        file,
        purpose: "POST_MEDIA",
        token,
      });
      setMedia((prev) => [
        ...prev,
        {
          url: publicUrl,
          kind: MediaKind.IMAGE,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      ]);
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(): Promise<void> {
    setError(null);
    const parsed = CreatePostBody.safeParse({
      body,
      language: "ar",
      media,
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
      setBody("");
      setMedia([]);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const key = `errors.${err.code}`;
        try {
          setError(tAuth(key as Parameters<typeof tAuth>[0]));
        } catch {
          setError(tAuth("errors.INTERNAL"));
        }
      } else {
        setError(tAuth("errors.INTERNAL"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-md border border-ink-muted/20 bg-surface p-4 shadow-card">
      <label className="text-sm font-semibold text-ink">{t("title")}</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("placeholder")}
        rows={3}
        maxLength={3000}
        className="rounded-md border border-ink-muted/30 p-3 text-ink"
      />
      {media.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {media.map((m, i) => (
            <li key={m.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt=""
                className="h-20 w-20 rounded-md border border-ink-muted/20 object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setMedia((prev) => prev.filter((_, j) => j !== i))
                }
                aria-label="remove"
                className="absolute -top-2 -end-2 flex h-5 w-5 items-center justify-center rounded-full bg-surface text-xs text-danger shadow-card"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <label className="cursor-pointer text-sm text-ink-muted hover:text-ink">
          {uploading ? t("uploading") : `+ ${t("addImage")}`}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onPickImage}
            disabled={uploading || media.length >= 8}
            className="hidden"
          />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-muted">{body.length} / 3000</span>
          <button
            type="button"
            onClick={submit}
            disabled={busy || body.trim().length === 0}
            className="rounded-md bg-brand-600 px-4 py-2 text-ink-inverse shadow-card hover:bg-brand-700 disabled:opacity-60"
          >
            {t("submit")}
          </button>
        </div>
      </div>
    </section>
  );
}
