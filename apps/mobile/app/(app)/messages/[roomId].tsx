import {
  AppHeader,
  Avatar,
  Button,
  nativeTokens,
  type MessageBubbleLabels,
  useThemeTokens,
} from "@baydar/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MessageThreadComposer } from "../_message-thread/MessageThreadComposer";
import { MessageThreadList } from "../_message-thread/MessageThreadList";
import { MessageThreadSheets } from "../_message-thread/MessageThreadSheets";
import { ThreadErrorBanner, UnreadJumpBanner } from "../_message-thread/MessageThreadBanner";
import { useMessageThread } from "../_message-thread/useMessageThread";

export default function MessageThreadScreen(): JSX.Element {
  const c = useThemeTokens().color;
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ roomId: string }>();
  const thread = useMessageThread(params.roomId);
  const bubbleLabels = useBubbleLabels();
  const other =
    thread.viewerId && thread.room && !thread.room.isGroup
      ? (thread.room.members.find((m) => m.userId !== thread.viewerId) ?? null)
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surfaceMuted }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            backgroundColor: c.surface,
            paddingHorizontal: nativeTokens.space[4],
          }}
        >
          <AppHeader
            title={thread.title || t("messaging.title")}
            compact
            leading={
              other ? (
                <Avatar
                  size="sm"
                  user={{
                    id: other.userId,
                    handle: other.handle,
                    firstName: other.firstName,
                    lastName: other.lastName,
                    avatarUrl: other.avatarUrl ?? null,
                  }}
                />
              ) : undefined
            }
            trailing={
              <Button variant="ghost" size="sm" onPress={() => router.back()}>
                {t("common.back")}
              </Button>
            }
          />
        </View>

        <UnreadJumpBanner
          count={thread.unreadCount}
          label={t("messaging.unreadJump.banner", { count: thread.unreadCount })}
          accessibilityLabel={t("messaging.unreadJump.accessibility", {
            count: thread.unreadCount,
          })}
          onPress={() => thread.scrollToUnread(true)}
        />

        <MessageThreadList
          listRef={thread.listRef}
          messages={thread.messages}
          viewerId={thread.viewerId}
          room={thread.room}
          locale={i18n.language}
          failedClientIds={thread.failedClientIds}
          otherName={thread.otherName}
          otherLastReadAtMs={thread.otherLastReadAtMs}
          memberById={thread.memberById}
          labels={bubbleLabels}
          emptyLabel={t("messaging.emptyThread")}
          refreshing={thread.refreshing}
          onRefresh={() => void thread.refreshThread()}
          onRetryFailed={thread.retryFailed}
          onOpenOwnActions={thread.openMessageActions}
          onReportOther={thread.setReportMessage}
        />

        <ThreadErrorBanner error={thread.error} />

        <MessageThreadComposer
          draft={thread.draft}
          sending={thread.sending}
          placeholder={t("messaging.composePlaceholder")}
          sendLabel={t("messaging.send")}
          onDraftChange={thread.setDraft}
          onSubmit={() => void thread.submit()}
        />

        <MessageThreadSheets
          actionMessage={thread.actionMessage}
          reportMessage={thread.reportMessage}
          editingBody={thread.editingBody}
          onEditingBodyChange={thread.setEditingBody}
          onCloseActions={thread.closeActions}
          onSaveEdit={() => void thread.saveEdit()}
          onDeleteSelected={() => void thread.deleteSelected()}
          onCloseReport={() => thread.setReportMessage(null)}
          onError={thread.setError}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function useBubbleLabels(): MessageBubbleLabels {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      ownPrefix: (time) => t("messaging.ownPrefix", { time }),
      otherPrefix: (name, time) => t("messaging.otherPrefix", { name, time }),
      failedHint: t("messages.send.retry"),
      statusSending: t("messaging.status.sending"),
      statusSent: t("messaging.status.sent"),
      statusDelivered: t("messaging.status.delivered"),
      statusRead: t("messaging.status.read"),
      statusFailed: t("messages.send.failed"),
      editedSuffix: t("messaging.editedSuffix"),
      deletedBody: t("messaging.deletedBody"),
    }),
    [t],
  );
}
