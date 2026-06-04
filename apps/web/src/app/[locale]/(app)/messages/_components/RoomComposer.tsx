"use client";

import type { Message } from "@baydar/shared";
import { Alert, Button, Icon } from "@baydar/ui-web";
import { useTranslations } from "next-intl";

export interface RoomComposerProps {
  draft: string;
  sending: boolean;
  error: string | null;
  actionMessage: Message | null;
  editingBody: string;
  onDraftChange(value: string): void;
  onTyping(): void;
  onSubmit(): Promise<void>;
  onEditingBodyChange(value: string): void;
  onCancelEdit(): void;
  onSaveEdit(): Promise<void>;
}

export function RoomComposer({
  draft,
  sending,
  error,
  actionMessage,
  editingBody,
  onDraftChange,
  onTyping,
  onSubmit,
  onEditingBodyChange,
  onCancelEdit,
  onSaveEdit,
}: RoomComposerProps): JSX.Element {
  const t = useTranslations("messaging");

  return (
    <>
      {error ? (
        <div className="border-line-soft border-t px-3 py-2">
          <Alert kind="danger" className="rounded-md">
            {error}
          </Alert>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
        className="border-line-soft bg-surface flex items-end gap-2 border-t p-3"
      >
        <textarea
          value={draft}
          onChange={(event) => {
            onDraftChange(event.target.value);
            if (event.target.value.trim().length > 0) onTyping();
          }}
          placeholder={t("composePlaceholder")}
          rows={1}
          maxLength={5000}
          className="border-line-soft bg-surface text-ink placeholder:text-ink-muted focus-visible:border-brand-600 focus-visible:ring-brand-600/30 min-h-10 flex-1 resize-none rounded-full border px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void onSubmit();
            }
          }}
        />
        <Button
          type="submit"
          disabled={sending || draft.trim().length === 0}
          leading={<Icon name="send-paper" size={14} />}
          className="shadow-card rounded-full"
        >
          {t("send")}
        </Button>
      </form>

      {actionMessage ? (
        <div className="border-line-soft bg-surface border-t p-3">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            <label className="text-ink text-xs font-semibold" htmlFor="message-edit-body">
              {t("edit.sheetTitle")}
            </label>
            <textarea
              id="message-edit-body"
              value={editingBody}
              onChange={(event) => onEditingBodyChange(event.currentTarget.value)}
              className="border-line-hard text-ink focus-visible:border-brand-600 focus-visible:ring-brand-600/30 min-h-20 rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:ring-2"
              maxLength={5000}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={onCancelEdit}>
                {t("edit.cancel")}
              </Button>
              <Button
                size="sm"
                disabled={editingBody.trim().length === 0}
                onClick={() => void onSaveEdit()}
              >
                {t("edit.save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
