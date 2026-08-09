import { cursorPage, FollowRow } from "@baydar/shared";
import { Avatar, EmptyState, RecordCard, Tab, Tabs, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const FollowPage = cursorPage(FollowRow);

type Side = "followers" | "following";

/**
 * Who follows me, and who I follow — the native twin of web's panel.
 *
 * Two lists rather than one with a filter, because they answer different
 * questions: "who is listening" and "what am I listening to". A member looking
 * for one is never looking for the other.
 */
export function FollowersPanel(): JSX.Element {
  const { t } = useTranslation();
  const [side, setSide] = useState<Side>("followers");
  const [rows, setRows] = useState<FollowRow[] | null>(null);

  const load = useCallback(async (next: Side) => {
    setRows(null);
    const token = (await getAccessToken()) ?? undefined;
    const path = next === "followers" ? "/follows/followers" : "/follows/me?targetType=USER";
    const page = await apiFetchPage(path, FollowPage, { token }).catch(() => null);
    setRows(page?.data ?? []);
  }, []);

  useEffect(() => void load(side), [load, side]);

  return (
    <View style={{ flex: 1, gap: nativeTokens.space[3] }}>
      <Tabs value={side} onChange={(next) => setSide(next as Side)}>
        <Tab value="followers">{t("discovery.followers")}</Tab>
        <Tab value="following">{t("discovery.following")}</Tab>
      </Tabs>

      <FlatList
        data={rows ?? []}
        keyExtractor={(row) => row.id}
        contentContainerStyle={{ gap: nativeTokens.space[2], padding: nativeTokens.space[4] }}
        ListEmptyComponent={
          rows === null ? null : (
            <EmptyState
              motif="network"
              title={t(`discovery.${side}`)}
              body={t(`discovery.empty.${side}`)}
            />
          )
        }
        renderItem={({ item }) =>
          item.user ? (
            <RecordCard
              variant="row"
              title={`${item.user.firstName} ${item.user.lastName}`}
              subtitle={item.user.headline ?? undefined}
              onPress={() => router.push(`/(app)/in/${item.user!.handle}`)}
              leading={
                <Avatar
                  user={{
                    id: item.user.userId,
                    handle: item.user.handle,
                    firstName: item.user.firstName,
                    lastName: item.user.lastName,
                    avatarUrl: item.user.avatarUrl,
                  }}
                />
              }
            />
          ) : null
        }
      />
    </View>
  );
}
