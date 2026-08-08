import { Message as MessageSchema, upsertMessage, type Message } from "@baydar/shared";
import { useCallback, useState } from "react";
import type { TFunction } from "i18next";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { successHaptic } from "@/lib/haptics";

/**
 * The message action sheet: which message is selected, the edit draft, and the
 * two mutations that close it.
 *
 * Split out of `useMessageThread` on the seam the sibling hooks already use —
 * `useTypingIndicator` owns typing, `useThreadDerived` owns the derived view
 * model, and this owns acting on one message. The thread hook was at the
 * 300-LOC design ceiling, and a hook that both paginates a list and edits a
 * row is two jobs regardless of the line count.
 */
export interface MessageActions {
  actionMessage: Message | null;
  editingBody: string;
  setEditingBody: (value: string) => void;
  openMessageActions: (message: Message) => void;
  closeActions: () => void;
  saveEdit: () => Promise<void>;
  deleteSelected: () => Promise<void>;
}

export function useMessageActions(options: {
  token: string | null;
  t: TFunction;
  setMessages: (update: (prev: Message[]) => Message[]) => void;
  setError: (message: string | null) => void;
}): MessageActions {
  const { token, t, setMessages, setError } = options;
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const closeActions = useCallback((): void => {
    setActionMessage(null);
    setEditingBody("");
  }, []);

  const openMessageActions = useCallback((message: Message): void => {
    setActionMessage(message);
    setEditingBody(message.body);
  }, []);

  /**
   * Both mutations return the server's copy and upsert it rather than patching
   * local state: a delete comes back as a tombstoned `Message`, not a removal,
   * so the thread keeps its shape and every other client sees the same row.
   */
  const saveEdit = useCallback(async (): Promise<void> => {
    if (!token || !actionMessage) return;
    try {
      const saved = await apiFetch(`/messaging/messages/${actionMessage.id}`, MessageSchema, {
        method: "PATCH",
        token,
        body: { body: editingBody.trim() },
      });
      setMessages((prev) => upsertMessage(prev, saved));
      closeActions();
      successHaptic();
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    }
  }, [actionMessage, editingBody, token, t, setMessages, setError, closeActions]);

  const deleteSelected = useCallback(async (): Promise<void> => {
    if (!token || !actionMessage) return;
    try {
      const deleted = await apiFetch(`/messaging/messages/${actionMessage.id}`, MessageSchema, {
        method: "DELETE",
        token,
      });
      setMessages((prev) => upsertMessage(prev, deleted));
      closeActions();
      successHaptic();
    } catch (caught) {
      setError(apiErrorMessage(t, caught));
    }
  }, [actionMessage, token, t, setMessages, setError, closeActions]);

  return {
    actionMessage,
    editingBody,
    setEditingBody,
    openMessageActions,
    closeActions,
    saveEdit,
    deleteSelected,
  };
}
