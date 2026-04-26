// Mobile profile screen. Uses ui-native atoms (Surface, Avatar, Button) +
// nativeTokens so styling stays in lockstep with the web twin.

import {
  ChatRoom as ChatRoomSchema,
  Profile as ProfileSchema,
  type Profile,
} from "@baydar/shared";
import { Avatar, Button, Surface, nativeTokens } from "@baydar/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const Raw = z.object({}).passthrough();

type ProfileTab = "about" | "exp" | "edu" | "skills";

const TABS: { key: ProfileTab; i18n: string }[] = [
  { key: "about", i18n: "profile.about" },
  { key: "exp", i18n: "profile.experience" },
  { key: "edu", i18n: "profile.education" },
  { key: "skills", i18n: "profile.skills" },
];

export default function ProfileScreen(): JSX.Element {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");

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
      <SafeAreaView style={profileStyles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={profileStyles.errorScreen}>
        <Surface variant="tinted" padding="6">
          <Text style={profileStyles.errorText}>
            {error ?? t("profile.notFound")}
          </Text>
        </Surface>
      </SafeAreaView>
    );
  }

  const conn = profile.viewer?.connection;

  return (
    <SafeAreaView style={profileStyles.screen}>
      <ScrollView contentContainerStyle={profileStyles.scrollBody}>
        <Surface variant="card" padding="4">
          <Avatar
            user={{
              id: profile.userId,
              handle: profile.handle,
              firstName: profile.firstName,
              lastName: profile.lastName,
              avatarUrl: profile.avatarUrl,
            }}
            size="xl"
          />
          <Text style={profileStyles.name}>
            {profile.firstName} {profile.lastName}
          </Text>
          {profile.headline ? (
            <Text style={profileStyles.headline}>{profile.headline}</Text>
          ) : null}
          {profile.location ? (
            <Text style={profileStyles.location}>{profile.location}</Text>
          ) : null}
          <Text style={profileStyles.handle}>/in/{profile.handle}</Text>

          {profile.viewer?.isSelf ? (
            <View style={profileStyles.editWrap}>
              <Button
                variant="secondary"
                size="md"
                onPress={() => router.push("/(app)/me/edit")}
              >
                {t("profile.edit")}
              </Button>
            </View>
          ) : null}

          {profile.viewer && !profile.viewer.isSelf ? (
            <View style={profileStyles.actionsRow}>
              {!conn ||
              conn.status === "WITHDRAWN" ||
              conn.status === "DECLINED" ? (
                <Button
                  variant="primary"
                  size="md"
                  disabled={busy}
                  onPress={() => void connectionAction("CONNECT")}
                >
                  {t("network.connect")}
                </Button>
              ) : conn.status === "PENDING" && conn.direction === "OUTGOING" ? (
                <Button
                  variant="secondary"
                  size="md"
                  disabled={busy}
                  onPress={() => void connectionAction("WITHDRAW")}
                >
                  {t("network.withdraw")}
                </Button>
              ) : conn.status === "PENDING" && conn.direction === "INCOMING" ? (
                <>
                  <Button
                    variant="primary"
                    size="md"
                    disabled={busy}
                    onPress={() => void connectionAction("ACCEPT")}
                  >
                    {t("network.accept")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={busy}
                    onPress={() => void connectionAction("DECLINE")}
                  >
                    {t("network.decline")}
                  </Button>
                </>
              ) : conn.status === "ACCEPTED" ? (
                <Button
                  variant="secondary"
                  size="md"
                  disabled={busy}
                  onPress={() => void connectionAction("REMOVE")}
                >
                  {t("network.removeConnection")}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="md"
                disabled={busy}
                onPress={async () => {
                  const token = await getAccessToken();
                  if (!token) return;
                  setBusy(true);
                  try {
                    const room = await apiFetch(
                      "/messaging/rooms",
                      ChatRoomSchema,
                      {
                        method: "POST",
                        token,
                        body: { otherUserId: profile.userId },
                      },
                    );
                    router.push({
                      pathname: "/(app)/messages/[roomId]",
                      params: { roomId: room.id },
                    });
                  } catch {
                    // no-op
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("messaging.newMessage")}
              </Button>
            </View>
          ) : null}
        </Surface>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={profileStyles.tabsRow}
        >
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  profileStyles.tab,
                  active ? profileStyles.tabActive : profileStyles.tabInactive,
                ]}
              >
                <Text
                  style={[
                    profileStyles.tabLabel,
                    active
                      ? profileStyles.tabLabelActive
                      : profileStyles.tabLabelInactive,
                  ]}
                >
                  {t(tab.i18n)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {activeTab === "about"
          ? profile.about
            ? (
              <Section title={t("profile.about")}>
                <Text style={profileStyles.bodyText}>{profile.about}</Text>
              </Section>
            )
            : (
              <Surface variant="tinted" padding="6">
                <Text style={profileStyles.emptyText}>
                  {t("profile.aboutEmpty")}
                </Text>
              </Surface>
            )
          : null}

        {activeTab === "exp" ? (
          <Section title={t("profile.experience")}>
            {profile.experiences.length === 0 ? (
              <Text style={profileStyles.emptyText}>
                {t("profile.expEmpty")}
              </Text>
            ) : (
              profile.experiences.map((e, idx) => (
                <View
                  key={e.id ?? `${e.companyName}-${e.startDate}`}
                  style={
                    idx === 0 ? undefined : profileStyles.experienceItemSpacing
                  }
                >
                  <Text style={profileStyles.itemTitle}>{e.title}</Text>
                  <Text style={profileStyles.itemSubtitle}>
                    {e.companyName}
                  </Text>
                  {e.description ? (
                    <Text style={profileStyles.itemDescription}>
                      {e.description}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </Section>
        ) : null}

        {activeTab === "edu" ? (
          <Section title={t("profile.education")}>
            {profile.educations.length === 0 ? (
              <Text style={profileStyles.emptyText}>
                {t("profile.eduEmpty")}
              </Text>
            ) : (
              profile.educations.map((e, idx) => (
                <View
                  key={e.id ?? e.school}
                  style={
                    idx === 0 ? undefined : profileStyles.experienceItemSpacing
                  }
                >
                  <Text style={profileStyles.itemTitle}>{e.school}</Text>
                  {e.degree ? (
                    <Text style={profileStyles.itemSubtitle}>
                      {e.degree}
                      {e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </Section>
        ) : null}

        {activeTab === "skills" ? (
          <Section title={t("profile.skills")}>
            {profile.skills.length === 0 ? (
              <Text style={profileStyles.emptyText}>
                {t("profile.skillsEmpty")}
              </Text>
            ) : (
              <View style={profileStyles.skillsRow}>
                {profile.skills.map((s) => (
                  <View key={s.id} style={profileStyles.skillChip}>
                    <Text style={profileStyles.skillLabel}>{s.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </Section>
        ) : null}

        <View style={profileStyles.footer}>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => router.back()}
          >
            {t("common.cancel")}
          </Button>
        </View>
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
    <Surface variant="card" padding="4">
      <Text style={profileStyles.sectionTitle}>{title}</Text>
      {children}
    </Surface>
  );
}

const profileStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: nativeTokens.color.surfaceMuted },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
    padding: nativeTokens.space[4],
  },
  errorText: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    textAlign: "center",
  },
  scrollBody: {
    padding: nativeTokens.space[4],
    gap: nativeTokens.space[4],
  },
  name: {
    marginTop: nativeTokens.space[3],
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.display.size,
    lineHeight: nativeTokens.type.scale.display.line,
    fontWeight: "700",
  },
  headline: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    marginTop: 2,
  },
  location: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    marginTop: 2,
  },
  handle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
    marginTop: nativeTokens.space[1],
  },
  editWrap: {
    marginTop: nativeTokens.space[3],
    alignSelf: "flex-start",
  },
  actionsRow: {
    marginTop: nativeTokens.space[3],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
  },
  tabsRow: {
    flexDirection: "row",
    gap: nativeTokens.space[2],
    paddingHorizontal: nativeTokens.space[1],
  },
  tab: {
    paddingVertical: nativeTokens.space[2],
    paddingHorizontal: nativeTokens.space[3],
    borderBottomWidth: 2,
  },
  tabActive: { borderBottomColor: nativeTokens.color.brand600 },
  tabInactive: { borderBottomColor: "transparent" },
  tabLabel: {
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    fontWeight: "500",
  },
  tabLabelActive: { color: nativeTokens.color.ink },
  tabLabelInactive: { color: nativeTokens.color.inkMuted },
  bodyText: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
  },
  emptyText: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  experienceItemSpacing: { marginTop: nativeTokens.space[3] },
  itemTitle: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600",
  },
  itemSubtitle: {
    color: nativeTokens.color.inkMuted,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  itemDescription: {
    marginTop: nativeTokens.space[1],
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.body.size,
    lineHeight: nativeTokens.type.scale.body.line,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
  },
  skillChip: {
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    borderRadius: nativeTokens.radius.full,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[1],
  },
  skillLabel: {
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.small.size,
  },
  sectionTitle: {
    marginBottom: nativeTokens.space[2],
    color: nativeTokens.color.ink,
    fontFamily: nativeTokens.type.family.sans,
    fontSize: nativeTokens.type.scale.h2.size,
    lineHeight: nativeTokens.type.scale.h2.line,
    fontWeight: "600",
  },
  footer: { paddingVertical: nativeTokens.space[3] },
});
