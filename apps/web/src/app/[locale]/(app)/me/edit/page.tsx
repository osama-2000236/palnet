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
} from "@baydar/shared";
import { Avatar, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadImage } from "@/lib/uploads";

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
    return <main className="text-ink-muted max-w-profile mx-auto px-6 py-10">…</main>;
  }

  return (
    <main className="max-w-profile mx-auto flex w-full flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-ink text-3xl font-bold">{t("editTitle")}</h1>
        <Link href={`/in/${profile.handle}`} className="text-ink-muted text-sm hover:underline">
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  async function uploadAndPatch(
    e: React.ChangeEvent<HTMLInputElement>,
    purpose: "AVATAR" | "COVER",
    setFlag: (v: boolean) => void,
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getAccessToken();
    if (!token) return;
    setError(null);
    setFlag(true);
    try {
      const { publicUrl, blurhash } = await uploadImage({
        file,
        purpose,
        token,
      });
      const patch =
        purpose === "AVATAR"
          ? { avatarUrl: publicUrl, avatarBlur: blurhash }
          : { coverUrl: publicUrl, coverBlur: blurhash };
      const next = await apiFetch("/profiles/me", ProfileSchema, {
        method: "PATCH",
        body: patch,
        token,
      });
      onChanged(next);
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setFlag(false);
      // Reset input so re-selecting the same file re-triggers onChange.
      e.target.value = "";
    }
  }

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    uploadAndPatch(e, "AVATAR", setUploadingAvatar);
  const onCoverChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    uploadAndPatch(e, "COVER", setUploadingCover);

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
    <Surface as="section" variant="flat" padding="6">
      <h2 className="text-ink mb-3 text-xl font-semibold">{t("basics")}</h2>

      <div className="mb-4 flex items-center gap-4">
        <Avatar
          user={{
            id: profile.userId,
            handle: profile.handle,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl ?? null,
          }}
          size="lg"
        />
        <label className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 cursor-pointer rounded-md border px-3 py-2 text-sm">
          {uploadingAvatar ? t("uploading") : t("changeAvatar")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onAvatarChange}
            disabled={uploadingAvatar}
            className="hidden"
          />
        </label>
        <label className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 cursor-pointer rounded-md border px-3 py-2 text-sm">
          {uploadingCover ? t("uploading") : t("changeCover")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onCoverChange}
            disabled={uploadingCover}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label={tOn("firstName" as never) as string}>
          <input
            className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
            value={state.firstName}
            onChange={(e) => setState({ ...state, firstName: e.target.value })}
          />
        </Field>
        <Field label={tOn("lastName" as never) as string}>
          <input
            className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
            value={state.lastName}
            onChange={(e) => setState({ ...state, lastName: e.target.value })}
          />
        </Field>
      </div>
      <Field label={tOn("headline")}>
        <input
          className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
          value={state.headline}
          onChange={(e) => setState({ ...state, headline: e.target.value })}
          maxLength={220}
        />
      </Field>
      <Field label={t("about")}>
        <textarea
          className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
          rows={4}
          value={state.about}
          onChange={(e) => setState({ ...state, about: e.target.value })}
          maxLength={4000}
        />
      </Field>
      <Field label={tOn("location")}>
        <input
          className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
          value={state.location}
          onChange={(e) => setState({ ...state, location: e.target.value })}
          maxLength={120}
        />
      </Field>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {t("save")}
        </button>
      </div>
    </Surface>
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
      const next = await apiFetch(`/profiles/me/experiences/${id}`, ProfileSchema, {
        method: "DELETE",
        token,
      });
      onChanged(next);
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
            className="text-brand-600 text-sm hover:underline"
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
            <div>
              <p className="text-ink font-semibold">{e.title}</p>
              <p className="text-ink-muted text-sm">{e.companyName}</p>
              {e.description ? <p className="text-ink mt-1 text-sm">{e.description}</p> : null}
            </div>
            {e.id ? (
              <button
                type="button"
                onClick={() => void remove(e.id as string)}
                disabled={busy}
                className="text-danger text-xs hover:underline"
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
            className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
            placeholder={t("expTitle")}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <input
            className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
            placeholder={t("company")}
            value={draft.companyName}
            onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
          />
          <input
            type="date"
            className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
            value={draft.startDate.slice(0, 10)}
            onChange={(e) =>
              setDraft({
                ...draft,
                startDate: new Date(e.target.value).toISOString(),
              })
            }
          />
          <textarea
            className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
            rows={3}
            placeholder={t("description")}
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value || null })}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="text-ink-muted text-sm">
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {t("save")}
            </button>
          </div>
        </div>
      ) : null}
    </Surface>
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
      const next = await apiFetch(`/profiles/me/educations/${id}`, ProfileSchema, {
        method: "DELETE",
        token,
      });
      onChanged(next);
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
            className="text-brand-600 text-sm hover:underline"
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
            <div>
              <p className="text-ink font-semibold">{e.school}</p>
              {e.degree ? (
                <p className="text-ink-muted text-sm">
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
                className="text-danger text-xs hover:underline"
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
            className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
            placeholder={t("school")}
            value={draft.school}
            onChange={(e) => setDraft({ ...draft, school: e.target.value })}
          />
          <input
            className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
            placeholder={t("degree")}
            value={draft.degree ?? ""}
            onChange={(e) => setDraft({ ...draft, degree: e.target.value || null })}
          />
          <input
            className="border-ink-muted/30 w-full rounded-md border px-3 py-2"
            placeholder={t("fieldOfStudy")}
            value={draft.fieldOfStudy ?? ""}
            onChange={(e) => setDraft({ ...draft, fieldOfStudy: e.target.value || null })}
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="text-ink-muted text-sm">
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {t("save")}
            </button>
          </div>
        </div>
      ) : null}
    </Surface>
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
      const next = await apiFetch(`/profiles/me/skills/${s.id}`, ProfileSchema, {
        method: "DELETE",
        token,
      });
      onChanged(next);
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
              className="text-danger text-xs hover:underline"
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
          className="border-ink-muted/30 flex-1 rounded-md border px-3 py-2"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy || name.trim().length === 0}
          className="bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {t("add")}
        </button>
      </div>
    </Surface>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="mt-2 flex flex-col gap-1">
      <span className="text-ink-muted text-sm">{label}</span>
      {children}
    </label>
  );
}
