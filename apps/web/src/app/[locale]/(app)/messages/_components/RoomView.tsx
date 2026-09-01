"use client";

import type { ChatRoom, Message } from "@baydar/shared";
import { Avatar, Button, EmptyState, ReportDialog, cx, type GroupedMessage } from "@baydar/ui-web";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { MutableRefObject } from "react";

import { NeverPayBanner } from "@/components/NeverPayBanner";
import { useReport } from "@/lib/api/safety";

import { shortDate } from "../_utils";
import { MessageList } from "./MessageList";
import { RoomComposer } from "./RoomComposer";
import { useReportLabels } from "@/lib/report-labels";

export interface RoomViewProps {
  /** Whether the inbox holds any room at all, filters aside. */
  hasRooms: boolean;
  /** The room list failed to load — the inbox pane owns that message. */
  roomsFailed: boolean;
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
  hasRooms,
  roomsFailed,
}: RoomViewProps): JSX.Element {
  const t = useTranslations("messaging");
  const tSafety = useTranslations("safety");
  const report = useReport();
  const reportLabels = useReportLabels();

  if (!activeRoomId) {
    // "Pick a conversation to start reading" is an instruction, and with an
    // empty inbox there is nothing to pick. At 390px the two panes stack, so
    // the screen said "no conversations yet" and then asked the reader to
    // choose one, with two illustrations, one under the other. Above `md` the
    // panes sit side by side and the right one still needs to hold something,
    // so the prompt only disappears where it was a second answer to the same
    // question — and the inbox header already carries the new-message action.
    // And when the list did not merely come back empty but FAILED, the prompt
    // is wrong at every width: the inbox pane is already showing the error, so
    // this pane would be a second, cheerful answer to the same question. Caught
    // by e2e/error-states.spec.ts on its first run, at desktop width.
    if (roomsFailed) return <main className="hidden min-h-0 flex-col md:flex" />;
    return (
      <main className={cx("min-h-0 flex-col", hasRooms ? "flex" : "hidden md:flex")}>
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
            <span className="text-micro text-ink-muted">
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
              <span className="text-micro text-ink-muted">
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

      {/* Outside the scroll container on purpose: a payment demand arrives
          mid-thread, and a warning that scrolls away is not there when it does.
          Unconditional — a group room has no single counterpart to report, but
          the promise still holds there, so it degrades to notice-only rather
          than disappearing. */}
      <NeverPayBanner reportUserId={otherMember?.userId} />

      <div
        ref={threadRef}
        className="bg-surface-subtle flex flex-1 flex-col overflow-y-auto px-5 py-4"
      >
        {hasMore ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onLoadOlder}
            className="text-micro mb-3 h-7 self-center rounded-full px-3"
          >
            {t("loadOlder")}
          </Button>
        ) : null}

        {unreadCount > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onScrollToUnread}
            className="border-brand-200 bg-brand-100 text-micro text-brand-700 mb-3 h-7 self-center rounded-full px-3"
          >
            {t("unreadJump.banner", { count: unreadCount })}
          </Button>
        ) : null}

        {/* Bottom-anchors a short thread. A two-message conversation used to
            render at the top of a ~700px pane, putting the newest message as
            far as possible from the composer the user is about to type in;
            every messenger in the category stacks from the bottom edge.
            `mt-auto` on the content rather than `justify-end` on the scroll
            container: with `justify-content: flex-end` an overflowing thread
            has its oldest messages pushed past the scroll origin and they
            cannot be scrolled back to. An auto margin collapses to zero once
            the content is taller than the box, so a long thread is untouched. */}
        <div className="mt-auto">
          <MessageList
            activeRoom={activeRoom}
            activeTyping={activeTyping}
            loadFailed={Boolean(error)}
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
