import {
  type Application as JobApplication,
  Application as ApplicationSchema,
  cursorPage,
} from "@palnet/shared";
import { Surface, nativeTokens } from "@palnet/ui-native";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const ApplicationsPage = cursorPage(ApplicationSchema);

export default function JobApplicationsScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<JobApplication[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  useEffect(() => {
    void load(null);
  }, []);

  async function load(after: string | null): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(
        `/me/applications?${qs.toString()}`,
        ApplicationsPage,
        { token },
      );
      setItems((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [i18n.language],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: nativeTokens.space[4],
          paddingTop: nativeTokens.space[4],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: nativeTokens.space[3],
          }}
        >
          <Text
            style={{
              color: nativeTokens.color.ink,
              fontSize: nativeTokens.type.scale.display.size,
              lineHeight: nativeTokens.type.scale.display.line,
              fontWeight: "700",
              fontFamily: nativeTokens.type.family.sans,
            }}
          >
            {t("jobs.myApplications")}
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text
              style={{
                color: nativeTokens.color.brand700,
                fontSize: nativeTokens.type.scale.small.size,
                fontWeight: "600",
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {t("jobs.backToJobs")}
            </Text>
          </Pressable>
        </View>

        {firstLoad ? (
          <View style={{ paddingVertical: nativeTokens.space[6] }}>
            <ActivityIndicator />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/(app)/jobs/[id]",
                    params: { id: item.job.id },
                  })
                }
                accessibilityRole="link"
              >
                <Surface variant="card" padding="4">
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: nativeTokens.space[3],
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={2}
                        style={{
                          color: nativeTokens.color.ink,
                          fontSize: nativeTokens.type.scale.h3.size,
                          lineHeight: nativeTokens.type.scale.h3.line,
                          fontWeight: "600",
                          fontFamily: nativeTokens.type.family.sans,
                        }}
                      >
                        {item.job.title}
                      </Text>
                      <Text
                        style={{
                          marginTop: nativeTokens.space[1],
                          color: nativeTokens.color.inkMuted,
                          fontSize: nativeTokens.type.scale.small.size,
                          fontFamily: nativeTokens.type.family.sans,
                        }}
                      >
                        {item.company.name}
                      </Text>
                      <Text
                        style={{
                          marginTop: nativeTokens.space[2],
                          color: nativeTokens.color.inkMuted,
                          fontSize: nativeTokens.type.scale.small.size,
                          fontFamily: nativeTokens.type.family.sans,
                        }}
                      >
                        {t("jobs.appliedOn", {
                          date: formatter.format(new Date(item.createdAt)),
                        })}
                      </Text>
                    </View>

                    <View
                      style={{
                        alignSelf: "flex-start",
                        paddingHorizontal: nativeTokens.space[2],
                        paddingVertical: 4,
                        borderRadius: nativeTokens.radius.full,
                        backgroundColor: badgeBackground(item.status),
                      }}
                    >
                      <Text
                        style={{
                          color: badgeColor(item.status),
                          fontSize: 11,
                          fontWeight: "700",
                          fontFamily: nativeTokens.type.family.sans,
                        }}
                      >
                        {t(`jobs.applicationStatusLabels.${item.status}`)}
                      </Text>
                    </View>
                  </View>
                </Surface>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={{ height: nativeTokens.space[3] }} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (!loading && hasMore && cursor) void load(cursor);
            }}
            ListEmptyComponent={
              <Surface variant="tinted" padding="6">
                <Text
                  style={{
                    color: nativeTokens.color.inkMuted,
                    textAlign: "center",
                    fontFamily: nativeTokens.type.family.sans,
                    fontSize: nativeTokens.type.scale.body.size,
                  }}
                >
                  {t("jobs.emptyApplicationsTitle")}
                </Text>
              </Surface>
            }
            ListFooterComponent={
              loading && !firstLoad ? (
                <View style={{ paddingVertical: nativeTokens.space[4] }}>
                  <ActivityIndicator />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function badgeBackground(status: JobApplication["status"]): string {
  if (status === "HIRED") return nativeTokens.color.successSoft;
  if (status === "REJECTED") return nativeTokens.color.dangerSoft;
  if (status === "SHORTLISTED") return nativeTokens.color.brand50;
  return nativeTokens.color.surfaceSubtle;
}

function badgeColor(status: JobApplication["status"]): string {
  if (status === "HIRED") return nativeTokens.color.success;
  if (status === "REJECTED") return nativeTokens.color.danger;
  if (status === "SHORTLISTED") return nativeTokens.color.brand700;
  return nativeTokens.color.ink;
}
