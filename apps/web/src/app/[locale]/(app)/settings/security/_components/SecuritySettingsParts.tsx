"use client";

import type { ActiveSession } from "@baydar/shared";
import { Button, Input, Skeleton } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  helper,
  required,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  autoComplete: string;
  helper?: string;
  required?: boolean;
}): JSX.Element {
  const [reveal, setReveal] = useState(false);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-ink text-xs font-semibold">{label}</span>
      <span className="relative inline-flex w-full">
        <Input
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          dir="ltr"
          fullWidth
          className="pe-12"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? "Hide password" : "Show password"}
          className="absolute inset-y-1 end-1 h-auto px-2 text-xs"
        >
          {reveal ? "Hide" : "Show"}
        </Button>
      </span>
      {helper ? <span className="text-ink-muted text-xs">{helper}</span> : null}
    </label>
  );
}

export function SessionsList({
  sessions,
  thisDeviceId,
  onSignOut,
}: {
  sessions: ActiveSession[];
  thisDeviceId: string;
  onSignOut(id: string): void;
}): JSX.Element {
  const t = useTranslations("settings.security");

  return (
    <ul>
      {sessions.map((session, index) => (
        <li
          key={session.id}
          className={
            "flex items-start justify-between gap-3 px-4 py-3" +
            (index > 0 ? " border-line-soft border-t" : "")
          }
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-ink text-sm font-medium">
                {session.device || t("sessions.unknownDevice")}
              </span>
              {session.id === thisDeviceId ? (
                <span className="bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {t("sessions.thisDevice")}
                </span>
              ) : null}
            </div>
            <SessionMeta session={session} />
          </div>
          <Button variant="danger-ghost" size="sm" onClick={() => onSignOut(session.id)}>
            {session.id === thisDeviceId ? t("sessions.signOutThis") : t("sessions.signOut")}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function SessionMeta({ session }: { session: ActiveSession }): JSX.Element | null {
  const t = useTranslations("settings.security");
  const location = [session.city, session.country].filter(Boolean).join(", ");
  const lastActive = session.lastActiveAt ? formatRelative(session.lastActiveAt) : null;
  if (!location && !lastActive) return null;

  return (
    <div className="text-ink-muted mt-0.5 text-xs">
      {location}
      {lastActive ? (
        <>
          {location ? " · " : null}
          {t("sessions.lastActive", { when: "" }).trim()} <span dir="ltr">{lastActive}</span>
        </>
      ) : null}
    </div>
  );
}

export function SessionsSkeleton(): JSX.Element {
  return (
    <ul aria-hidden="true">
      {[0, 1].map((i) => (
        <li
          key={i}
          className={
            "flex items-start justify-between gap-3 px-4 py-3" +
            (i > 0 ? " border-line-soft border-t" : "")
          }
        >
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton radius="var(--radius-md)" className="h-7 w-20" />
        </li>
      ))}
    </ul>
  );
}

export function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
