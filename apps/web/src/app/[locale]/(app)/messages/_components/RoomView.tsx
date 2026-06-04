"use client";

import { ReportReason, type ChatRoom, type Message } from "@baydar/shared";
import {
  Avatar,
  Button,
  EmptyState,
  ReportDialog,
  type GroupedMessage,
  type ReportDialogLabels,
} from "@baydar/ui-web";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MutableRefObject } from "react";

import { useReport } from "@/lib/api/safety";

import { shortDate } from "../_utils";
import { MessageList } from "./MessageList";
import { RoomComposer } from "./RoomComposer";

export interface RoomViewProps {
  activeRoomId: string | null;
  activeRoom: ChatRoom | null;
  actionMessage: Message | null;
  activeTyping: { userId: string; expiresAt: number } | null;
  draft: string;
  editingBody: string;
  error: string | null;
  failedClientIds: Set<string>;
  firstUnreadIndex: number;
  firstUnreadRef: MutableRefObject<HTMLDivElement | null>;
  grouped: GroupedMessage<Message>[];
  hasMore: boolean;
  locale: string;
  memberById: Map<string, ChatRoom["members"][number]>;
  messages: Message[];
  otherLastReadAtMs: number;
  otherMember: ChatRoom["members"][number] | null;
  otherOnline: boolean;
  reportMessage: Message | null;
  sending: boolean;
  threadRef: MutableRefObject<HTMLDivElement | null>;
  unreadCount: number;
  viewerId: string | null;
  onCancelEdit(): void;
  onDeleteMessage(message: Message): Promise<void>;
  onDraftChange(value: string): void;
  onEditMessage(message: Message): void;
  onEditingBodyChange(value: string): void;
  onLoadOlder(): void;
  onNewMessage(): void;
  onReportMessage(message: Message): void;
  onRetryFailed(clientMessageId: string): Promise<void>;
  onSaveEdit(): Promise<void>;
  onScrollToUnread(): void;
  onSetError(value: string | null): void;
  onSetReportMessage(value: Message | null): void;
  onSubmit(): Promise<void>;
  onTyping(): void;
}

export function RoomView({
  activeRoomId,
  activeRoom,
  actionMessage,
  activeTyping,
  draft,
  editingBody,
  error,
  failedClientIds,
  firstUnreadIndex,
  firstUnreadRef,
  grouped,
  hasMore,
  locale,
  memberById,
  messages,
  otherLastReadAtMs,
  otherMember,
  otherOnline,
  reportMessage,
  sending,
  threadRef,
  unreadCount,
  viewerId,
  onCancelEdit,
  onDeleteMessage,
  onDraftChange,
  onEditMessage,
  onEditingBodyChange,
  onLoadOlder,
  onNewMessage,
  onReportMessage,
  onRetryFailed,
  onSaveEdit,
  onScrollToUnread,
  onSetError,
  onSetReportMessage,
  onSubmit,
  onTyping,
}: RoomViewProps): JSX.Element {
  const t = useTranslations("messaging");
  const tCommon = useTranslations("common");
  const tSafety = useTranslations("safety");
  const report = useReport();
  const reportLabels: ReportDialogLabels = {
    title: tSafety("report.title"),
    detailsLabel: tSafety("report.details_label"),
    cancel: tCommon("cancel"),
    submit: tSafety("report.submit"),
    close: tSafety("report.close"),
    reasons: {
      [ReportReason.SPAM]: tSafety("report.reason.spam"),
      [ReportReason.HARASSMENT]: tSafety("report.reason.harassment"),
      [ReportReason.HATE]: tSafety("report.reason.hate"),
      [ReportReason.MISINFORMATION]: tSafety("report.reason.misinformation"),
      [ReportReason.NUDITY]: tSafety("report.reason.nudity"),
      [ReportReason.VIOLENCE]: tSafety("report.reason.violence"),
      [ReportReason.OTHER]: tSafety("report.reason.other"),
    },
  };

  if (!activeRoomId) {
    return (
      <main className="flex min-h-0 flex-col">
        <div className="flex flex-1 items-center justify-center p-8">
          <EmptyState
            motif="messages"
            title={t("selectPrompt")}
            cta={t("newMessage")}
            onAction={onNewMessage}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-0 flex-col">
      <header className="border-line-soft flex items-center gap-3 border-b px-5 py-3">
        {activeRoom?.isGroup ? (
          <div className="flex min-w-0 flex-col">
            <span className="text-ink truncate text-sm font-semibold">
              {activeRoom.title ?? activeRoom.id}
            </span>
            <span className="text-ink-muted text-[11px]">
              {t("newGroup.memberCount", { count: activeRoom.members.length })}
            </span>
          </div>
        ) : otherMember ? (
          <>
            <Link
              href={`/in/${otherMember.handle}`}
              aria-label={`${otherMember.firstName} ${otherMember.lastName}`.trim()}
            >
              <Avatar
                user={{
                  id: otherMember.userId,
                  handle: otherMember.handle,
                  firstName: otherMember.firstName,
                  lastName: otherMember.lastName,
                  avatarUrl: otherMember.avatarUrl,
                }}
                size="md"
                online={otherOnline}
              />
            </Link>
            <div className="flex min-w-0 flex-col">
              <Link
                href={`/in/${otherMember.handle}`}
                className="text-ink truncate text-sm font-semibold hover:underline"
              >
                {`${otherMember.firstName} ${otherMember.lastName}`.trim() || otherMember.handle}
              </Link>
              <span className="text-ink-muted text-[11px]">
                {otherOnline
                  ? t("onlineNow")
                  : otherMember.lastSeenAt
                    ? `${t("lastSeen")} · ${shortDate(otherMember.lastSeenAt, locale)}`
                    : ""}
              </span>
            </div>
          </>
        ) : (
          <span className="text-ink text-sm font-semibold">
            {activeRoom?.title ?? activeRoomId}
          </span>
        )}
      </header>

      <div
        ref={threadRef}
        className="bg-surface-subtle flex flex-1 flex-col overflow-y-auto px-5 py-4"
      >
        {hasMore ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadOlder}
            className="mb-3 h-7 self-center rounded-full px-3 text-[11px]"
          >
            {t("loadOlder")}
          </Button>
        ) : null}

        {unreadCount > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onScrollToUnread}
            className="bg-brand-100 text-brand-700 border-brand-200 mb-3 h-7 self-center rounded-full px-3 text-[11px]"
          >
            {t("unreadJump.banner", { count: unreadCount })}
          </Button>
        ) : null}

        <MessageList
          activeRoom={activeRoom}
          activeTyping={activeTyping}
          failedClientIds={failedClientIds}
          firstUnreadIndex={firstUnreadIndex}
          firstUnreadRef={firstUnreadRef}
          grouped={grouped}
          locale={locale}
          memberById={memberById}
          messages={messages}
          otherLastReadAtMs={otherLastReadAtMs}
          otherMember={otherMember}
          viewerId={viewerId}
          onDelete={onDeleteMessage}
          onEdit={onEditMessage}
          onNewMessage={onNewMessage}
          onReport={onReportMessage}
          onRetryFailed={onRetryFailed}
        />
      </div>

      <RoomComposer
        actionMessage={actionMessage}
        draft={draft}
        editingBody={editingBody}
        error={error}
        sending={sending}
        onCancelEdit={onCancelEdit}
        onDraftChange={onDraftChange}
        onEditingBodyChange={onEditingBodyChange}
        onSaveEdit={onSaveEdit}
        onSubmit={onSubmit}
        onTyping={onTyping}
      />

      {reportMessage ? (
        <ReportDialog
          open
          onOpenChange={(next) => {
            if (!next) onSetReportMessage(null);
          }}
          target={{ kind: "message", id: reportMessage.id }}
          labels={reportLabels}
          submitting={report.isPending}
          onSubmit={(input) => {
            report.mutate(input, {
              onSuccess: () => onSetReportMessage(null),
              onError: () => onSetError(tSafety("report.error")),
            });
          }}
        />
      ) : null}
    </main>
  );
}
