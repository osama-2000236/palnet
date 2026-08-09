"use client";

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
  Surface,
} from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState, type JSX } from "react";
import { z } from "zod";

import { apiCall, apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const Suggestions = z.object({ data: z.array(PeopleSuggestion) }).transform((r) => r.data);

/**
 * People you may know, and why.
 *
 * Every card carries the term that scored it. A card the product cannot
 * explain is a card it does not show, so there is no fallback copy here for a
 * missing reason — the API never sends one.
 */
export function SuggestionsPanel(): JSX.Element {
  const t = useTranslations("discovery");
  const locale = useLocale();
  const [items, setItems] = useState<PeopleSuggestion[] | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken() ?? undefined;
    setItems(await apiFetch("/discovery/people", Suggestions, { token }).catch(() => []));
  }, []);

  useEffect(() => void load(), [load]);

  async function dismiss(userId: string): Promise<void> {
    // Optimistic: the card is gone the moment it is dismissed, because a
    // control that waits a second on 2G reads as one that did nothing.
    setItems((prev) => prev?.filter((item) => item.user.userId !== userId) ?? null);
    await apiCall(`/discovery/people/${userId}`, {
      method: "DELETE",
      token: getAccessToken() ?? undefined,
    }).catch(() => undefined);
  }

  if (items === null) return <Surface variant="flat" padding="4" aria-busy="true" />;
  if (items.length === 0) {
    return (
      <Surface variant="card" padding="0">
        <EmptyState motif="network" title={t("tabs.suggestions")} body={t("empty.suggestions")} />
      </Surface>
    );
  }

  return (
    <Surface variant="flat" padding="0">
      <ul>
        {items.map((item) => (
          <li key={item.user.userId}>
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
              reason={reasonLine(t, locale, item)}
              labels={{ dismiss: t("dismiss") }}
              onDismiss={() => void dismiss(item.user.userId)}
              degree={
                <DegreeChip
                  degree={item.graph.degree}
                  labels={{
                    "1st": t("degree.1st"),
                    "2nd": t("degree.2nd"),
                    "3rd+": t("degree.3rd+"),
                  }}
                  label={t("degreeLabel", { degree: t(`degree.${item.graph.degree}`) })}
                />
              }
              actions={
                <>
                  <FollowButton
                    following={item.graph.followState.following}
                    followsYou={item.graph.followState.followsYou}
                    labels={{
                      follow: t("follow.follow"),
                      following: t("follow.following"),
                      followBack: t("follow.followBack"),
                      unfollow: t("follow.unfollow"),
                    }}
                    onToggle={(next) =>
                      apiCall("/follows", {
                        method: next ? "POST" : "DELETE",
                        body: { targetType: "USER", targetUserId: item.user.userId },
                        token: getAccessToken() ?? undefined,
                      })
                    }
                  />
                  <MutualsRow
                    count={item.graph.mutualCount}
                    sample={[]}
                    label={t(`mutuals.${pluralCategory(item.graph.mutualCount, locale)}`, {
                      value: formatNumber(item.graph.mutualCount, locale),
                    })}
                  />
                </>
              }
            />
          </li>
        ))}
      </ul>
    </Surface>
  );
}

/** The one line that justifies the card. */
function reasonLine(
  t: ReturnType<typeof useTranslations<"discovery">>,
  locale: string,
  item: PeopleSuggestion,
): string {
  const reason: SuggestionReason = item.reason;
  if (reason === "SHARED_CONNECTIONS") {
    const count = item.reasonCount ?? 0;
    return t(`reason.SHARED_CONNECTIONS.${pluralCategory(count, locale)}`, {
      value: formatNumber(count, locale),
    });
  }
  if (reason === "ALUMNI" || reason === "NEARBY" || reason === "SAME_ORIGIN") {
    return t(`reason.${reason}`, { name: item.reasonKey ?? "" });
  }
  return t(`reason.${reason}`);
}
