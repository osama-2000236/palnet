import {
  formatNumber,
  PeopleSuggestion,
  pluralCategory,
  type SuggestionReason,
} from "@baydar/shared";
import {
  DegreeChip,
  EmptyState,
  FollowButton,
  MutualsRow,
  SuggestionCard,
  nativeTokens,
} from "@baydar/ui-native";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, View } from "react-native";
import { z } from "zod";

import { apiCall, apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const Suggestions = z.object({ data: z.array(PeopleSuggestion) }).transform((r) => r.data);

/**
 * People you may know, and why.
 *
 * Every card carries the term that scored it. A card the product cannot
 * explain is a card it does not show, so there is no fallback copy for a
 * missing reason — the API never sends one.
 */
export function SuggestionsPanel(): JSX.Element {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<PeopleSuggestion[] | null>(null);

  const load = useCallback(async () => {
    const token = (await getAccessToken()) ?? undefined;
    setItems(await apiFetch("/discovery/people", Suggestions, { token }).catch(() => []));
  }, []);

  useEffect(() => void load(), [load]);

  async function dismiss(userId: string): Promise<void> {
    // Optimistic: on 2G a control that waits a second reads as one that did
    // nothing, and "not this person" has to feel answered.
    setItems((prev) => prev?.filter((item) => item.user.userId !== userId) ?? null);
    const token = (await getAccessToken()) ?? undefined;
    await apiCall(`/discovery/people/${userId}`, { method: "DELETE", token }).catch(
      () => undefined,
    );
  }

  if (items === null) return <View />;
  if (items.length === 0) {
    return (
      <EmptyState
        motif="network"
        title={t("discovery.tabs.suggestions")}
        body={t("discovery.empty.suggestions")}
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.user.userId}
      contentContainerStyle={{ gap: nativeTokens.space[2], padding: nativeTokens.space[4] }}
      renderItem={({ item }) => (
        <SuggestionCard
          user={{
            id: item.user.userId,
            handle: item.user.handle,
            firstName: item.user.firstName,
            lastName: item.user.lastName,
            avatarUrl: item.user.avatarUrl,
          }}
          name={`${item.user.firstName} ${item.user.lastName}`}
          headline={item.user.headline}
          reason={reasonLine(t, i18n.language, item)}
          labels={{ dismiss: t("discovery.dismiss") }}
          onOpen={() => router.push(`/(app)/in/${item.user.handle}`)}
          onDismiss={() => void dismiss(item.user.userId)}
          degree={
            <DegreeChip
              degree={item.graph.degree}
              labels={{
                "1st": t("discovery.degree.1st"),
                "2nd": t("discovery.degree.2nd"),
                "3rd+": t("discovery.degree.3rd+"),
              }}
              label={t("discovery.degreeLabel", {
                degree: t(`discovery.degree.${item.graph.degree}`),
              })}
            />
          }
          actions={
            <>
              <FollowButton
                following={item.graph.followState.following}
                followsYou={item.graph.followState.followsYou}
                labels={{
                  follow: t("discovery.follow.follow"),
                  following: t("discovery.follow.following"),
                  followBack: t("discovery.follow.followBack"),
                  unfollow: t("discovery.follow.unfollow"),
                }}
                onToggle={async (next) => {
                  const token = (await getAccessToken()) ?? undefined;
                  await apiCall("/follows", {
                    method: next ? "POST" : "DELETE",
                    body: { targetType: "USER", targetUserId: item.user.userId },
                    token,
                  });
                }}
              />
              <MutualsRow
                count={item.graph.mutualCount}
                sample={[]}
                label={t(
                  `discovery.mutuals.${pluralCategory(item.graph.mutualCount, i18n.language)}`,
                  { value: formatNumber(item.graph.mutualCount, i18n.language) },
                )}
              />
            </>
          }
        />
      )}
    />
  );
}

/** The one line that justifies the card. */
function reasonLine(
  t: (key: string, vars?: Record<string, string>) => string,
  locale: string,
  item: PeopleSuggestion,
): string {
  const reason: SuggestionReason = item.reason;
  if (reason === "SHARED_CONNECTIONS") {
    const count = item.reasonCount ?? 0;
    return t(`discovery.reason.SHARED_CONNECTIONS.${pluralCategory(count, locale)}`, {
      value: formatNumber(count, locale),
    });
  }
  if (reason === "ALUMNI" || reason === "NEARBY" || reason === "SAME_ORIGIN") {
    return t(`discovery.reason.${reason}`, { name: item.reasonKey ?? "" });
  }
  return t(`discovery.reason.${reason}`);
}
