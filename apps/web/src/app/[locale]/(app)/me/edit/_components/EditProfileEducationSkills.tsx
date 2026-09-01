"use client";

import {
  AddSkillBody,
  EducationBody,
  PS_UNIVERSITIES,
  Profile as ProfileSchema,
  type Education,
  type Profile,
  type Skill,
} from "@baydar/shared";
import { Surface } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const inputClass =
  "border-ink-muted/30 w-full rounded-md border px-3 py-2 focus-visible:[box-shadow:var(--focus-ring)] focus-visible:outline-hidden";
const primaryButtonClass =
  "target-area state-layer bg-brand-600 text-ink-inverse inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold focus-visible:[box-shadow:var(--focus-ring)] focus-visible:outline-hidden disabled:opacity-60";
const textButtonClass =
  "target-area text-ink-muted inline-flex items-center text-sm focus-visible:[box-shadow:var(--focus-ring)] focus-visible:outline-hidden";

const EMPTY_EDUCATION: Education = {
  school: "",
  degree: null,
  fieldOfStudy: null,
  startDate: null,
  endDate: null,
  description: null,
};

export function EducationsSection({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const t = useTranslations("profile");
  const [draft, setDraft] = useState<Education | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(): Promise<void> {
    if (!draft) return;
    const parsed = EducationBody.safeParse(draft);
    if (!parsed.success) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const next = await apiFetch("/profiles/me/educations", ProfileSchema, {
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
      const next = await apiFetch(`/profiles/me/educations/${id}`, ProfileSchema, {
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
        <h2 className="text-ink text-xl font-semibold">{t("education")}</h2>
        {!draft ? (
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY_EDUCATION })}
            className="target-area text-brand-600 focus-visible:outline-hidden inline-flex items-center text-sm hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
          >
            + {t("add")}
          </button>
        ) : null}
      </div>

      <ul className="flex flex-col gap-3">
        {profile.educations.map((e) => (
          <li
            key={e.id ?? e.school}
            className="border-ink-muted/10 flex items-start justify-between gap-4 border-b pb-3 last:border-b-0"
          >
            {/* `min-w-0` + `bidi-plaintext`, same as the experiences list: a
                flex item does not shrink below its content. */}
            <div className="min-w-0">
              <p className="bidi-plaintext text-ink font-semibold">{e.school}</p>
              {e.degree ? (
                <p className="bidi-plaintext text-ink-muted text-sm">
                  {e.degree}
                  {e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}
                </p>
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
            placeholder={t("school")}
            value={draft.school}
            onChange={(e) => setDraft({ ...draft, school: e.target.value })}
            list="ps-universities"
          />
          {/* Native datalist: Palestinian universities as canonical-Arabic
              suggestions (English label matches en typing too). Free text
              stays allowed for any other school. */}
          <datalist id="ps-universities">
            {PS_UNIVERSITIES.map((u) => (
              <option key={u.key} value={u.ar}>
                {u.en}
              </option>
            ))}
          </datalist>
          <input
            className={inputClass}
            placeholder={t("degree")}
            value={draft.degree ?? ""}
            onChange={(e) => setDraft({ ...draft, degree: e.target.value || null })}
          />
          <input
            className={inputClass}
            placeholder={t("fieldOfStudy")}
            value={draft.fieldOfStudy ?? ""}
            onChange={(e) => setDraft({ ...draft, fieldOfStudy: e.target.value || null })}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className={textButtonClass}>
              {t("cancel")}
            </button>
            <button type="button" onClick={add} disabled={busy} className={primaryButtonClass}>
              {t("save")}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-danger mt-3 text-sm">{error}</p> : null}
    </Surface>
  );
}

export function SkillsSection({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const t = useTranslations("profile");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(): Promise<void> {
    const parsed = AddSkillBody.safeParse({ name });
    if (!parsed.success) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const next = await apiFetch("/profiles/me/skills", ProfileSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setName("");
    } catch {
      setError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: Skill): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const next = await apiFetch(`/profiles/me/skills/${s.id}`, ProfileSchema, {
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
      <h2 className="text-ink mb-3 text-xl font-semibold">{t("skills")}</h2>
      <ul className="mb-3 flex flex-wrap gap-2">
        {profile.skills.map((s) => (
          <li
            key={s.id}
            className="border-ink-muted/30 text-ink flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
          >
            <span>{s.name}</span>
            <button
              type="button"
              onClick={() => void remove(s)}
              disabled={busy}
              aria-label={t("remove")}
              className="target-area text-danger focus-visible:outline-hidden inline-flex items-center text-xs hover:underline focus-visible:[box-shadow:var(--focus-ring)]"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
          placeholder={t("addSkillPlaceholder")}
          maxLength={60}
          className="border-ink-muted/30 focus-visible:outline-hidden min-w-0 flex-1 rounded-md border px-3 py-2 focus-visible:[box-shadow:var(--focus-ring)]"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy || name.trim().length === 0}
          className={primaryButtonClass}
        >
          {t("add")}
        </button>
      </div>

      {error ? <p className="text-danger mt-3 text-sm">{error}</p> : null}
    </Surface>
  );
}
