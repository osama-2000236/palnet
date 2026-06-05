"use client";

import type { ChatRoom } from "@baydar/shared";
import { EmptyState, Icon, Input, RoomRow } from "@baydar/ui-web";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ONLINE_WINDOW_MS, shortTime } from "../_utils";

export interface InboxListProps {
  rooms: ChatRoom[];
  activeRoomId: string | null;
  viewerId: string | null;
  locale: string;
  searchTerm: string;
  onSearchTermChange(value: string): void;
  onSelectRoom(roomId: string): void;
}

export function InboxList({
  rooms,
  activeRoomId,
  viewerId,
  locale,
  searchTerm,
  onSearchTermChange,
  onSelectRoom,
}: InboxListProps): JSX.Element {
  const t = useTranslations("messaging");

  return (
    <aside className="border-line-soft flex min-h-0 flex-col md:border-e">
      <div className="border-line-soft flex items-center justify-between gap-2 border-b px-4 py-3">
        <h1 className="text-ink text-base font-semibold">{t("title")}</h1>
        <Link
          href="/messages/new"
          aria-label={t("newMessage")}
          className="text-ink-muted hover:bg-surface-subtle hover:text-ink focus-visible:ring-brand-600 inline-flex h-8 w-8 items-center justify-center rounded-md focus:outline-none focus-visible:ring-2"
        >
          <Icon name="plus" size={18} />
        </Link>
      </div>
      <div className="px-3 py-2">
        <Input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          size="sm"
          fullWidth
          leading={<Icon name="search" size={14} />}
          className="rounded-full"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <EmptyState
            variant="inline"
            motif={searchTerm ? "search" : "messages"}
            title={searchTerm ? t("searchNoResults") : t("emptyList")}
          />
        ) : (
          rooms.map((room) => {
            const other = viewerId
              ? room.members.find((member) => member.userId !== viewerId)
              : null;
            const online =
              other?.lastSeenAt != null &&
              Date.now() - Date.parse(other.lastSeenAt) < ONLINE_WINDOW_MS;
            return (
              <RoomRow
                key={room.id}
                user={
                  room.isGroup
                    ? { handle: room.title ?? room.id }
                    : other
                      ? {
                          id: other.userId,
                          handle: other.handle,
                          firstName: other.firstName,
                          lastName: other.lastName,
                          avatarUrl: other.avatarUrl,
                        }
                      : { handle: room.title ?? room.id }
                }
                preview={room.lastMessage?.body ?? ""}
                timestamp={shortTime(room.updatedAt, locale)}
                unreadCount={room.unreadCount}
                online={online}
                active={room.id === activeRoomId}
                onClick={() => onSelectRoom(room.id)}
              />
            );
          })
        )}
      </div>
    </aside>
  );
}
