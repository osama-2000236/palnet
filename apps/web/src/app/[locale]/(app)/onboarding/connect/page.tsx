"use client";

import { PersonSuggestion as PersonSuggestionSchema, type PersonSuggestion } from "@baydar/shared";
import { Avatar, Button, OnboardingProgress, Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { apiCall, apiFetch, ApiRequestError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const SuggestionsEnvelope = z.object({ data: z.array(PersonSuggestionSchema) });
const MIN_PICKS = 2;

export default function OnboardingConnectPage(): JSX.Element {
  const t = useTranslations("onboarding");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<PersonSuggestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const steps = useMemo(
    () => [
      { key: "identity", label: t("steps.identity") },
      { key: "profile", label: t("steps.profile") },
      { key: "location", label: t("steps.location") },
      { key: "connect", label: t("steps.connect") },
    ],
    [t],
  );

  const load = useCallback(async (): Promise<void> => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const out = await apiFetch("/connections/suggestions?limit=8", SuggestionsEnvelope, {
        token,
      });
      setSuggestions(out.data);
    } catch {
      setLoadError(t("connect.error"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(userId: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function submitPicks(): Promise<void> {
    setSubmitError(null);
    if (selectedIds.size < MIN_PICKS) {
      setSubmitError(t("connect.requireTwo"));
      return;
    }
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    try {
      await Promise.allSettled(
        Array.from(selectedIds).map((receiverId) =>
          apiCall("/connections", {
            method: "POST",
            body: { receiverId },
            token,
          }),
        ),
      );
      router.push("/feed?welcome=1");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setSubmitError(tAuth(`errors.${err.code}` as Parameters<typeof tAuth>[0]));
      } else {
        setSubmitError(tAuth("errors.INTERNAL"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function skip(): void {
    router.push("/feed?welcome=1");
  }

  const canSubmit = selectedIds.size >= MIN_PICKS;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-12">
      <OnboardingProgress steps={steps} active={3} ariaLabel={t("progressAria")} />

      <header className="flex flex-col gap-1">
        <p className="text-brand-700 text-xs font-bold uppercase tracking-wide">
          {t("progress", { current: 4, total: steps.length })}
        </p>
        <h1 className="text-ink text-3xl font-bold">{t("connect.title")}</h1>
        <p className="text-ink-muted text-sm">{t("connect.subtitle")}</p>
      </header>

      {loading ? (
        <Surface variant="tinted" padding="6">
          <p className="text-ink-muted text-sm">{t("connect.loading")}</p>
        </Surface>
      ) : loadError ? (
        <div className="flex flex-col gap-2">
          <Surface variant="tinted" padding="4">
            <p role="alert" className="text-danger text-sm">
              {loadError}
            </p>
          </Surface>
          <Button variant="secondary" onClick={() => void load()}>
            {tCommon("retry")}
          </Button>
        </div>
      ) : suggestions.length === 0 ? (
        <Surface variant="tinted" padding="6">
          <p className="text-ink-muted text-sm">{t("connect.empty")}</p>
        </Surface>
      ) : (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {suggestions.map((s) => {
            const selected = selectedIds.has(s.user.userId);
            return (
              <li key={s.user.userId}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(s.user.userId)}
                  className="focus-visible:ring-brand-600 w-full rounded-lg text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Surface
                    variant={selected ? "tinted" : "flat"}
                    padding="3"
                    className="flex items-center gap-3"
                  >
                    <Avatar
                      user={{
                        id: s.user.userId,
                        handle: s.user.handle,
                        firstName: s.user.firstName,
                        lastName: s.user.lastName,
                        avatarUrl: s.user.avatarUrl ?? null,
                      }}
                      size="md"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-ink truncate text-sm font-semibold">
                        {`${s.user.firstName} ${s.user.lastName}`.trim() || s.user.handle}
                      </span>
                      {s.user.headline ? (
                        <span className="text-ink-muted truncate text-xs">{s.user.headline}</span>
                      ) : null}
                    </div>
                    <span
                      className={
                        selected
                          ? "bg-brand-600 text-ink-inverse rounded-full px-3 py-1 text-xs font-semibold"
                          : "border-brand-600 text-brand-700 rounded-full border px-3 py-1 text-xs font-semibold"
                      }
                    >
                      {selected ? t("connect.deselect") : t("connect.select")}
                    </span>
                  </Surface>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {submitError ? (
        <p role="alert" className="text-danger text-sm">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-row-reverse items-center gap-2">
        <Button
          type="button"
          disabled={!canSubmit || submitting}
          loading={submitting}
          onClick={() => void submitPicks()}
          className="flex-1"
        >
          {t("connect.submit")}
        </Button>
        <Button type="button" variant="ghost" disabled={submitting} onClick={skip}>
          {t("connect.skip")}
        </Button>
      </div>
      <p className="text-ink-muted text-xs">{t("connect.selected", { count: selectedIds.size })}</p>
    </main>
  );
}
