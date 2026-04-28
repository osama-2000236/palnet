// Mobile profile screen. Uses ui-native atoms (Surface, Avatar, Button) +
// nativeTokens so styling stays in lockstep with the web twin.

import { ChatRoom as ChatRoomSchema, Profile as ProfileSchema, type Profile } from "@baydar/shared";
import { Avatar, Button, Image, Surface, nativeTokens } from "@baydar/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { z } from "zod";

import { UserActions } from "@/components/UserActions";
import { apiFetch } from "@/lib/api";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

const Raw = z.object({}).passthrough();

export default function ProfileScreen(): JSX.Element {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);

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
      tapHaptic();
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
        successHaptic();
        return;
      }
      if (!conn) return;
      if (action === "WITHDRAW") {
        await apiFetch(`/connections/${conn.connectionId}/withdraw`, Raw, {
          method: "POST",
          token,
        });
        setProfile({ ...profile, viewer: { isSelf: false, connection: null } });
        successHaptic();
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
        successHaptic();
      } else if (action === "REMOVE") {
        await apiFetch(`/connections/${conn.connectionId}`, Raw, {
          method: "DELETE",
          token,
        });
        setProfile({ ...profile, viewer: { isSelf: false, connection: null } });
        successHaptic();
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: nativeTokens.color.surfaceMuted,
        }}
      >
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: nativeTokens.color.surfaceMuted,
          padding: nativeTokens.space[4],
        }}
      >
        <Surface variant="tinted" padding="6">
          <Text
            style={{
              color: nativeTokens.color.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.body.size,
              textAlign: "center",
            }}
          >
            {error ?? t("profile.notFound")}
          </Text>
        </Surface>
      </SafeAreaView>
    );
  }

  const conn = profile.viewer?.connection;
  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || profile.handle;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
      testID="profile-screen"
    >
      <ScrollView
        contentContainerStyle={{
          padding: nativeTokens.space[4],
          gap: nativeTokens.space[4],
        }}
      >
        {profile.coverUrl ? (
          <Image
            source={{ uri: profile.coverUrl }}
            alt=""
            blurhash={profile.coverBlur ?? null}
            style={{
              width: "100%",
              height: 140,
              borderRadius: nativeTokens.radius.md,
            }}
          />
        ) : null}
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
          <Text
            style={{
              marginTop: nativeTokens.space[3],
              color: nativeTokens.color.ink,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.display.size,
              lineHeight: nativeTokens.type.scale.display.line,
              fontWeight: "700",
            }}
          >
            {profile.firstName} {profile.lastName}
          </Text>
          {profile.headline ? (
            <Text
              style={{
                color: nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
                marginTop: 2,
              }}
            >
              {profile.headline}
            </Text>
          ) : null}
          {profile.location ? (
            <Text
              style={{
                color: nativeTokens.color.inkMuted,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.small.size,
                marginTop: 2,
              }}
            >
              {profile.location}
            </Text>
          ) : null}
          <Text
            style={{
              color: nativeTokens.color.inkMuted,
              fontFamily: nativeTokens.type.family.sans,
              fontSize: nativeTokens.type.scale.small.size,
              marginTop: nativeTokens.space[1],
            }}
            testID="profile-handle"
          >
            /in/{profile.handle}
          </Text>

          {profile.viewer?.isSelf ? (
            <View
              style={{
                marginTop: nativeTokens.space[3],
                alignSelf: "flex-start",
              }}
            >
              <Button variant="secondary" size="md" onPress={() => router.push("/(app)/me/edit")}>
                {t("profile.edit")}
              </Button>
            </View>
          ) : null}

          {profile.viewer && !profile.viewer.isSelf ? (
            <View
              style={{
                marginTop: nativeTokens.space[3],
                flexDirection: "row",
                flexWrap: "wrap",
                gap: nativeTokens.space[2],
              }}
            >
              {!conn || conn.status === "WITHDRAWN" || conn.status === "DECLINED" ? (
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
                testID="profile-message"
                onPress={async () => {
                  const token = await getAccessToken();
                  if (!token) return;
                  setBusy(true);
                  try {
                    const room = await apiFetch("/messaging/rooms", ChatRoomSchema, {
                      method: "POST",
                      token,
                      body: { otherUserId: profile.userId },
                    });
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("moderation.more")}
                testID="profile-actions"
                onPress={() => setActionsOpen(true)}
                style={({ pressed }) => ({
                  minHeight: 40,
                  minWidth: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: nativeTokens.radius.md,
                  borderWidth: 1,
                  borderColor: nativeTokens.color.lineHard,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.h3.size,
                    fontWeight: "700",
                  }}
                >
                  ⋯
                </Text>
              </Pressable>
            </View>
          ) : null}
          <UserActions
            open={actionsOpen}
            onClose={() => setActionsOpen(false)}
            userId={profile.userId}
            userName={displayName}
            onBlocked={() => router.replace("/(app)/feed")}
          />
        </Surface>

        {profile.about ? (
          <Section title={t("profile.about")}>
            <Text
              style={{
                color: nativeTokens.color.ink,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.body.size,
                lineHeight: nativeTokens.type.scale.body.line,
              }}
            >
              {profile.about}
            </Text>
          </Section>
        ) : null}

        {profile.experiences.length > 0 ? (
          <Section title={t("profile.experience")}>
            {profile.experiences.map((e, idx) => (
              <View
                key={e.id ?? `${e.companyName}-${e.startDate}`}
                style={{
                  marginTop: idx === 0 ? 0 : nativeTokens.space[3],
                }}
              >
                <Text
                  style={{
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.h3.size,
                    lineHeight: nativeTokens.type.scale.h3.line,
                    fontWeight: "600",
                  }}
                >
                  {e.title}
                </Text>
                <Text
                  style={{
                    color: nativeTokens.color.inkMuted,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.small.size,
                  }}
                >
                  {e.companyName}
                </Text>
                {e.description ? (
                  <Text
                    style={{
                      marginTop: nativeTokens.space[1],
                      color: nativeTokens.color.ink,
                      fontFamily: nativeTokens.type.family.sans,
                      fontSize: nativeTokens.type.scale.body.size,
                      lineHeight: nativeTokens.type.scale.body.line,
                    }}
                  >
                    {e.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {profile.educations.length > 0 ? (
          <Section title={t("profile.education")}>
            {profile.educations.map((e, idx) => (
              <View
                key={e.id ?? e.school}
                style={{
                  marginTop: idx === 0 ? 0 : nativeTokens.space[3],
                }}
              >
                <Text
                  style={{
                    color: nativeTokens.color.ink,
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.h3.size,
                    lineHeight: nativeTokens.type.scale.h3.line,
                    fontWeight: "600",
                  }}
                >
                  {e.school}
                </Text>
                {e.degree ? (
                  <Text
                    style={{
                      color: nativeTokens.color.inkMuted,
                      fontFamily: nativeTokens.type.family.sans,
                      fontSize: nativeTokens.type.scale.small.size,
                    }}
                  >
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
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: nativeTokens.space[2],
              }}
            >
              {profile.skills.map((s) => (
                <View
                  key={s.id}
                  style={{
                    borderWidth: 1,
                    borderColor: nativeTokens.color.lineHard,
                    borderRadius: nativeTokens.radius.full,
                    paddingHorizontal: nativeTokens.space[3],
                    paddingVertical: nativeTokens.space[1],
                  }}
                >
                  <Text
                    style={{
                      color: nativeTokens.color.ink,
                      fontFamily: nativeTokens.type.family.sans,
                      fontSize: nativeTokens.type.scale.small.size,
                    }}
                  >
                    {s.name}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <View style={{ paddingVertical: nativeTokens.space[3] }}>
          <Button variant="ghost" size="md" fullWidth onPress={() => router.back()}>
            {t("common.cancel")}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <Surface variant="card" padding="4">
      <Text
        style={{
          marginBottom: nativeTokens.space[2],
          color: nativeTokens.color.ink,
          fontFamily: nativeTokens.type.family.sans,
          fontSize: nativeTokens.type.scale.h2.size,
          lineHeight: nativeTokens.type.scale.h2.line,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
      {children}
    </Surface>
  );
}
