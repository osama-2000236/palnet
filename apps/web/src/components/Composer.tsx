"use client";

import { CreatePostBody, Post } from "@palnet/shared";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export function Composer({
  onPosted,
}: {
  onPosted: (post: Post) => void;
}): JSX.Element {
  const t = useTranslations("composer");
  const tAuth = useTranslations("auth");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    const parsed = CreatePostBody.safeParse({
      body,
      language: "ar",
      media: [],
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
    <section className="flex flex-col gap-2 rounded-md border border-ink-muted/20 bg-white p-4 shadow-card">
      <label className="text-sm font-semibold text-ink">{t("title")}</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("placeholder")}
        rows={3}
        maxLength={3000}
        className="rounded-md border border-ink-muted/30 p-3 text-ink"
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-ink-muted">{body.length} / 3000</span>
        <button
          type="button"
          onClick={submit}
          disabled={busy || body.trim().length === 0}
          className="rounded-md bg-brand-600 px-4 py-2 text-white shadow-card hover:bg-brand-700 disabled:opacity-60"
        >
          {t("submit")}
        </button>
      </div>
    </section>
  );
}
