// MessageBubble — native twin of the web atom.
// Same prop shape (side / tail / timestamp / status / labels) so the call
// site from a screen can share translation blobs with web.
//
// Own bubbles use brand-100 fill + brand-200 border (NOT brand-600) to keep
// the thread from reading as a wall of CTAs.
//
// Tail corner: we flip the tight corner based on `side`. RN doesn't have
// logical corner properties yet, so we reverse the ends under RTL via
// I18nManager.isRTL at render time.

import type { ReactNode } from "react";
import { I18nManager, Pressable, Text, View } from "react-native";

import { Icon } from "./Icon";
import { nativeTokens } from "./tokens";

export type MessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface MessageBubbleLabels {
  ownPrefix(time: string): string;
  otherPrefix(name: string, time: string): string;
  failedHint: string;
  statusSending: string;
  statusSent: string;
  statusDelivered: string;
  statusRead: string;
  statusFailed: string;
}

export interface MessageBubbleProps {
  side: "mine" | "theirs";
  tail?: boolean;
  timestamp?: string | null;
  status?: MessageStatus;
  authorName?: string;
  onRetry?(): void;
  labels: MessageBubbleLabels;
  children: ReactNode;
}

const RADIUS = 14;
const TAIL_RADIUS = 4;

export function MessageBubble({
  side,
  tail = true,
  timestamp,
  status,
  authorName,
  onRetry,
  labels,
  children,
}: MessageBubbleProps): JSX.Element {
  const mine = side === "mine";
  const srPrefix = mine
    ? labels.ownPrefix(timestamp ?? "")
    : labels.otherPrefix(authorName ?? "", timestamp ?? "");

  // Tight corner on the author-side end. Under RTL, "end" physically flips,
  // so we swap start/end corners to keep the tail on the author side.
  const rtl = I18nManager.isRTL;
  const ownTailCorner = tail && mine
    ? rtl
      ? { borderBottomLeftRadius: TAIL_RADIUS }
      : { borderBottomRightRadius: TAIL_RADIUS }
    : null;
  const theirTailCorner = tail && !mine
    ? rtl
      ? { borderBottomRightRadius: TAIL_RADIUS }
      : { borderBottomLeftRadius: TAIL_RADIUS }
    : null;

  return (
    <View
      accessible
      accessibilityLabel={srPrefix}
      style={{
        maxWidth: "70%",
        alignSelf: mine ? "flex-end" : "flex-start",
        alignItems: mine ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          borderRadius: RADIUS,
          borderWidth: 1,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: mine
            ? nativeTokens.color.brand100
            : nativeTokens.color.surface,
          borderColor: mine
            ? nativeTokens.color.brand200
            : nativeTokens.color.lineSoft,
          ...(status === "failed"
            ? { borderColor: nativeTokens.color.danger }
            : null),
          ...ownTailCorner,
          ...theirTailCorner,
        }}
      >
        {typeof children === "string" ? (
          <Text
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.body.size,
              lineHeight: nativeTokens.type.scale.body.line,
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>

      {timestamp || (mine && status) ? (
        <View
          style={{
            marginTop: 2,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          {timestamp ? (
            <Text
              // Timestamps stay LTR even in Arabic threads (01:23 not ٢٣:٠١).
              style={{
                writingDirection: "ltr",
                color: nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: 11,
              }}
            >
              {timestamp}
            </Text>
          ) : null}
          {mine && status ? (
            <StatusTick
              status={status}
              labels={labels}
              onRetry={status === "failed" ? onRetry : undefined}
            />
          ) : null}
        </View>
      ) : null}

      {status === "failed" ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          hitSlop={8}
          style={{ marginTop: 2 }}
        >
          <Text
            style={{
              fontSize: 11,
              color: nativeTokens.color.danger,
              fontFamily: nativeTokens.type.family.sans,
            }}
          >
            {labels.failedHint}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatusTick({
  status,
  labels,
  onRetry,
}: {
  status: MessageStatus;
  labels: MessageBubbleLabels;
  onRetry?: () => void;
}): JSX.Element {
  switch (status) {
    case "sending":
      return (
        <View accessibilityLabel={labels.statusSending}>
          <Icon name="clock" size={12} color={nativeTokens.color.inkMuted} />
        </View>
      );
    case "sent":
      return (
        <View accessibilityLabel={labels.statusSent}>
          <Icon name="check" size={14} color={nativeTokens.color.inkMuted} />
        </View>
      );
    case "delivered":
      return (
        <View accessibilityLabel={labels.statusDelivered}>
          <Icon
            name="check-double"
            size={14}
            color={nativeTokens.color.inkMuted}
          />
        </View>
      );
    case "read":
      return (
        <View accessibilityLabel={labels.statusRead}>
          <Icon
            name="check-double"
            size={14}
            color={nativeTokens.color.brand600}
          />
        </View>
      );
    case "failed":
      return (
        <Pressable
          onPress={onRetry}
          accessibilityLabel={labels.statusFailed}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Icon name="x" size={14} color={nativeTokens.color.danger} />
        </Pressable>
      );
    default:
      return <View />;
  }
}
