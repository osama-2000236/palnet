import {
  computeStatus,
  isSameLocalDay,
  shortTime,
  type ChatRoom,
  type Message,
} from "@baydar/shared";
import {
  Button,
  MessageBubble,
  Surface,
  nativeTokens,
  type MessageBubbleLabels,
  useThemeTokens,
} from "@baydar/ui-native";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { dayLabel } from "./utils";

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
  loadOlderLabel,
  typingLabel,
  hasMore,
  loadingOlder,
  typingActive,
  refreshing,
  onRefresh,
  onLoadOlder,
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
  loadOlderLabel: string;
  typingLabel: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  typingActive: boolean;
  refreshing: boolean;
  onRefresh(): void;
  onLoadOlder(): void;
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
      ListHeaderComponent={
        hasMore ? (
          <Button
            variant="secondary"
            size="sm"
            loading={loadingOlder}
            onPress={onLoadOlder}
            style={{ alignSelf: "center", marginBottom: nativeTokens.space[2] }}
          >
            {loadOlderLabel}
          </Button>
        ) : null
      }
      ListFooterComponent={
        typingActive && typingLabel ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{
              // Theme colour must come from the hook, not static tokens, or this
              // stays light-ink in dark mode. No italic: Arabic has no italic form
              // and the faux slant reads as broken text in the primary language.
              color: c.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.caption.size,
              lineHeight: nativeTokens.type.scale.caption.line,
              paddingVertical: nativeTokens.space[2],
            }}
          >
            {typingLabel}
          </Text>
        ) : null
      }
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
  const c = useThemeTokens().color;
  const prev = messages[index - 1];
  const next = messages[index + 1];
  const mine = item.authorId === viewerId;
  const prevSameAuthor = prev && prev.authorId === item.authorId;
  const nextSameAuthor = next && next.authorId === item.authorId;
  const author = memberById.get(item.authorId);
  const newDay = !prev || !isSameLocalDay(prev.createdAt, item.createdAt);

  return (
    <View style={{ marginTop: prevSameAuthor ? 0 : nativeTokens.space[2] }}>
      {newDay ? (
        <Text
          accessibilityRole="header"
          style={{
            alignSelf: "center",
            color: c.inkSubtle,
            fontFamily: nativeTokens.type.family.sans,
            fontSize: nativeTokens.type.scale.caption.size,
            fontWeight: "600",
            backgroundColor: c.surfaceSubtle,
            borderRadius: nativeTokens.radius.full,
            paddingHorizontal: nativeTokens.space[3],
            paddingVertical: nativeTokens.space[1],
            marginVertical: nativeTokens.space[2],
            overflow: "hidden",
          }}
        >
          {dayLabel(item.createdAt, locale)}
        </Text>
      ) : null}
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
