import {
  Profile as ProfileSchema,
  type Profile,
} from "@palnet/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const Raw = z.object({}).passthrough();

export default function ProfileScreen(): JSX.Element {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = (await getAccessToken()) ?? undefined;
        const data = await apiFetch(`/profiles/${handle}`, ProfileSchema, {
          token,
        });
        setProfile(data);
      } catch {
        setError(t("profile.notFound"));
      } finally {
        setLoading(false);
      }
    })();
  }, [handle, t]);

  async function connectionAction(
    action: "CONNECT" | "WITHDRAW" | "ACCEPT" | "DECLINE" | "REMOVE",
  ): Promise<void> {
    if (!profile?.viewer) return;
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const conn = profile.viewer.connection;
      if (action === "CONNECT") {
        const row = (await apiFetch("/connections", Raw, {
          method: "POST",
          token,
          body: { receiverId: profile.userId },
        })) as { id: string };
        setProfile({
          ...profile,
          viewer: {
            isSelf: false,
            connection: {
              status: "PENDING",
              direction: "OUTGOING",
              connectionId: row.id,
            },
          },
        });
        return;
      }
      if (!conn) return;
      if (action === "WITHDRAW") {
        await apiFetch(`/connections/${conn.connectionId}/withdraw`, Raw, {
          method: "POST",
          token,
        });
        setProfile({ ...profile, viewer: { isSelf: false, connection: null } });
      } else if (action === "ACCEPT" || action === "DECLINE") {
        await apiFetch(`/connections/${conn.connectionId}/respond`, Raw, {
          method: "POST",
          token,
          body: { action },
        });
        setProfile({
          ...profile,
          viewer: {
            isSelf: false,
            connection: {
              status: action === "ACCEPT" ? "ACCEPTED" : "DECLINED",
              direction: "INCOMING",
              connectionId: conn.connectionId,
            },
          },
        });
      } else if (action === "REMOVE") {
        await apiFetch(`/connections/${conn.connectionId}`, Raw, {
          method: "DELETE",
          token,
        });
        setProfile({ ...profile, viewer: { isSelf: false, connection: null } });
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface-muted">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-surface-muted p-6">
        <Text className="text-ink-muted">{error ?? t("profile.notFound")}</Text>
      </SafeAreaView>
    );
  }

  const conn = profile.viewer?.connection;

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <ScrollView contentContainerClassName="p-4 gap-4">
        <View className="rounded-md border border-ink-muted/20 bg-white p-4">
          <Text className="text-2xl font-bold text-ink">
            {profile.firstName} {profile.lastName}
          </Text>
          {profile.headline ? (
            <Text className="text-ink-muted">{profile.headline}</Text>
          ) : null}
          {profile.location ? (
            <Text className="text-sm text-ink-muted">{profile.location}</Text>
          ) : null}
          <Text className="mt-1 text-xs text-ink-muted">/in/{profile.handle}</Text>

          {profile.viewer && !profile.viewer.isSelf ? (
            <View className="mt-3 flex-row gap-2">
              {!conn ||
              conn.status === "WITHDRAWN" ||
              conn.status === "DECLINED" ? (
                <Pressable
                  onPress={() => void connectionAction("CONNECT")}
                  disabled={busy}
                  className="rounded-md bg-brand-600 px-4 py-2"
                >
                  <Text className="text-white">{t("network.connect")}</Text>
                </Pressable>
              ) : conn.status === "PENDING" && conn.direction === "OUTGOING" ? (
                <Pressable
                  onPress={() => void connectionAction("WITHDRAW")}
                  disabled={busy}
                  className="rounded-md border border-ink-muted/30 px-4 py-2"
                >
                  <Text className="text-ink">{t("network.withdraw")}</Text>
                </Pressable>
              ) : conn.status === "PENDING" && conn.direction === "INCOMING" ? (
                <>
                  <Pressable
                    onPress={() => void connectionAction("ACCEPT")}
                    disabled={busy}
                    className="rounded-md bg-brand-600 px-4 py-2"
                  >
                    <Text className="text-white">{t("network.accept")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void connectionAction("DECLINE")}
                    disabled={busy}
                    className="rounded-md border border-ink-muted/30 px-4 py-2"
                  >
                    <Text className="text-ink">{t("network.decline")}</Text>
                  </Pressable>
                </>
              ) : conn.status === "ACCEPTED" ? (
                <Pressable
                  onPress={() => void connectionAction("REMOVE")}
                  disabled={busy}
                  className="rounded-md border border-ink-muted/30 px-4 py-2"
                >
                  <Text className="text-ink">
                    {t("network.removeConnection")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {profile.about ? (
          <Section title={t("profile.about")}>
            <Text className="text-ink">{profile.about}</Text>
          </Section>
        ) : null}

        {profile.experiences.length > 0 ? (
          <Section title={t("profile.experience")}>
            {profile.experiences.map((e) => (
              <View
                key={e.id ?? `${e.companyName}-${e.startDate}`}
                className="mb-3"
              >
                <Text className="font-semibold text-ink">{e.title}</Text>
                <Text className="text-sm text-ink-muted">{e.companyName}</Text>
                {e.description ? (
                  <Text className="mt-1 text-sm text-ink">{e.description}</Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {profile.educations.length > 0 ? (
          <Section title={t("profile.education")}>
            {profile.educations.map((e) => (
              <View key={e.id ?? e.school} className="mb-3">
                <Text className="font-semibold text-ink">{e.school}</Text>
                {e.degree ? (
                  <Text className="text-sm text-ink-muted">
                    {e.degree}
                    {e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}
                  </Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {profile.skills.length > 0 ? (
          <Section title={t("profile.skills")}>
            <View className="flex-row flex-wrap gap-2">
              {profile.skills.map((s) => (
                <View
                  key={s.id}
                  className="rounded-full border border-ink-muted/30 px-3 py-1"
                >
                  <Text className="text-sm text-ink">{s.name}</Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <Pressable onPress={() => router.back()} className="py-3">
          <Text className="text-center text-ink-muted">{t("common.cancel")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <View className="rounded-md border border-ink-muted/20 bg-white p-4">
      <Text className="mb-2 text-lg font-semibold text-ink">{title}</Text>
      {children}
    </View>
  );
}
