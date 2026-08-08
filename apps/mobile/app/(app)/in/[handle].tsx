import { ChatRoom as ChatRoomSchema, Profile as ProfileSchema, type Profile } from "@baydar/shared";
import { Alert, Button, ReportSheet, Tab, Tabs, useToast } from "@baydar/ui-native";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileScreenSkeleton } from "@/components/ScreenSkeleton";
import { useBlock, useReport, useUnblock } from "@/api/safety";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { runConnectionAction } from "@/lib/connections";
import { successHaptic, tapHaptic } from "@/lib/haptics";
import { getAccessToken } from "@/lib/session";

import { ProfileActions, type ConnectionAction } from "@/screens/profile-detail/ProfileActions";
import { ProfileHero } from "@/screens/profile-detail/ProfileHero";
import {
  PROFILE_TABS,
  ProfileTabContent,
  type ProfileTab,
} from "@/screens/profile-detail/ProfileTabContent";
import { useReportLabels } from "@/lib/report-labels";
import { blockButtonLabels } from "@/screens/profile-detail/safetyLabels";
import { useProfileStyles } from "@/screens/profile-detail/styles";

export default function ProfileScreen(): JSX.Element {
  const profileStyles = useProfileStyles();
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
  const [reportOpen, setReportOpen] = useState(false);
  const block = useBlock();
  const unblock = useUnblock();
  const report = useReport();

  useEffect(() => {
    if (!handle) return;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const token = (await getAccessToken()) ?? undefined;
        const data = await apiFetch(`/profiles/${handle}`, ProfileSchema, {
          token,
        });
        setProfile(data);
      } catch (caught) {
        setLoadError(apiErrorMessage(t, caught));
      } finally {
        setLoading(false);
      }
    })();
  }, [handle, t]);

  async function connectionAction(action: ConnectionAction): Promise<void> {
    if (!profile?.viewer) return;
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    setActionError(null);
    try {
      tapHaptic();
      const viewer = await runConnectionAction(action, profile.viewer, profile.userId, token);
      setProfile({ ...profile, viewer });
      successHaptic();
    } catch (caught) {
      setActionError(apiErrorMessage(t, caught));
    } finally {
      setBusy(false);
    }
  }

  // Above the early returns: `useReportLabels` is a hook, unlike the plain
  // `reportSheetLabels(t)` it replaced.
  const reportLabels = useReportLabels();

  if (loading) {
    return (
      <SafeAreaView style={profileStyles.screen}>
        <ProfileScreenSkeleton />
      </SafeAreaView>
    );
  }

  if (loadError || !profile) {
    return (
      <SafeAreaView style={profileStyles.errorScreen}>
        <Alert body={loadError ?? t("profile.notFound")} />
      </SafeAreaView>
    );
  }

  const loadedProfile = profile;
  const conn = loadedProfile.viewer?.connection;
  const isBlocked = conn?.status === "BLOCKED";
  const blockLabels = blockButtonLabels(t, isBlocked);

  async function messageUser(): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const room = await apiFetch("/messaging/rooms", ChatRoomSchema, {
        method: "POST",
        token,
        body: { otherUserId: loadedProfile.userId },
      });
      router.push({
        pathname: "/(app)/messages/[roomId]",
        params: { roomId: room.id },
      });
    } catch (caught) {
      setActionError(apiErrorMessage(t, caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={profileStyles.screen}>
      <ScrollView contentContainerStyle={profileStyles.scrollBody}>
        <ProfileHero
          profile={loadedProfile}
          onEdit={loadedProfile.viewer?.isSelf ? () => router.push("/(app)/me/edit") : undefined}
          actionSlot={
            <ProfileActions
              profile={loadedProfile}
              busy={busy}
              isBlocked={isBlocked}
              blockLabels={blockLabels}
              blockLoading={block.isPending || unblock.isPending}
              onConnectionAction={(action) => void connectionAction(action)}
              onMessage={() => void messageUser()}
              onReport={() => setReportOpen(true)}
              onBlockChange={(nextBlocked, userId) => {
                if (nextBlocked) {
                  block.mutate(
                    { blockedUserId: userId },
                    {
                      onSuccess: () => {
                        showToast({ message: t("safety.block.success"), kind: "success" });
                        router.replace("/(app)/feed");
                      },
                      onError: () => showToast({ message: t("safety.block.error"), kind: "error" }),
                    },
                  );
                } else {
                  unblock.mutate(userId, {
                    onSuccess: () => {
                      setProfile({
                        ...loadedProfile,
                        viewer: { isSelf: false, connection: null },
                      });
                      showToast({ message: t("safety.unblock.success"), kind: "success" });
                    },
                    onError: () => showToast({ message: t("safety.unblock.error"), kind: "error" }),
                  });
                }
              }}
            />
          }
        />

        {actionError ? (
          <Alert
            body={actionError}
            cta={t("common.retry")}
            busy={busy}
            onAction={() => setActionError(null)}
          />
        ) : null}

        <Tabs value={activeTab} onChange={(key) => setActiveTab(key as ProfileTab)}>
          {PROFILE_TABS.map((tab) => (
            <Tab key={tab.key} value={tab.key}>
              {t(tab.i18n)}
            </Tab>
          ))}
        </Tabs>

        <ProfileTabContent profile={loadedProfile} activeTab={activeTab} />

        <View style={profileStyles.footer}>
          <Button variant="ghost" size="md" fullWidth onPress={() => router.back()}>
            {t("common.back")}
          </Button>
        </View>
        <ReportSheet
          open={reportOpen}
          onOpenChange={setReportOpen}
          target={{ kind: "user", id: loadedProfile.userId }}
          labels={reportLabels}
          submitting={report.isPending}
          onSubmit={(input) => {
            report.mutate(input, {
              onSuccess: () => {
                setReportOpen(false);
                showToast({ message: t("safety.report.success"), kind: "success" });
              },
              onError: () => showToast({ message: t("safety.report.error"), kind: "error" }),
            });
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
