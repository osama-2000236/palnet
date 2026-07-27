"use client";

import { Profile as ProfileSchema, UpdateProfileBody, type Profile } from "@baydar/shared";
import { Avatar, Surface, SwitchRow, Textarea } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useState, type ChangeEvent, type ReactNode } from "react";

import { CityField } from "@/components/CityField";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadFile } from "@/lib/uploads";

const inputClass =
  "border-ink-muted/30 w-full rounded-md border px-3 py-2 focus-visible:[box-shadow:var(--focus-ring)] focus-visible:outline-none";

export function BasicsSection({
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
    openToWork: profile.openToWork,
    hiring: profile.hiring,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onAvatarChange(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getAccessToken();
    if (!token) return;
    setError(null);
    setUploading(true);
    try {
      const publicUrl = await uploadFile({ file, purpose: "AVATAR", token });
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
      openToWork: state.openToWork,
      hiring: state.hiring,
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
        <label className="border-ink-muted/30 text-ink hover:bg-ink-muted/5 cursor-pointer rounded-md border px-3 py-2 text-sm focus-within:shadow-[var(--focus-ring)]">
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
        <Field label={tOn("firstName")}>
          <input
            className={inputClass}
            value={state.firstName}
            onChange={(e) => setState({ ...state, firstName: e.target.value })}
          />
        </Field>
        <Field label={tOn("lastName")}>
          <input
            className={inputClass}
            value={state.lastName}
            onChange={(e) => setState({ ...state, lastName: e.target.value })}
          />
        </Field>
      </div>
      <Field label={tOn("headline")}>
        <input
          className={inputClass}
          value={state.headline}
          onChange={(e) => setState({ ...state, headline: e.target.value })}
          maxLength={220}
        />
      </Field>
      <Field label={t("about")}>
        <Textarea
          fullWidth
          rows={4}
          autoGrow
          value={state.about}
          onChange={(e) => setState({ ...state, about: e.target.value })}
          maxLength={4000}
        />
      </Field>
      <Field label={tOn("location")}>
        <CityField
          value={state.location}
          onChange={(city) => setState({ ...state, location: city })}
        />
      </Field>
      {/* `openToWork` and `hiring` have been on the Profile DTO and accepted by
          `UpdateProfileBody` since the schema was written, with no way to set
          them and nowhere that showed them. They are the two most-scanned
          signals on a professional network, so they get a row each rather than
          a buried checkbox. */}
      <div className="border-line-soft mt-4 flex flex-col gap-3 border-t pt-4">
        <SwitchRow
          checked={state.openToWork}
          onChange={(next) => setState({ ...state, openToWork: next })}
          label={t("openToWork")}
          description={t("openToWorkHint")}
        />
        <SwitchRow
          checked={state.hiring}
          onChange={(next) => setState({ ...state, hiring: next })}
          label={t("hiring")}
          description={t("hiringHint")}
        />
      </div>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="target-area state-layer bg-brand-600 text-ink-inverse inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] disabled:opacity-60"
        >
          {t("save")}
        </button>
      </div>
    </Surface>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label className="mt-2 flex flex-col gap-1">
      <span className="text-ink-muted text-sm">{label}</span>
      {children}
    </label>
  );
}
