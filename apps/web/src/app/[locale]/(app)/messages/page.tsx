"use client";

import { Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

import { readSession } from "@/lib/session";

import { InboxList } from "./_components/InboxList";
import { RoomView } from "./_components/RoomView";
import { useRoomMessages } from "./_hooks/useRoomMessages";

export default function MessagesPage(): JSX.Element {
  const locale = useLocale();
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const messages = useRoomMessages({ token, viewerId });

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    setViewerId(session.user.id);
    setToken(session.tokens.accessToken);
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-[1128px] px-4 py-6 lg:px-6">
      <Surface
        as="div"
        variant="card"
        padding="0"
        className="grid min-h-[calc(100vh-8rem)] grid-cols-1 overflow-hidden md:grid-cols-[320px_minmax(0,1fr)]"
      >
        <InboxList
          activeRoomId={messages.activeRoomId}
          locale={locale}
          rooms={messages.filteredRooms}
          roomsError={messages.roomsError}
          onRetryRooms={messages.retryRooms}
          searchTerm={messages.searchTerm}
          viewerId={viewerId}
          onSearchTermChange={messages.setSearchTerm}
          onSelectRoom={messages.setActiveRoomId}
        />
        <RoomView
          activeRoom={messages.activeRoom}
          activeRoomId={messages.activeRoomId}
          actionMessage={messages.actionMessage}
          activeTyping={messages.activeTyping}
          draft={messages.draft}
          editingBody={messages.editingBody}
          error={messages.error}
          failedClientIds={messages.failedClientIds}
          firstUnreadIndex={messages.firstUnreadIndex}
          firstUnreadRef={messages.firstUnreadRef}
          grouped={messages.grouped}
          hasMore={messages.hasMore}
          locale={locale}
          memberById={messages.memberById}
          messages={messages.messages}
          otherLastReadAtMs={messages.otherLastReadAtMs}
          otherMember={messages.otherMember}
          otherOnline={messages.otherOnline}
          reportMessage={messages.reportMessage}
          sending={messages.sending}
          threadRef={messages.threadRef}
          unreadCount={messages.unreadCount}
          viewerId={viewerId}
          onCancelEdit={() => {
            messages.setActionMessage(null);
            messages.setEditingBody("");
          }}
          onDeleteMessage={messages.deleteMessage}
          onDraftChange={messages.setDraft}
          onEditMessage={(message) => {
            messages.setActionMessage(message);
            messages.setEditingBody(message.body);
          }}
          onEditingBodyChange={messages.setEditingBody}
          onLoadOlder={messages.loadOlder}
          onNewMessage={() => router.push(`/${locale}/messages/new`)}
          onReportMessage={messages.setReportMessage}
          onRetryFailed={messages.retryFailed}
          onSaveEdit={messages.saveEdit}
          onScrollToUnread={messages.scrollToUnread}
          onSetError={messages.setError}
          onSetReportMessage={messages.setReportMessage}
          onSubmit={messages.submit}
          onTyping={messages.postTypingThrottled}
        />
      </Surface>
    </div>
  );
}
