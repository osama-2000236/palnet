import {
  Comment as CommentSchema,
  CreateCommentBody,
  cursorPage,
  type Comment,
} from "@baydar/shared";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, ReportSheet, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useReport } from "@/api/safety";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { useReportLabels } from "@/lib/report-labels";
import { getAccessToken } from "@/lib/session";

const CommentsPage = cursorPage(CommentSchema);

/** Threads are one level deep: replying to a reply answers its root. */
type ReplyTarget = { rootId: string; name: string };

export function CommentsList({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange?: (delta: number) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const reportLabels = useReportLabels();
  const tk = useThemeTokens();
  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const inputRef = useRef<TextInput>(null);
  const report = useReport();

  const load = useCallback(
    async (after: string | null): Promise<void> => {
      setLoading(true);
      try {
        const token = (await getAccessToken()) ?? undefined;
        const qs = new URLSearchParams({ limit: "20" });
        if (after) qs.set("after", after);
        const page = await apiFetchPage(
          `/posts/${postId}/comments?${qs.toString()}`,
          CommentsPage,
          { token },
        );
        setItems((prev) => (after ? [...prev, ...page.data] : page.data));
        setCursor(page.meta.nextCursor);
        setHasMore(page.meta.hasMore);
      } finally {
        setLoading(false);
      }
    },
    [postId],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  async function submit(): Promise<void> {
    const parsed = CreateCommentBody.safeParse({ body: draft, parentId: replyTo?.rootId });
    if (!parsed.success) return;
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const created = await apiFetch(`/posts/${postId}/comments`, CommentSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      const rootId = replyTo?.rootId;
      setItems((prev) =>
        rootId
          ? prev.map((c) =>
              c.id === rootId ? { ...c, replies: [...(c.replies ?? []), created] } : c,
            )
          : [...prev, created],
      );
      setDraft("");
      setReplyTo(null);
      onCountChange?.(1);
    } finally {
      setBusy(false);
    }
  }

  function renderComment(c: Comment, rootId: string): JSX.Element {
    const name = `${c.author.firstName} ${c.author.lastName}`.trim();
    const openProfile = (): void => router.push(`/(app)/in/${c.author.handle}`);
    return (
      <View style={[styles.comment, { backgroundColor: tk.color.surfaceMuted }]}>
        <Pressable onPress={openProfile} accessibilityRole="link" accessibilityLabel={name}>
          <Avatar user={c.author} size="sm" />
        </Pressable>
        <View style={styles.commentMain}>
          <Pressable onPress={openProfile}>
            <Text style={[styles.author, { color: tk.color.ink }]}>{name}</Text>
          </Pressable>
          <Text style={[styles.body, { color: tk.color.ink }]}>{c.body}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                setReplyTo({ rootId, name });
                inputRef.current?.focus();
              }}
              accessibilityRole="button"
              style={styles.action}
            >
              <Text style={[styles.caption, { color: tk.color.inkMuted }]}>{t("post.reply")}</Text>
            </Pressable>
            <Pressable
              onPress={() => setReportTargetId(c.id)}
              accessibilityRole="button"
              accessibilityLabel={t("safety.report.action")}
              style={styles.action}
            >
              <Text style={[styles.caption, { color: tk.color.inkMuted }]}>
                {t("safety.report.action")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { borderTopColor: tk.color.lineSoft }]}>
      {items.map((c) => (
        <View key={c.id} style={styles.thread}>
          {renderComment(c, c.id)}
          {c.replies?.length ? (
            <View style={styles.replies}>
              {c.replies.map((r) => (
                <View key={r.id}>{renderComment(r, c.id)}</View>
              ))}
            </View>
          ) : null}
        </View>
      ))}

      {hasMore ? (
        <Pressable onPress={() => void load(cursor)} disabled={loading}>
          <Text style={[styles.caption, { color: tk.color.inkMuted }]}>
            {t("post.loadMoreComments")}
          </Text>
        </Pressable>
      ) : null}

      {loading ? <ActivityIndicator /> : null}

      {replyTo ? (
        <View style={styles.actions}>
          <Text style={[styles.caption, { color: tk.color.inkMuted }]}>
            {t("post.replyingTo", { name: replyTo.name })}
          </Text>
          <Pressable
            onPress={() => setReplyTo(null)}
            accessibilityRole="button"
            style={styles.action}
          >
            <Text style={[styles.caption, { color: tk.color.inkMuted }]}>
              {t("post.cancelReply")}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.composerRow}>
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          placeholder={replyTo ? t("post.replyPlaceholder") : t("post.commentPlaceholder")}
          placeholderTextColor={tk.color.inkSubtle}
          maxLength={2000}
          style={[
            styles.input,
            {
              borderColor: tk.color.lineHard,
              backgroundColor: tk.color.surface,
              color: tk.color.ink,
            },
          ]}
        />
        <Pressable
          onPress={submit}
          disabled={busy || draft.trim().length === 0}
          style={[styles.submit, { backgroundColor: tk.color.brand600 }]}
        >
          <Text style={[styles.submitLabel, { color: tk.color.inkInverse }]}>
            {t("post.commentSubmit")}
          </Text>
        </Pressable>
      </View>
      {reportTargetId ? (
        <ReportSheet
          open
          onOpenChange={(next) => {
            if (!next) setReportTargetId(null);
          }}
          target={{ kind: "comment", id: reportTargetId }}
          labels={reportLabels}
          submitting={report.isPending}
          onSubmit={(input) => {
            report.mutate(input, {
              onSuccess: () => setReportTargetId(null),
            });
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: nativeTokens.space[3],
    gap: nativeTokens.space[2],
    borderTopWidth: 1,
    paddingTop: nativeTokens.space[3],
  },
  thread: { gap: nativeTokens.space[2] },
  // Lines a reply's avatar up under its root's body, as web's `ms-10` does.
  replies: { marginStart: nativeTokens.space[10], gap: nativeTokens.space[2] },
  comment: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: nativeTokens.space[2],
    borderRadius: nativeTokens.radius.md,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
  },
  commentMain: { flex: 1, minWidth: 0 },
  actions: { flexDirection: "row", alignItems: "center", gap: nativeTokens.space[2] },
  author: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    fontWeight: "600",
  },
  caption: {
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.caption.size,
    lineHeight: nativeTokens.type.scale.caption.line,
  },
  body: {
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
  },
  action: {
    minHeight: nativeTokens.chrome.minHit,
    justifyContent: "center",
    borderRadius: nativeTokens.radius.md,
    paddingHorizontal: nativeTokens.space[2],
  },
  composerRow: {
    marginTop: nativeTokens.space[1],
    flexDirection: "row",
    gap: nativeTokens.space[2],
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: nativeTokens.radius.md,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
    fontFamily: nativeTokens.type.family.body,
    fontSize: nativeTokens.type.scale.body.size,
  },
  submit: {
    borderRadius: nativeTokens.radius.md,
    paddingHorizontal: nativeTokens.space[3],
    justifyContent: "center",
  },
  submitLabel: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.caption.size,
    fontWeight: "600",
  },
});
