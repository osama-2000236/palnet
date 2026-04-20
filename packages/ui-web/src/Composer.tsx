// Composer — the feed publisher.
// Spec: prototype FeedPage.jsx (Composer section).
// Mobile twin: packages/ui-native/src/Composer.tsx (Sprint 5 — same prop API).
//
// Two visual states:
//   1. Collapsed — avatar + "ابدأ منشورًا…" pill + 3 quiet icon chips
//      (image/video/event). Clicking the pill (or any chip) expands.
//   2. Expanded — header row (avatar + name + "ينشر للعموم"), autoFocus
//      textarea, media tray, footer with char counter + cancel + submit.
//
// Responsibility split:
//   • This component owns the UI, state machine, and text buffer.
//   • The host owns the network: pass `onSubmit({ body, media })` and keep
//     the returned promise; we'll show the busy state while it resolves.
//   • Media upload is delegated to `onPickMedia(file)` — the host returns
//     a `ComposerMedia` it wants to attach. That keeps this file free of
//     upload plumbing and reusable on mobile.
//
// Tokens only. RTL-safe (logical spacing).

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar, type AvatarUser } from "./Avatar";
import { cx } from "./cx";
import { Icon, type IconName } from "./Icon";
import { Surface } from "./Surface";

/** One piece of media already uploaded by the host — a remote URL. */
export interface ComposerMedia {
  /** Stable key for React lists — often the uploaded asset URL. */
  id: string;
  url: string;
  kind: "IMAGE" | "VIDEO";
  /** MIME type (required — `CreatePostBody` rejects media without it). */
  mimeType: string;
  sizeBytes?: number;
}

export interface ComposerLabels {
  /** Collapsed-state pill text ("ابدأ منشورًا…"). */
  startPrompt: string;
  /** Expanded-state textarea placeholder. */
  expandedPlaceholder: string;
  /** Line under the author name in the expanded header ("ينشر للعموم"). */
  audienceHint: string;
  addImage: string;
  addVideo: string;
  addEvent: string;
  cancel: string;
  submit: string;
  uploading: string;
  removeMedia: string;
  /** Inline error rendered under the textarea (e.g. upload failure). */
  uploadFailed: string;
}

export interface ComposerProps {
  /** Signed-in user — used for the avatar + expanded-state name line. */
  me: AvatarUser | null;
  /** i18n strings — required so the component never ships hardcoded Arabic. */
  labels: ComposerLabels;
  /** Already-attached media, controlled by the host. */
  media: ComposerMedia[];
  /** Optional max length. Default 3000, matching the API contract. */
  maxLength?: number;
  /** Whether a submit is currently in flight. */
  busy?: boolean;
  /** Error to show inline (upload or publish). */
  error?: string | null;

  onSubmit(body: string): Promise<void> | void;
  onPickMedia?(file: File, kind: "IMAGE" | "VIDEO"): Promise<void> | void;
  onRemoveMedia?(id: string): void;
  /**
   * Start in expanded state — used by the feed page to restore expansion
   * after an optimistic post lands (so the composer stays focused).
   */
  defaultExpanded?: boolean;
}

export function Composer({
  me,
  labels,
  media,
  maxLength = 3000,
  busy = false,
  error,
  onSubmit,
  onPickMedia,
  onRemoveMedia,
  defaultExpanded = false,
}: ComposerProps): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [body, setBody] = useState("");
  const [uploading, setUploading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (expanded) textareaRef.current?.focus();
  }, [expanded]);

  const chipHandlers = useCallback(
    (kind: "IMAGE" | "VIDEO") =>
      async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !onPickMedia) return;
        setUploading(true);
        try {
          await onPickMedia(file, kind);
        } finally {
          setUploading(false);
        }
      },
    [onPickMedia],
  );

  const doSubmit = useCallback(async () => {
    const trimmed = body.trim();
    if (!trimmed && media.length === 0) return;
    await onSubmit(trimmed);
    setBody("");
    // Stay expanded so quick follow-up posts keep the focused state. The host
    // can reset `defaultExpanded={false}` to collapse.
  }, [body, media.length, onSubmit]);

  if (!expanded) {
    return (
      <Surface as="section" variant="card" padding="3" className="flex items-center gap-3">
        <Avatar user={me} size="md" />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-1 cursor-pointer rounded-full border border-line-soft bg-surface-subtle px-4 py-2.5 text-start text-sm text-ink-muted hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {labels.startPrompt}
        </button>
        <div className="hidden items-center gap-1 sm:flex">
          <QuietChip
            icon="image"
            label={labels.addImage}
            onClick={() => setExpanded(true)}
          />
          <QuietChip
            icon="video"
            label={labels.addVideo}
            onClick={() => setExpanded(true)}
          />
          <QuietChip
            icon="calendar"
            label={labels.addEvent}
            onClick={() => setExpanded(true)}
          />
        </div>
      </Surface>
    );
  }

  const name = me
    ? `${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || (me.handle ?? "")
    : "";

  return (
    <Surface as="section" variant="card" padding="4" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar user={me} size="md" />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-ink">{name}</span>
          <span className="text-xs text-ink-muted">{labels.audienceHint}</span>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={labels.expandedPlaceholder}
        rows={5}
        maxLength={maxLength}
        className="w-full resize-none rounded-md border-0 bg-transparent p-0 text-base text-ink placeholder:text-ink-muted focus:outline-none"
      />

      {media.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {media.map((m) => (
            <li key={m.id} className="relative">
              {m.kind === "IMAGE" ? (
                <img
                  src={m.url}
                  alt=""
                  className="h-24 w-24 rounded-md border border-line-soft object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-md border border-line-soft bg-surface-subtle text-ink-muted">
                  <Icon name="video" size={24} />
                </div>
              )}
              {onRemoveMedia ? (
                <button
                  type="button"
                  onClick={() => onRemoveMedia(m.id)}
                  aria-label={labels.removeMedia}
                  className="absolute -top-2 -end-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface text-ink-muted shadow-card hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                >
                  <Icon name="x" size={12} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {onPickMedia ? (
          <>
            <FileChip
              icon="image"
              label={labels.addImage}
              accept="image/png,image/jpeg,image/webp"
              onChange={chipHandlers("IMAGE")}
              disabled={uploading || busy}
            />
            <FileChip
              icon="video"
              label={labels.addVideo}
              accept="video/mp4,video/webm"
              onChange={chipHandlers("VIDEO")}
              disabled={uploading || busy}
            />
          </>
        ) : null}
        <div className="flex-1" />
        {uploading ? (
          <span className="text-xs text-ink-muted">{labels.uploading}</span>
        ) : null}
        <span className="text-xs tabular-nums text-ink-muted">
          {body.length} / {maxLength}
        </span>
        <button
          type="button"
          onClick={() => {
            setExpanded(false);
            setBody("");
          }}
          className="rounded-md border border-line-soft px-3 py-1.5 text-sm text-ink hover:bg-surface-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {labels.cancel}
        </button>
        <button
          type="button"
          onClick={() => void doSubmit()}
          disabled={
            busy || uploading || (body.trim().length === 0 && media.length === 0)
          }
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-ink-inverse shadow-card hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="send-paper" size={14} />
          {labels.submit}
        </button>
      </div>
    </Surface>
  );
}

function QuietChip({
  icon,
  label,
  onClick,
}: {
  icon: IconName;
  label: string;
  onClick(): void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-subtle hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      )}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  );
}

function FileChip({
  icon,
  label,
  accept,
  onChange,
  disabled,
}: {
  icon: IconName;
  label: string;
  accept: string;
  onChange(e: React.ChangeEvent<HTMLInputElement>): void;
  disabled: boolean;
}): JSX.Element {
  return (
    <label
      className={cx(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-subtle hover:text-ink focus-within:ring-2 focus-within:ring-brand-600",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <Icon name={icon} size={14} />
      {label}
      <input
        type="file"
        accept={accept}
        onChange={onChange}
        disabled={disabled}
        className="hidden"
      />
    </label>
  );
}

