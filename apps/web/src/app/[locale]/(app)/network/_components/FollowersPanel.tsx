"use client";

import { cursorPage, FollowRow } from "@baydar/shared";
import { Avatar, EmptyState, RecordCard, Surface, Tab, Tabs } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState, type JSX } from "react";

import { apiFetchPage } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const FollowPage = cursorPage(FollowRow);

type Side = "followers" | "following";

/**
 * Who follows me, and who I follow.
 *
 * Two lists rather than one with a filter, because they answer different
 * questions — "who is listening" and "what am I listening to" — and a member
 * looking for one is never looking for the other.
 */
export function FollowersPanel(): JSX.Element {
  const t = useTranslations("discovery");
  const [side, setSide] = useState<Side>("followers");
  const [rows, setRows] = useState<FollowRow[] | null>(null);

  const load = useCallback(async (next: Side) => {
    setRows(null);
    const token = getAccessToken() ?? undefined;
    const path = next === "followers" ? "/follows/followers" : "/follows/me?targetType=USER";
    const page = await apiFetchPage(path, FollowPage, { token }).catch(() => null);
    setRows(page?.data ?? []);
  }, []);

  useEffect(() => void load(side), [load, side]);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={side} onChange={(next) => setSide(next as Side)} label={t("followers")}>
        <Tab value="followers">{t("followers")}</Tab>
        <Tab value="following">{t("following")}</Tab>
      </Tabs>

      {rows === null ? (
        <Surface variant="flat" padding="4" aria-busy="true" />
      ) : rows.length === 0 ? (
        <Surface variant="card" padding="0">
          <EmptyState motif="network" title={t(side)} body={t(`empty.${side}`)} />
        </Surface>
      ) : (
        <Surface variant="flat" padding="0">
          <ul>
            {rows.map((row) =>
              row.user ? (
                <RecordCard
                  as="li"
                  key={row.id}
                  variant="row"
                  href={`/in/${row.user.handle}`}
                  linkAs={Link}
                  title={`${row.user.firstName} ${row.user.lastName}`}
                  subtitle={row.user.headline ?? undefined}
                  leading={
                    <Avatar
                      user={{
                        id: row.user.userId,
                        handle: row.user.handle,
                        firstName: row.user.firstName,
                        lastName: row.user.lastName,
                        avatarUrl: row.user.avatarUrl,
                      }}
                    />
                  }
                />
              ) : null,
            )}
          </ul>
        </Surface>
      )}
    </div>
  );
}
