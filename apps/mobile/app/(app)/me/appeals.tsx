// User-facing appeals — mobile twin of /me/appeals on web. Lists resolved
// reports filed against the viewer's own content. For unappealed reports,
// shows an inline file-appeal form. For appealed ones, shows status +
// decision history.
//
// Reachable from the SuspensionBanner CTA in (app)/_layout.tsx as well as
// from any moderation notification that links here.

import { AppealAck, AppealReportBody, MyReportsPage, type MyReportItem } from "@palnet/shared";
import { Button, Surface, nativeTokens } from "@palnet/ui-native";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";

import { apiFetch, apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const MIN_APPEAL_NOTE = 10;

type FormState = {
  note: string;
  busy: boolean;
  error: string | null;
};

const EMPTY_FORM: FormState = { note: "", busy: false, error: null };

export default function AppealsScreen(): JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<MyReportItem[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);
  const [forms, setForms] = useState<Record<string, FormState>>({});

  const load = useCallback(async (after: string | null): Promise<void> => {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }
    setError(false);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(`/reports/mine?${qs.toString()}`, MyReportsPage, { token });
      setItems((prev) => (after ? [...(prev ?? []), ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } catch {
      setError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(null);
    }, [load]),
  );

  function setForm(reportId: string, patch: Partial<FormState>): void {
    setForms((prev) => ({
      ...prev,
      [reportId]: { ...(prev[reportId] ?? EMPTY_FORM), ...patch },
    }));
  }

  async function submit(report: MyReportItem): Promise<void> {
    const form = forms[report.id] ?? EMPTY_FORM;
    if (form.note.trim().length < MIN_APPEAL_NOTE) {
      setForm(report.id, { error: t("appeals.errorNoteTooShort", { min: MIN_APPEAL_NOTE }) });
      return;
    }
    const token = await getAccessToken();
    if (!token) return;
    setForm(report.id, { busy: true, error: null });
    try {
      const body: AppealReportBody = { note: form.note.trim() };
      await apiFetch(`/reports/${report.id}/appeal`, AppealAck, {
        method: "POST",
        token,
        body,
      });
      // Reload to pull in the new appeal status without a full refresh.
      await load(null);
      setForm(report.id, { ...EMPTY_FORM });
    } catch (e) {
      // ApiRequestError surface in `lib/api` — message is "API <status> <code>".
      // Map APPEAL_ALREADY_FILED to a friendly note; everything else stays generic.
      const msg = (e as Error).message ?? "";
      const friendly = msg.includes("APPEAL_ALREADY_FILED")
        ? t("appeals.errorAlreadyFiled")
        : t("appeals.errorGeneric");
      setForm(report.id, { busy: false, error: friendly });
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
      testID="appeals-screen"
    >
      <ScrollView
        contentContainerStyle={{
          padding: nativeTokens.space[4],
          gap: nativeTokens.space[3],
        }}
      >
        <Surface variant="card" padding="4">
          <Text
            style={{
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.h3.size,
              fontWeight: "700",
              marginBottom: nativeTokens.space[1],
            }}
          >
            {t("appeals.title")}
          </Text>
          <Text
            style={{
              color: nativeTokens.color.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
            }}
          >
            {t("appeals.description")}
          </Text>
        </Surface>

        {items === null && !error ? (
          <View style={{ paddingVertical: nativeTokens.space[4] }}>
            <ActivityIndicator />
          </View>
        ) : null}

        {error ? (
          <Surface variant="tinted" padding="4">
            <Text
              accessibilityRole="alert"
              style={{
                color: nativeTokens.color.danger,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
              }}
            >
              {t("appeals.errorGeneric")}
            </Text>
          </Surface>
        ) : null}

        {items && items.length === 0 ? (
          <Surface variant="tinted" padding="4">
            <Text
              style={{
                color: nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
              }}
            >
              {t("appeals.empty")}
            </Text>
          </Surface>
        ) : null}

        {items?.map((report) => {
          const form = forms[report.id] ?? EMPTY_FORM;
          const canAppeal = !report.appealStatus;
          return (
            <Surface key={report.id} variant="card" padding="4" testID={`my-appeal-${report.id}`}>
              {/* Reason + target excerpt */}
              <Text
                style={{
                  color: nativeTokens.color.ink,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.body.size,
                  fontWeight: "600",
                }}
              >
                {t(`appeals.reasons.${report.reason}`)}
              </Text>
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.small.size,
                  marginTop: nativeTokens.space[1],
                }}
              >
                {t(`appeals.targetKind.${report.targetKind}`)}
              </Text>

              {/* Resolution note from the moderator. */}
              {report.resolvedNote ? (
                <Text
                  style={{
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.small.size,
                    marginTop: nativeTokens.space[2],
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>{t("appeals.moderatorNote")}: </Text>
                  {report.resolvedNote}
                </Text>
              ) : null}

              {/* Status badge */}
              {report.appealStatus ? (
                <Text
                  style={{
                    marginTop: nativeTokens.space[2],
                    color: nativeTokens.color.brand700,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.small.size,
                    fontWeight: "700",
                  }}
                >
                  {t(`appeals.status.${report.appealStatus}`)}
                </Text>
              ) : null}

              {/* Decision note */}
              {report.appealDecisionNote ? (
                <Text
                  style={{
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.small.size,
                    marginTop: nativeTokens.space[2],
                  }}
                >
                  <Text style={{ fontWeight: "700" }}>{t("appeals.decisionNote")}: </Text>
                  {report.appealDecisionNote}
                </Text>
              ) : null}

              {/* File-appeal form (only if not yet appealed). */}
              {canAppeal ? (
                <View style={{ marginTop: nativeTokens.space[3] }}>
                  <Text
                    style={{
                      color: nativeTokens.color.ink,
                      fontFamily: nativeTokens.type.family.sans,
                      fontSize: nativeTokens.type.scale.small.size,
                      fontWeight: "600",
                      marginBottom: nativeTokens.space[1],
                    }}
                  >
                    {t("appeals.formLabel")}
                  </Text>
                  <TextInput
                    value={form.note}
                    onChangeText={(note) => setForm(report.id, { note, error: null })}
                    placeholder={t("appeals.formPlaceholder", { min: MIN_APPEAL_NOTE })}
                    placeholderTextColor={nativeTokens.color.inkMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    testID={`my-appeal-note-${report.id}`}
                    style={{
                      borderWidth: 1,
                      borderColor: nativeTokens.color.lineSoft,
                      borderRadius: 8,
                      padding: nativeTokens.space[2],
                      color: nativeTokens.color.ink,
                      fontFamily: nativeTokens.type.family.sans,
                      fontSize: nativeTokens.type.scale.body.size,
                      minHeight: 80,
                    }}
                  />
                  {form.error ? (
                    <Text
                      accessibilityRole="alert"
                      style={{
                        color: nativeTokens.color.danger,
                        fontFamily: nativeTokens.type.family.sans,
                        fontSize: nativeTokens.type.scale.small.size,
                        marginTop: nativeTokens.space[1],
                      }}
                    >
                      {form.error}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: nativeTokens.space[2] }}>
                    <Button
                      onPress={() => void submit(report)}
                      disabled={form.busy}
                      loading={form.busy}
                      testID={`my-appeal-submit-${report.id}`}
                    >
                      {form.busy ? t("appeals.submitting") : t("appeals.submit")}
                    </Button>
                  </View>
                </View>
              ) : null}
            </Surface>
          );
        })}

        {hasMore && cursor ? (
          <View style={{ paddingTop: nativeTokens.space[3] }}>
            <Button onPress={() => void load(cursor)}>{t("appeals.loadMore")}</Button>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
