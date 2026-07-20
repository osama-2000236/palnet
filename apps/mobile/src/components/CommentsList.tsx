import {
  Comment as CommentSchema,
  CreateCommentBody,
  ReportReason,
  cursorPage,
  type Comment,
} from "@baydar/shared";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ReportSheet,
  nativeTokens,
  useThemeTokens,
  type ReportSheetLabels,
} from "@baydar/ui-native";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { useReport } from "@/api/safety";
import { apiFetch, apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const CommentsPage = cursorPage(CommentSchema);

export function CommentsList({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange?: (delta: number) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const tk = useThemeTokens();
  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
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
    const parsed = CreateCommentBody.safeParse({ body: draft });
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
      setItems((prev) => [...prev, created]);
      setDraft("");
      onCountChange?.(1);
    } finally {
      setBusy(false);
    }
  }

  const reportLabels: ReportSheetLabels = {
    title: t("safety.report.title"),
    detailsLabel: t("safety.report.details_label"),
    cancel: t("common.cancel"),
    submit: t("safety.report.submit"),
    close: t("safety.report.close"),
    reasons: {
      [ReportReason.SPAM]: t("safety.report.reason.spam"),
      [ReportReason.HARASSMENT]: t("safety.report.reason.harassment"),
      [ReportReason.HATE]: t("safety.report.reason.hate"),
      [ReportReason.MISINFORMATION]: t("safety.report.reason.misinformation"),
      [ReportReason.NUDITY]: t("safety.report.reason.nudity"),
      [ReportReason.VIOLENCE]: t("safety.report.reason.violence"),
      [ReportReason.OTHER]: t("safety.report.reason.other"),
    },
  };

  return (
    <View style={[styles.wrap, { borderTopColor: tk.color.lineSoft }]}>
      {items.map((c) => (
        <View key={c.id} style={[styles.comment, { backgroundColor: tk.color.surfaceMuted }]}>
          <View style={styles.commentHeader}>
            <Pressable onPress={() => router.push(`/(app)/in/${c.author.handle}`)}>
              <Text style={[styles.author, { color: tk.color.ink }]}>
                {c.author.firstName} {c.author.lastName}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setReportTargetId(c.id)}
              accessibilityRole="button"
              accessibilityLabel={t("safety.report.action")}
              style={styles.reportButton}
            >
              <Text style={[styles.caption, { color: tk.color.inkMuted }]}>
                {t("safety.report.action")}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.body, { color: tk.color.ink }]}>{c.body}</Text>
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

      <View style={styles.composerRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t("post.commentPlaceholder")}
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
  comment: {
    borderRadius: nativeTokens.radius.md,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: nativeTokens.space[2],
  },
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
  reportButton: {
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
