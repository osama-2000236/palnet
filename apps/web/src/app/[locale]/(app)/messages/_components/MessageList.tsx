"use client";

import type { ChatRoom, Message } from "@baydar/shared";
import {
  Button,
  EmptyState,
  MessageBubble,
  TypingIndicator,
  type GroupedMessage,
  type MessageStatus,
} from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { Fragment, type MutableRefObject } from "react";

import { computeStatus, isSameLocalDay, shortDayLabel, shortTime } from "../_utils";

export interface MessageListProps {
  activeRoom: ChatRoom | null;
  activeTyping: { userId: string; expiresAt: number } | null;
  failedClientIds: Set<string>;
  firstUnreadIndex: number;
  firstUnreadRef: MutableRefObject<HTMLDivElement | null>;
  grouped: GroupedMessage<Message>[];
  locale: string;
  memberById: Map<string, ChatRoom["members"][number]>;
  messages: Message[];
  otherLastReadAtMs: number;
  otherMember: ChatRoom["members"][number] | null;
  viewerId: string | null;
  onDelete(message: Message): Promise<void>;
  onEdit(message: Message): void;
  onNewMessage(): void;
  onReport(message: Message): void;
  onRetryFailed(clientMessageId: string): Promise<void>;
}

export function MessageList({
  activeRoom,
  activeTyping,
  failedClientIds,
  firstUnreadIndex,
  firstUnreadRef,
  grouped,
  locale,
  memberById,
  messages,
  otherLastReadAtMs,
  otherMember,
  viewerId,
  onDelete,
  onEdit,
  onNewMessage,
  onReport,
  onRetryFailed,
}: MessageListProps): JSX.Element {
  const t = useTranslations("messaging");
  const tSend = useTranslations("messages.send");
  const tSafety = useTranslations("safety");

  if (messages.length === 0 && !activeTyping) {
    return (
      <EmptyState
        variant="inline"
        motif="messages"
        title={t("emptyThread")}
        cta={t("newMessage")}
        onAction={onNewMessage}
      />
    );
  }

  return (
    <ul role="log" aria-live="polite" className="flex flex-col gap-0.5">
      {grouped.map(({ message, tail, showTimestamp, startsRun }) => {
        const mine = message.authorId === viewerId;
        const index = messages.findIndex((item) => item.id === message.id);
        const previous = index > 0 ? messages[index - 1] : null;
        const dayLabel = shortDayLabel(message.createdAt, locale);
        const startsDay = !previous || !isSameLocalDay(previous.createdAt, message.createdAt);
        const author = memberById.get(message.authorId);
        const status: MessageStatus | undefined = mine
          ? computeStatus(message, failedClientIds, otherLastReadAtMs)
          : undefined;

        return (
          <Fragment key={message.id}>
            {startsDay ? (
              <li
                role="separator"
                aria-label={dayLabel}
                className="text-micro text-ink-muted my-3 flex items-center gap-3 font-semibold"
              >
                <span aria-hidden="true" className="bg-line-soft h-px flex-1" />
                <span>{dayLabel}</span>
                <span aria-hidden="true" className="bg-line-soft h-px flex-1" />
              </li>
            ) : null}
            {/* `flex` + justify here, not only `self-end` inside MessageBubble:
                this wrapper is the flex child of the <ul>, so the bubble's own
                `self-end` was scoped to a full-width block and every outgoing
                message floated in the middle of the thread instead of hugging
                the end. */}
            <div
              ref={index === firstUnreadIndex ? firstUnreadRef : undefined}
              className={`group relative flex ${mine ? "justify-end" : "justify-start"} ${
                startsRun ? "mt-2 first:mt-0" : ""
              }`}
            >
              <MessageBubble
                side={mine ? "mine" : "theirs"}
                tail={tail}
                timestamp={showTimestamp ? shortTime(message.createdAt, locale) : null}
                status={status}
                authorName={
                  !mine && otherMember
                    ? `${otherMember.firstName} ${otherMember.lastName}`.trim()
                    : undefined
                }
                groupAuthor={
                  !mine && activeRoom?.isGroup && author
                    ? {
                        id: author.userId,
                        handle: author.handle,
                        firstName: author.firstName,
                        lastName: author.lastName,
                        avatarUrl: author.avatarUrl,
                      }
                    : undefined
                }
                edited={Boolean(message.editedAt)}
                deleted={Boolean(message.deletedAt)}
                onRetry={
                  message.clientMessageId
                    ? () => void onRetryFailed(message.clientMessageId as string)
                    : undefined
                }
                labels={{
                  ownPrefix: (time) => t("ownPrefix", { time }),
                  otherPrefix: (name, time) => t("otherPrefix", { name, time }),
                  failedHint: tSend("retry"),
                  statusSending: t("statusSending"),
                  statusSent: t("statusSent"),
                  statusDelivered: t("statusDelivered"),
                  statusRead: t("statusRead"),
                  statusFailed: tSend("failed"),
                  editedSuffix: t("editedSuffix"),
                  deletedBody: t("deletedBody"),
                }}
              >
                {message.body}
              </MessageBubble>
              {!message.id.startsWith("pending-") && !message.deletedAt ? (
                <div className="absolute end-0 top-0 hidden gap-1 group-focus-within:flex group-hover:flex">
                  {mine ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEdit(message)}
                        className="text-micro h-7 rounded-full px-2"
                      >
                        {t("edit.action")}
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        onClick={() => void onDelete(message)}
                        className="border-danger/40 bg-surface text-micro h-7 rounded-full border px-2"
                      >
                        {t("delete.action")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onReport(message)}
                      className="text-micro h-7 rounded-full px-2"
                    >
                      {tSafety("report.action")}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
          </Fragment>
        );
      })}
      {activeTyping && otherMember ? (
        <TypingIndicator
          label={t("typing", {
            name: `${otherMember.firstName} ${otherMember.lastName}`.trim() || otherMember.handle,
          })}
        />
      ) : null}
    </ul>
  );
}
