"use client";

import {
  ExperienceBody,
  JobLocationMode,
  Profile as ProfileSchema,
  type Experience,
  type Profile,
} from "@baydar/shared";
import { Surface } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const inputClass =
  "border-ink-muted/30 w-full rounded-md border px-3 py-2 focus-visible:[box-shadow:var(--focus-ring)] focus-visible:outline-hidden";
const linkButtonClass =
  "target-area state-layer text-brand-600 inline-flex items-center text-sm hover:underline focus-visible:[box-shadow:var(--focus-ring)] focus-visible:outline-hidden";

const EMPTY_EXPERIENCE: Experience = {
  title: "",
  companyName: "",
  companyId: null,
  location: null,
  locationMode: JobLocationMode.ONSITE,
  startDate: new Date().toISOString(),
  endDate: null,
  description: null,
};

export function ExperiencesSection({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const t = useTranslations("profile");
  const [draft, setDraft] = useState<Experience | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(): Promise<void> {
    if (!draft) return;
    const parsed = ExperienceBody.safeParse(draft);
    if (!parsed.success) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const next = await apiFetch("/profiles/me/experiences", ProfileSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setDraft(null);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const next = await apiFetch(`/profiles/me/experiences/${id}`, ProfileSchema, {
        method: "DELETE",
        token,
      });
      onChanged(next);
    } catch {
      setError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Surface as="section" variant="flat" padding="6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-ink text-xl font-semibold">{t("experience")}</h2>
        {!draft ? (
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY_EXPERIENCE })}
            className={linkButtonClass}
          >
            + {t("add")}
          </button>
        ) : null}
      </div>

      <ul className="flex flex-col gap-3">
        {profile.experiences.map((e) => (
          <li
            key={e.id ?? `${e.companyName}-${e.startDate}`}
            className="border-ink-muted/10 flex items-start justify-between gap-4 border-b pb-3 last:border-b-0"
          >
            {/* `min-w-0`: a flex item will not shrink below its content, so a
                job title with no space in it widened this row, the list and the
                document — measured 557px against a 390px viewport. The text
                itself carries `bidi-plaintext`, which is where the app keeps
                both its direction rule and its break-word rule. */}
            <div className="min-w-0">
              <p className="bidi-plaintext text-ink font-semibold">{e.title}</p>
              <p className="bidi-plaintext text-ink-muted text-sm">{e.companyName}</p>
              {e.description ? (
                <p className="bidi-plaintext text-ink mt-1 text-sm">{e.description}</p>
              ) : null}
            </div>
            {e.id ? (
              <button
                type="button"
                onClick={() => void remove(e.id as string)}
                disabled={busy}
                className="target-area text-danger focus-visible:outline-hidden inline-flex items-center text-xs hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
              >
                {t("remove")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {draft ? (
        <div className="border-brand-600/30 bg-brand-600/5 mt-3 flex flex-col gap-2 rounded-md border p-3">
          <input
            className={inputClass}
            placeholder={t("expTitle")}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <input
            className={inputClass}
            placeholder={t("company")}
            value={draft.companyName}
            onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
          />
          <input
            type="date"
            className={inputClass}
            value={draft.startDate.slice(0, 10)}
            onChange={(e) =>
              setDraft({ ...draft, startDate: new Date(e.target.value).toISOString() })
            }
          />
          <textarea
            className={inputClass}
            rows={3}
            placeholder={t("description")}
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="target-area text-ink-muted focus-visible:outline-hidden inline-flex items-center text-sm focus-visible:[box-shadow:var(--focus-ring)]"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="target-area state-layer bg-brand-600 text-ink-inverse focus-visible:outline-hidden inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold focus-visible:[box-shadow:var(--focus-ring)] disabled:opacity-60"
            >
              {t("save")}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-danger mt-3 text-sm">{error}</p> : null}
    </Surface>
  );
}
