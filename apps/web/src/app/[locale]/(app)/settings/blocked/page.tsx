"use client";

import { BlockedListItem, EmptyState, LowWall, Surface, useToast } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useBlockedUsers, useUnblock } from "@/lib/api/safety";

export default function BlockedSettingsPage(): JSX.Element {
  const t = useTranslations("safety");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();
  const [cursor, setCursor] = useState<string | null>(null);
  const blocked = useBlockedUsers(cursor);
  const unblock = useUnblock();
  const items = blocked.data?.data ?? [];

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-6 py-8">
      <h1 className="text-ink text-2xl font-semibold">{t("blocked.title")}</h1>
      <Surface variant="flat" padding="4">
        {blocked.isLoading ? (
          <p className="text-ink-muted text-sm">{tCommon("loading")}</p>
        ) : items.length === 0 ? (
          <EmptyState
            illustration={<LowWall size={128} />}
            title={t("blocked.empty")}
            description={t("blocked.emptyDesc")}
            density="compact"
          />
        ) : (
          <ul>
            {items.map((item) => (
              <BlockedListItem
                key={item.id}
                item={item}
                labels={{ unblock: t("blocked.unblock") }}
                loading={unblock.isPending}
                onUnblock={(blockedUserId) =>
                  unblock.mutate(blockedUserId, {
                    onSuccess: () => showToast({ message: t("unblock.success"), kind: "success" }),
                    onError: () => showToast({ message: t("unblock.error"), kind: "error" }),
                  })
                }
              />
            ))}
          </ul>
        )}
      </Surface>
      {blocked.data?.meta.hasMore ? (
        <button
          type="button"
          onClick={() => setCursor(blocked.data?.meta.nextCursor ?? null)}
          className="border-line-soft bg-surface text-ink hover:bg-surface-subtle focus-visible:ring-brand-600 self-start rounded-md border px-4 py-2 text-sm focus:outline-none focus-visible:ring-2"
        >
          {t("blocked.loadMore")}
        </button>
      ) : null}
    </main>
  );
}
