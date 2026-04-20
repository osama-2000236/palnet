"use client";

import {
  AddSkillBody,
  EducationBody,
  ExperienceBody,
  JobLocationMode,
  Profile as ProfileSchema,
  UpdateProfileBody,
  type Education,
  type Experience,
  type Profile,
  type Skill,
} from "@palnet/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadFile } from "@/lib/uploads";

export default function EditProfilePage(): JSX.Element {
  const router = useRouter();
  const t = useTranslations("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (): Promise<void> => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const p = await apiFetch("/profiles/me", ProfileSchema, { token });
    setProfile(p);
  };

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !profile) {
    return (
      <main className="mx-auto max-w-[840px] px-6 py-10 text-ink-muted">…</main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">{t("editTitle")}</h1>
        <Link
          href={`/in/${profile.handle}`}
          className="text-sm text-ink-muted hover:underline"
        >
          {t("viewPublic")}
        </Link>
      </header>

      <BasicsSection profile={profile} onChanged={setProfile} />
      <ExperiencesSection profile={profile} onChanged={setProfile} />
      <EducationsSection profile={profile} onChanged={setProfile} />
      <SkillsSection profile={profile} onChanged={setProfile} />
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Basics
// ──────────────────────────────────────────────────────────────────────────

function BasicsSection({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const t = useTranslations("profile");
  const tOn = useTranslations("onboarding");
  const [state, setState] = useState({
    firstName: profile.firstName,
    lastName: profile.lastName,
    headline: profile.headline ?? "",
    about: profile.about ?? "",
    location: profile.location ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onAvatarChange(
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
        purpose: "AVATAR",
        token,
      });
      const next = await apiFetch("/profiles/me", ProfileSchema, {
        method: "PATCH",
        body: { avatarUrl: publicUrl },
        token,
      });
      onChanged(next);
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setUploading(false);
      // Reset input so re-selecting the same file re-triggers onChange.
      e.target.value = "";
    }
  }

  async function save(): Promise<void> {
    setError(null);
    const parsed = UpdateProfileBody.safeParse({
      firstName: state.firstName,
      lastName: state.lastName,
      headline: state.headline || null,
      about: state.about || null,
      location: state.location || null,
    });
    if (!parsed.success) {
      setError(t("validationFailed"));
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch("/profiles/me", ProfileSchema, {
        method: "PATCH",
        body: parsed.data,
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
    <section className="rounded-md border border-ink-muted/20 bg-surface p-6">
      <h2 className="mb-3 text-xl font-semibold text-ink">{t("basics")}</h2>

      <div className="mb-4 flex items-center gap-4">
        {profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-16 w-16 rounded-full border border-ink-muted/20 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-ink-muted/20 bg-surface-muted text-xs text-ink-muted">
            {profile.firstName[0]}
            {profile.lastName[0]}
          </div>
        )}
        <label className="cursor-pointer rounded-md border border-ink-muted/30 px-3 py-2 text-sm text-ink hover:bg-ink-muted/5">
          {uploading ? t("uploading") : t("changeAvatar")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onAvatarChange}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label={tOn("firstName" as never) as string}>
          <input
            className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
            value={state.firstName}
            onChange={(e) => setState({ ...state, firstName: e.target.value })}
          />
        </Field>
        <Field label={tOn("lastName" as never) as string}>
          <input
            className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
            value={state.lastName}
            onChange={(e) => setState({ ...state, lastName: e.target.value })}
          />
        </Field>
      </div>
      <Field label={tOn("headline")}>
        <input
          className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
          value={state.headline}
          onChange={(e) => setState({ ...state, headline: e.target.value })}
          maxLength={220}
        />
      </Field>
      <Field label={t("about")}>
        <textarea
          className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
          rows={4}
          value={state.about}
          onChange={(e) => setState({ ...state, about: e.target.value })}
          maxLength={4000}
        />
      </Field>
      <Field label={tOn("location")}>
        <input
          className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
          value={state.location}
          onChange={(e) => setState({ ...state, location: e.target.value })}
          maxLength={120}
        />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-inverse disabled:opacity-60"
        >
          {t("save")}
        </button>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Experiences
// ──────────────────────────────────────────────────────────────────────────

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

function ExperiencesSection({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const t = useTranslations("profile");
  const [draft, setDraft] = useState<Experience | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(): Promise<void> {
    if (!draft) return;
    const parsed = ExperienceBody.safeParse(draft);
    if (!parsed.success) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch("/profiles/me/experiences", ProfileSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch(
        `/profiles/me/experiences/${id}`,
        ProfileSchema,
        { method: "DELETE", token },
      );
      onChanged(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-ink-muted/20 bg-surface p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">{t("experience")}</h2>
        {!draft ? (
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY_EXPERIENCE })}
            className="text-sm text-brand-600 hover:underline"
          >
            + {t("add")}
          </button>
        ) : null}
      </div>

      <ul className="flex flex-col gap-3">
        {profile.experiences.map((e) => (
          <li
            key={e.id ?? `${e.companyName}-${e.startDate}`}
            className="flex items-start justify-between gap-4 border-b border-ink-muted/10 pb-3 last:border-b-0"
          >
            <div>
              <p className="font-semibold text-ink">{e.title}</p>
              <p className="text-sm text-ink-muted">{e.companyName}</p>
              {e.description ? (
                <p className="mt-1 text-sm text-ink">{e.description}</p>
              ) : null}
            </div>
            {e.id ? (
              <button
                type="button"
                onClick={() => void remove(e.id as string)}
                disabled={busy}
                className="text-xs text-danger hover:underline"
              >
                {t("remove")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {draft ? (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-brand-600/30 bg-brand-600/5 p-3">
          <input
            className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
            placeholder={t("expTitle")}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <input
            className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
            placeholder={t("company")}
            value={draft.companyName}
            onChange={(e) =>
              setDraft({ ...draft, companyName: e.target.value })
            }
          />
          <input
            type="date"
            className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
            value={draft.startDate.slice(0, 10)}
            onChange={(e) =>
              setDraft({
                ...draft,
                startDate: new Date(e.target.value).toISOString(),
              })
            }
          />
          <textarea
            className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
            rows={3}
            placeholder={t("description")}
            value={draft.description ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value || null })
            }
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-sm text-ink-muted"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-inverse disabled:opacity-60"
            >
              {t("save")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Educations
// ──────────────────────────────────────────────────────────────────────────

const EMPTY_EDUCATION: Education = {
  school: "",
  degree: null,
  fieldOfStudy: null,
  startDate: null,
  endDate: null,
  description: null,
};

function EducationsSection({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const t = useTranslations("profile");
  const [draft, setDraft] = useState<Education | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(): Promise<void> {
    if (!draft) return;
    const parsed = EducationBody.safeParse(draft);
    if (!parsed.success) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch("/profiles/me/educations", ProfileSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setDraft(null);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch(
        `/profiles/me/educations/${id}`,
        ProfileSchema,
        { method: "DELETE", token },
      );
      onChanged(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-ink-muted/20 bg-surface p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink">{t("education")}</h2>
        {!draft ? (
          <button
            type="button"
            onClick={() => setDraft({ ...EMPTY_EDUCATION })}
            className="text-sm text-brand-600 hover:underline"
          >
            + {t("add")}
          </button>
        ) : null}
      </div>

      <ul className="flex flex-col gap-3">
        {profile.educations.map((e) => (
          <li
            key={e.id ?? e.school}
            className="flex items-start justify-between gap-4 border-b border-ink-muted/10 pb-3 last:border-b-0"
          >
            <div>
              <p className="font-semibold text-ink">{e.school}</p>
              {e.degree ? (
                <p className="text-sm text-ink-muted">
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
                className="text-xs text-danger hover:underline"
              >
                {t("remove")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {draft ? (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-brand-600/30 bg-brand-600/5 p-3">
          <input
            className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
            placeholder={t("school")}
            value={draft.school}
            onChange={(e) => setDraft({ ...draft, school: e.target.value })}
          />
          <input
            className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
            placeholder={t("degree")}
            value={draft.degree ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, degree: e.target.value || null })
            }
          />
          <input
            className="w-full rounded-md border border-ink-muted/30 px-3 py-2"
            placeholder={t("fieldOfStudy")}
            value={draft.fieldOfStudy ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, fieldOfStudy: e.target.value || null })
            }
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-sm text-ink-muted"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-inverse disabled:opacity-60"
            >
              {t("save")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Skills
// ──────────────────────────────────────────────────────────────────────────

function SkillsSection({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const t = useTranslations("profile");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(): Promise<void> {
    const parsed = AddSkillBody.safeParse({ name });
    if (!parsed.success) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch("/profiles/me/skills", ProfileSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: Skill): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch(
        `/profiles/me/skills/${s.id}`,
        ProfileSchema,
        { method: "DELETE", token },
      );
      onChanged(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-md border border-ink-muted/20 bg-surface p-6">
      <h2 className="mb-3 text-xl font-semibold text-ink">{t("skills")}</h2>
      <ul className="mb-3 flex flex-wrap gap-2">
        {profile.skills.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-full border border-ink-muted/30 px-3 py-1 text-sm text-ink"
          >
            <span>{s.name}</span>
            <button
              type="button"
              onClick={() => void remove(s)}
              disabled={busy}
              aria-label={t("remove")}
              className="text-xs text-danger hover:underline"
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
          className="flex-1 rounded-md border border-ink-muted/30 px-3 py-2"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy || name.trim().length === 0}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-ink-inverse disabled:opacity-60"
        >
          {t("add")}
        </button>
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="mt-2 flex flex-col gap-1">
      <span className="text-sm text-ink-muted">{label}</span>
      {children}
    </label>
  );
}
