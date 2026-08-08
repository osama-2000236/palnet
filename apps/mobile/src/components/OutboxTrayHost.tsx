import { OutboxKind, type OutboxEntry } from "@baydar/shared";
import { OutboxTray } from "@baydar/ui-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { outbox } from "@/lib/outbox";

/**
 * The tray, wired to the queue.
 *
 * Subscribes rather than polls: the queue publishes on every mutation, and a
 * member watching a retry go through should see the row leave immediately.
 */
export function OutboxTrayHost(): JSX.Element | null {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<OutboxEntry[]>([]);

  useEffect(() => {
    let live = true;
    const refresh = (): void => {
      void outbox.list().then((next) => {
        if (live) setEntries(next);
      });
    };
    refresh();
    const unsubscribe = outbox.subscribe(refresh);
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);

  const onRetry = useCallback((id: string) => void outbox.retry(id).then(() => outbox.flush()), []);
  const onDiscard = useCallback((id: string) => void outbox.discard(id), []);

  return (
    <OutboxTray
      entries={entries.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        state: entry.state,
        preview: previewOf(entry),
      }))}
      labels={{
        title: t("connection.outbox.title"),
        queued: t("connection.outbox.queued"),
        retry: t("connection.outbox.retry"),
        discard: t("connection.outbox.discard"),
        kinds: {
          [OutboxKind.POST]: t("connection.outbox.kinds.POST"),
          [OutboxKind.MESSAGE]: t("connection.outbox.kinds.MESSAGE"),
          [OutboxKind.APPLICATION]: t("connection.outbox.kinds.APPLICATION"),
          [OutboxKind.WORK_PROOF_CONFIRM]: t("connection.outbox.kinds.WORK_PROOF_CONFIRM"),
        },
      }}
      onRetry={onRetry}
      onDiscard={onDiscard}
    />
  );
}

/**
 * One line the member can recognise their own words in.
 *
 * A row reading only "منشور" asks somebody to guess which post they lost.
 */
function previewOf(entry: OutboxEntry): string | undefined {
  const payload = entry.payload as { body?: unknown; coverLetter?: unknown } | null;
  const text = typeof payload?.body === "string" ? payload.body : payload?.coverLetter;
  return typeof text === "string" && text.trim() ? text.trim().slice(0, 140) : undefined;
}
