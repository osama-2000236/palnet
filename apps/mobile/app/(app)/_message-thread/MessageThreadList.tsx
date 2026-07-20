import { type ChatRoom, type Message } from "@baydar/shared";
import {
  MessageBubble,
  Surface,
  nativeTokens,
  type MessageBubbleLabels,
  useThemeTokens,
} from "@baydar/ui-native";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { computeStatus, shortTime } from "./utils";

export function MessageThreadList({
  listRef,
  messages,
  viewerId,
  room,
  locale,
  failedClientIds,
  otherName,
  otherLastReadAtMs,
  memberById,
  labels,
  emptyLabel,
  refreshing,
  onRefresh,
  onRetryFailed,
  onOpenOwnActions,
  onReportOther,
}: {
  listRef: React.MutableRefObject<FlatList<Message> | null>;
  messages: Message[];
  viewerId: string | null;
  room: ChatRoom | null;
  locale: string;
  failedClientIds: Set<string>;
  otherName: string;
  otherLastReadAtMs: number;
  memberById: Map<string, ChatRoom["members"][number]>;
  labels: MessageBubbleLabels;
  emptyLabel: string;
  refreshing: boolean;
  onRefresh(): void;
  onRetryFailed(clientMessageId: string): void;
  onOpenOwnActions(message: Message): void;
  onReportOther(message: Message): void;
}): JSX.Element {
  const c = useThemeTokens().color;
  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(message) => message.id}
      contentContainerStyle={{ padding: nativeTokens.space[3], gap: nativeTokens.space[2] }}
      renderItem={({ item, index }) => (
        <MessageRow
          item={item}
          index={index}
          messages={messages}
          viewerId={viewerId}
          room={room}
          locale={locale}
          failedClientIds={failedClientIds}
          otherName={otherName}
          otherLastReadAtMs={otherLastReadAtMs}
          memberById={memberById}
          labels={labels}
          onRetryFailed={onRetryFailed}
          onOpenOwnActions={onOpenOwnActions}
          onReportOther={onReportOther}
        />
      )}
      ListEmptyComponent={
        <Surface variant="tinted" padding="6">
          <Text
            style={{
              color: c.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.body.size,
              textAlign: "center",
            }}
          >
            {emptyLabel}
          </Text>
        </Surface>
      }
      onScrollToIndexFailed={() => listRef.current?.scrollToEnd({ animated: false })}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.brand600}
          colors={[c.brand600]}
        />
      }
    />
  );
}

function MessageRow({
  item,
  index,
  messages,
  viewerId,
  room,
  locale,
  failedClientIds,
  otherName,
  otherLastReadAtMs,
  memberById,
  labels,
  onRetryFailed,
  onOpenOwnActions,
  onReportOther,
}: {
  item: Message;
  index: number;
  messages: Message[];
  viewerId: string | null;
  room: ChatRoom | null;
  locale: string;
  failedClientIds: Set<string>;
  otherName: string;
  otherLastReadAtMs: number;
  memberById: Map<string, ChatRoom["members"][number]>;
  labels: MessageBubbleLabels;
  onRetryFailed(clientMessageId: string): void;
  onOpenOwnActions(message: Message): void;
  onReportOther(message: Message): void;
}): JSX.Element {
  const prev = messages[index - 1];
  const next = messages[index + 1];
  const mine = item.authorId === viewerId;
  const prevSameAuthor = prev && prev.authorId === item.authorId;
  const nextSameAuthor = next && next.authorId === item.authorId;
  const author = memberById.get(item.authorId);

  return (
    <View style={{ marginTop: prevSameAuthor ? 0 : nativeTokens.space[2] }}>
      <Pressable
        disabled={item.id.startsWith("pending-") || Boolean(item.deletedAt)}
        onLongPress={() => (mine ? onOpenOwnActions(item) : onReportOther(item))}
        accessibilityRole="button"
        accessibilityLabel={mine ? labels.editedSuffix : labels.otherPrefix(otherName, "")}
      >
        <MessageBubble
          side={mine ? "mine" : "theirs"}
          tail={!nextSameAuthor}
          timestamp={!nextSameAuthor ? shortTime(item.createdAt, locale) : null}
          status={mine ? computeStatus(item, failedClientIds, otherLastReadAtMs) : undefined}
          authorName={!mine ? otherName : undefined}
          groupAuthor={
            !mine && room?.isGroup && author
              ? {
                  id: author.userId,
                  handle: author.handle,
                  firstName: author.firstName,
                  lastName: author.lastName,
                  avatarUrl: author.avatarUrl ?? null,
                }
              : undefined
          }
          edited={Boolean(item.editedAt)}
          deleted={Boolean(item.deletedAt)}
          onRetry={
            item.clientMessageId ? () => onRetryFailed(item.clientMessageId as string) : undefined
          }
          labels={labels}
        >
          {item.body}
        </MessageBubble>
      </Pressable>
    </View>
  );
}
