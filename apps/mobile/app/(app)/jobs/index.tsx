// Mobile jobs list — the tab-bar entry for the briefcase icon.
//
// v1 shape: plain vertical list, no filter sheet yet. Rows mirror the web
// layout but dropping the skills chips for space. Tap opens the detail at
// /(app)/jobs/[id]. Applied badge is shown per-row and on detail.
//
// Paginated via the same cursorPage envelope the web list uses — FlatList
// onEndReached triggers the next page when within 40% of the bottom.

import {
  cursorPage,
  Job as JobSchema,
  type Job,
} from "@palnet/shared";
import { Surface, nativeTokens } from "@palnet/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from "react-native";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const JobsPage = cursorPage(JobSchema);

export default function JobsScreen(): JSX.Element {
  const { t } = useTranslation();
  const [items, setItems] = useState<Job[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  const load = useCallback(async (after: string | null): Promise<void> => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "20" });
      if (after) qs.set("after", after);
      const page = await apiFetchPage(`/jobs?${qs.toString()}`, JobsPage, {
        token,
      });
      setItems((prev) => (after ? [...prev, ...page.data] : page.data));
      setCursor(page.meta.nextCursor);
      setHasMore(page.meta.hasMore);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}>
      <View style={{ flex: 1, paddingHorizontal: nativeTokens.space[4], paddingTop: nativeTokens.space[4] }}>
        <Text
          style={{
            fontSize: nativeTokens.type.scale.display.size,
            lineHeight: nativeTokens.type.scale.display.line,
            fontWeight: "700",
            color: nativeTokens.color.ink,
            fontFamily: nativeTokens.type.family.sans,
            marginBottom: nativeTokens.space[3],
          }}
        >
          {t("jobs.title")}
        </Text>

        {firstLoad ? (
          <View style={{ gap: nativeTokens.space[3] }}>
            <JobRowSkeleton />
            <JobRowSkeleton />
            <JobRowSkeleton />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(j) => j.id}
            renderItem={({ item }) => <JobRow job={item} />}
            ItemSeparatorComponent={() => <View style={{ height: nativeTokens.space[3] }} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (!loading && hasMore && cursor) void load(cursor);
            }}
            ListEmptyComponent={
              loading ? null : (
                <Surface variant="tinted" padding="6">
                  <Text
                    style={{
                      color: nativeTokens.color.inkMuted,
                      fontSize: nativeTokens.type.scale.body.size,
                      fontFamily: nativeTokens.type.family.sans,
                      textAlign: "center",
                    }}
                  >
                    {t("jobs.emptyTitle")}
                  </Text>
                </Surface>
              )
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

function JobRow({ job }: { job: Job }): JSX.Element {
  const { t } = useTranslation();
  const metaParts = [
    job.city,
    t(`jobs.locationLabels.${job.locationMode}`),
    t(`jobs.typeLabels.${job.type}`),
  ].filter(Boolean) as string[];

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/(app)/jobs/[id]", params: { id: job.id } })
      }
      accessibilityRole="link"
      accessibilityLabel={`${job.title} — ${job.company.name}`}
    >
      <Surface variant="card" padding="4">
        <View style={{ flexDirection: "row", gap: nativeTokens.space[3] }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: nativeTokens.radius.md,
              backgroundColor: nativeTokens.color.surfaceSunken,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {job.company.logoUrl ? (
              <Image
                source={{ uri: job.company.logoUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontWeight: "600",
                  fontFamily: nativeTokens.type.family.sans,
                }}
              >
                {(job.company.name[0] ?? "?").toUpperCase()}
              </Text>
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: nativeTokens.space[2],
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: nativeTokens.color.ink,
                    fontSize: nativeTokens.type.scale.h3.size,
                    lineHeight: nativeTokens.type.scale.h3.line,
                    fontWeight: "600",
                    fontFamily: nativeTokens.type.family.sans,
                  }}
                >
                  {job.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: nativeTokens.color.inkMuted,
                    fontSize: nativeTokens.type.scale.small.size,
                    fontFamily: nativeTokens.type.family.sans,
                  }}
                >
                  {job.company.name}
                </Text>
              </View>
              {job.viewer.hasApplied ? (
                <View
                  style={{
                    alignSelf: "flex-start",
                    paddingHorizontal: nativeTokens.space[2],
                    paddingVertical: 2,
                    borderRadius: nativeTokens.radius.full,
                    backgroundColor: nativeTokens.color.successSoft,
                  }}
                >
                  <Text
                    style={{
                      color: nativeTokens.color.success,
                      fontSize: 11,
                      fontWeight: "700",
                      fontFamily: nativeTokens.type.family.sans,
                    }}
                  >
                    {t("jobs.appliedBadge")}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={{
                marginTop: nativeTokens.space[1],
                color: nativeTokens.color.inkMuted,
                fontSize: nativeTokens.type.scale.small.size,
                fontFamily: nativeTokens.type.family.sans,
              }}
            >
              {metaParts.join(" · ")}
            </Text>
          </View>
        </View>
      </Surface>
    </Pressable>
  );
}

function JobRowSkeleton(): JSX.Element {
  return (
    <Surface variant="card" padding="4">
      <View style={{ flexDirection: "row", gap: nativeTokens.space[3] }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: nativeTokens.radius.md,
            backgroundColor: nativeTokens.color.surfaceSunken,
          }}
        />
        <View style={{ flex: 1, gap: nativeTokens.space[2] }}>
          <View
            style={{
              height: 14,
              width: "66%",
              borderRadius: nativeTokens.radius.sm,
              backgroundColor: nativeTokens.color.surfaceSunken,
            }}
          />
          <View
            style={{
              height: 12,
              width: "40%",
              borderRadius: nativeTokens.radius.sm,
              backgroundColor: nativeTokens.color.surfaceSunken,
            }}
          />
        </View>
      </View>
    </Surface>
  );
}
