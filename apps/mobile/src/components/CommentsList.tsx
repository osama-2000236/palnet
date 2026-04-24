import {
  Comment as CommentSchema,
  CreateCommentBody,
  cursorPage,
  type Comment,
} from "@palnet/shared";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

import { ReportDialog } from "@/components/ReportDialog";
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
  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);

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

  return (
    <View className="border-ink-muted/10 mt-3 gap-2 border-t pt-3">
      {items.map((c) => (
        <View key={c.id} className="bg-surface-muted rounded-md px-3 py-2">
          <Pressable onPress={() => router.push(`/(app)/in/${c.author.handle}`)}>
            <Text className="text-ink font-semibold">
              {c.author.firstName} {c.author.lastName}
            </Text>
          </Pressable>
          <Text className="text-ink">{c.body}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setReportCommentId(c.id)}
            className="mt-1 self-start rounded px-1 py-0.5"
          >
            <Text className="text-ink-muted text-xs">{t("moderation.reportComment")}</Text>
          </Pressable>
        </View>
      ))}

      {hasMore ? (
        <Pressable onPress={() => void load(cursor)} disabled={loading}>
          <Text className="text-ink-muted text-xs">{t("post.loadMoreComments")}</Text>
        </Pressable>
      ) : null}

      {loading ? <ActivityIndicator /> : null}

      <View className="mt-1 flex-row gap-2">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t("post.commentPlaceholder")}
          maxLength={2000}
          className="border-ink-muted/30 bg-surface text-ink flex-1 rounded-md border px-3 py-1.5"
        />
        <Pressable
          onPress={submit}
          disabled={busy || draft.trim().length === 0}
          className="bg-brand-600 rounded-md px-3 py-1.5"
        >
          <Text className="text-ink-inverse text-xs font-semibold">{t("post.commentSubmit")}</Text>
        </Pressable>
      </View>
      <ReportDialog
        open={reportCommentId !== null}
        onClose={() => setReportCommentId(null)}
        targetKind="COMMENT"
        targetId={reportCommentId ?? ""}
      />
    </View>
  );
}
