// Message thread — ported to ui-native atoms.
// Uses MessageBubble (shared visual with web) with status derived from the
// same rules web uses (pending- id → sending, failed set → failed,
// otherLastReadAt → read, else sent).

import {
  AppHeader,
  Button,
  Icon,
  Input,
  MessageBubble,
  ReportSheet,
  Sheet,
  Surface,
  nativeTokens,
  type MessageStatus,
} from "@baydar/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { computeStatus, shortTime } from "@/components/messages/thread-helpers";
import { useRoomThread } from "@/components/messages/useRoomThread";
import { apiErrorMessage } from "@/lib/api-errors";

export default function MessageThreadScreen(): JSX.Element {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const params = useLocalSearchParams<{ roomId: string }>();
  const roomId = params.roomId;
  const thread = useRoomThread(roomId);
  const {
    t,
    room,
    messages,
    failedClientIds,
    draft,
    setDraft,
    sending,
    refreshing,
    error,
    setError,
    actionMessage,
    setActionMessage,
    reportMessage,
    setReportMessage,
    editingBody,
    setEditingBody,
    listRef,
    viewerId,
    otherName,
    title,
    otherLastReadAtMs,
    memberById,
    unreadCount,
    labels,
    reportLabels,
    report,
    submit,
    retryFailed,
    openMessageActions,
    saveEdit,
    deleteSelected,
    scrollToUnread,
    refreshThread,
  } = thread;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            backgroundColor: nativeTokens.color.surface,
            paddingHorizontal: nativeTokens.space[4],
          }}
        >
          <AppHeader
            title={title || t("messaging.title")}
            compact
            trailing={
              <Button variant="ghost" size="sm" onPress={() => router.back()}>
                {t("common.back")}
              </Button>
            }
          />
        </View>

        {unreadCount > 0 ? (
          <Pressable
            onPress={() => scrollToUnread(true)}
            accessibilityRole="button"
            accessibilityLabel={t("messaging.unreadJump.accessibility", { count: unreadCount })}
            style={{
              alignSelf: "center",
              marginTop: nativeTokens.space[2],
              borderRadius: nativeTokens.radius.full,
              backgroundColor: nativeTokens.color.brand100,
              paddingHorizontal: nativeTokens.space[3],
              paddingVertical: nativeTokens.space[1],
            }}
          >
            <Text
              style={{
                color: nativeTokens.color.brand700,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.caption.size,
                fontWeight: "700",
              }}
            >
              {t("messaging.unreadJump.banner", { count: unreadCount })}
            </Text>
          </Pressable>
        ) : null}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{
            padding: nativeTokens.space[3],
            gap: nativeTokens.space[2],
          }}
          renderItem={({ item, index }) => {
            const prev = messages[index - 1];
            const next = messages[index + 1];
            const mine = item.authorId === viewerId;
            const prevSameAuthor = prev && prev.authorId === item.authorId;
            const nextSameAuthor = next && next.authorId === item.authorId;
            const tail = !nextSameAuthor;
            const status: MessageStatus | undefined = mine
              ? computeStatus(item, failedClientIds, otherLastReadAtMs)
              : undefined;
            const author = memberById.get(item.authorId);
            return (
              <View style={{ marginTop: prevSameAuthor ? 0 : nativeTokens.space[2] }}>
                <Pressable
                  disabled={item.id.startsWith("pending-") || Boolean(item.deletedAt)}
                  onPress={() => (mine ? openMessageActions(item) : setReportMessage(item))}
                  onLongPress={() => (mine ? openMessageActions(item) : setReportMessage(item))}
                  accessibilityRole="button"
                  accessibilityLabel={mine ? t("messaging.edit.action") : t("safety.report.action")}
                >
                  <MessageBubble
                    side={mine ? "mine" : "theirs"}
                    tail={tail}
                    timestamp={tail ? shortTime(item.createdAt, locale) : null}
                    status={status}
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
                      item.clientMessageId
                        ? () => retryFailed(item.clientMessageId as string)
                        : undefined
                    }
                    labels={labels}
                  >
                    {item.body}
                  </MessageBubble>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            <Surface variant="tinted" padding="6">
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.body.size,
                  textAlign: "center",
                }}
              >
                {t("messaging.emptyThread")}
              </Text>
            </Surface>
          }
          onScrollToIndexFailed={() => {
            listRef.current?.scrollToEnd({ animated: false });
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshThread()}
              tintColor={nativeTokens.color.brand600}
              colors={[nativeTokens.color.brand600]}
            />
          }
        />

        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              borderTopWidth: 1,
              borderTopColor: nativeTokens.color.danger,
              backgroundColor: nativeTokens.color.dangerSoft,
              paddingHorizontal: nativeTokens.space[4],
              paddingVertical: nativeTokens.space[2],
            }}
          >
            <Text
              style={{
                color: nativeTokens.color.danger,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
              }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: nativeTokens.space[2],
            borderTopWidth: 1,
            borderTopColor: nativeTokens.color.lineSoft,
            backgroundColor: nativeTokens.color.surface,
            padding: nativeTokens.space[2],
          }}
        >
          <Input
            fullWidth
            testID="message-composer"
            value={draft}
            onChangeText={setDraft}
            placeholder={t("messaging.composePlaceholder")}
            multiline
            maxLength={5000}
            style={{ flex: 1 }}
            inputStyle={{
              flex: 1,
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.body.size,
              maxHeight: nativeTokens.space[24] + nativeTokens.space[6],
            }}
          />
          <Button
            disabled={sending || draft.trim().length === 0}
            onPress={() => void submit()}
            loading={sending}
            accessibilityLabel={t("messaging.send")}
            testID="messages-send-button"
            size="lg"
            leading={<Icon name="send" size={18} color={nativeTokens.color.inkInverse} />}
          >
            {t("messaging.send")}
          </Button>
        </View>

        <Sheet
          open={Boolean(actionMessage)}
          onClose={() => {
            setActionMessage(null);
            setEditingBody("");
          }}
          title={t("messaging.edit.sheetTitle")}
          closeLabel={t("common.cancel", { defaultValue: "إلغاء" })}
        >
          <Input
            fullWidth
            value={editingBody}
            onChangeText={setEditingBody}
            multiline
            maxLength={5000}
            placeholder={t("messaging.composePlaceholder")}
            inputStyle={{
              minHeight: nativeTokens.space[24],
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.body.size,
              textAlignVertical: "top",
            }}
          />
          <Button
            fullWidth
            disabled={editingBody.trim().length === 0}
            onPress={() => void saveEdit()}
          >
            {t("messaging.edit.save")}
          </Button>
          <Button fullWidth variant="danger-ghost" onPress={() => void deleteSelected()}>
            {t("messaging.delete.action")}
          </Button>
        </Sheet>
        {reportMessage ? (
          <ReportSheet
            open
            onOpenChange={(next) => {
              if (!next) setReportMessage(null);
            }}
            target={{ kind: "message", id: reportMessage.id }}
            labels={reportLabels}
            submitting={report.isPending}
            onSubmit={(input) => {
              report.mutate(input, {
                onSuccess: () => setReportMessage(null),
                onError: (caught) => setError(apiErrorMessage(t, caught)),
              });
            }}
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
