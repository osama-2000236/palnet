"use client";

import {
  ConnectionCounts,
  ConnectionListItem as ConnectionListItemSchema,
  type ConnectionCounts as ConnectionCountsDto,
  type ConnectionListItem,
} from "@baydar/shared";
import {
  Avatar,
  Button,
  EmptyState,
  RecordCard,
  RecordCardSkeleton,
  Skeleton,
  staggerDelay,
  Surface,
  Tab,
  Tabs,
} from "@baydar/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { FollowersPanel } from "./_components/FollowersPanel";
import { SuggestionsPanel } from "./_components/SuggestionsPanel";
import { apiFetch, getValidAccessToken } from "@/lib/api";
import { readSession } from "@/lib/session";
import { useCountFormatter } from "../useAppShellLabels";

const ListEnvelope = z.array(ConnectionListItemSchema);
type Filter = "ACCEPTED" | "INCOMING" | "OUTGOING" | "SUGGESTIONS" | "FOLLOWERS";
/** The three that list connections. The other two render their own panel. */
type ConnectionFilter = Extract<Filter, "ACCEPTED" | "INCOMING" | "OUTGOING">;
const Raw = z.object({}).passthrough();

export default function NetworkRoute(): JSX.Element {
  const router = useRouter();
  const t = useTranslations("network");
  const tDiscovery = useTranslations("discovery");
  const formatCount = useCountFormatter();
  const [filter, setFilter] = useState<Filter>("ACCEPTED");
  const [items, setItems] = useState<ConnectionListItem[]>([]);
  const [counts, setCounts] = useState<ConnectionCountsDto | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (f: Filter): Promise<void> => {
    const token = await getValidAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      // Counts alongside the list, not derived from it: this response holds one
      // filter, and the strip labels all three. A failed count must not fail
      // the screen, so the tabs just go back to bare labels.
      const [data, nextCounts] = await Promise.all([
        apiFetch(`/connections?filter=${f}`, ListEnvelope, { token }),
        apiFetch("/connections/counts", ConnectionCounts, { token }).catch(() => null),
      ]);
      setItems(data);
      setCounts(nextCounts);
    } finally {
      setLoading(false);
    }
  }, []);

  // Every mutation below moves a row between two of the three tabs, so the
  // strip is stale the moment one lands. Re-reading the counts is one request;
  // re-reading the list would flash the rows that did not move.
  const refreshCounts = useCallback(async (): Promise<void> => {
    const token = await getValidAccessToken();
    if (!token) return;
    setCounts(await apiFetch("/connections/counts", ConnectionCounts, { token }).catch(() => null));
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    void load(filter);
  }, [router, filter, load]);

  // One place: every mutation drops the row from the open list and re-reads the
  // strip, because the row it dropped landed in another tab.
  const dropRow = useCallback(
    (id: string): void => {
      setItems((prev) => prev.filter((x) => x.connectionId !== id));
      void refreshCounts();
    },
    [refreshCounts],
  );

  async function respond(id: string, action: "ACCEPT" | "DECLINE"): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}/respond`, Raw, {
      method: "POST",
      token,
      body: { action },
    });
    dropRow(id);
  }

  async function withdraw(id: string): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}/withdraw`, Raw, {
      method: "POST",
      token,
    });
    dropRow(id);
  }

  async function remove(id: string): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}`, Raw, {
      method: "DELETE",
      token,
    });
    dropRow(id);
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-4 px-6 py-8">
      <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>

      <Tabs
        value={filter}
        onChange={(next) => setFilter(next as Filter)}
        label={t("title")}
        formatCount={formatCount}
      >
        <Tab value="ACCEPTED" count={counts?.accepted}>
          {t("myConnections")}
        </Tab>
        <Tab value="INCOMING" count={counts?.incoming}>
          {t("invitations")}
        </Tab>
        <Tab value="OUTGOING" count={counts?.outgoing}>
          {t("sent")}
        </Tab>
        {/* The asymmetric half of the graph. Kept alongside "sent" rather than
            replacing it: withdrawing an outgoing request is a real thing to
            need, and the spec's four tabs do not include it. */}
        <Tab value="SUGGESTIONS">{tDiscovery("tabs.suggestions")}</Tab>
        <Tab value="FOLLOWERS">{tDiscovery("tabs.followers")}</Tab>
      </Tabs>

      {filter === "SUGGESTIONS" ? <SuggestionsPanel /> : null}
      {filter === "FOLLOWERS" ? <FollowersPanel /> : null}

      {filter === "SUGGESTIONS" || filter === "FOLLOWERS" ? null : loading ? (
        <Surface variant="flat" padding="0" aria-busy="true">
          <ul aria-label={t("title")}>
            <ConnectionRowSkeleton />
            <ConnectionRowSkeleton />
            <ConnectionRowSkeleton />
          </ul>
        </Surface>
      ) : items.length === 0 ? (
        <Surface variant="card" padding="0">
          <EmptyState
            motif="network"
            title={t(EMPTY_STATE_COPY[filter].title)}
            body={t(EMPTY_STATE_COPY[filter].body)}
          />
        </Surface>
      ) : (
        <Surface variant="flat" padding="0">
          <ul>
            {items.map((c, i) => (
              <RecordCard
                as="li"
                key={c.connectionId}
                variant="row"
                href={`/in/${c.user.handle}`}
                linkAs={Link}
                className="animate-enter-up hover:bg-surface-subtle transition-colors last:border-b-0"
                style={{ animationDelay: `${staggerDelay(i)}ms` }}
                leading={
                  <Avatar
                    user={{
                      id: c.user.userId,
                      handle: c.user.handle,
                      firstName: c.user.firstName,
                      lastName: c.user.lastName,
                      avatarUrl: c.user.avatarUrl ?? null,
                    }}
                    size="md"
                  />
                }
                title={`${c.user.firstName} ${c.user.lastName}`}
                subtitle={c.user.headline}
                trailing={
                  filter === "INCOMING" ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void respond(c.connectionId, "ACCEPT")}
                      >
                        {t("accept")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void respond(c.connectionId, "DECLINE")}
                      >
                        {t("decline")}
                      </Button>
                    </>
                  ) : filter === "OUTGOING" ? (
                    <Button variant="ghost" size="sm" onClick={() => void withdraw(c.connectionId)}>
                      {t("withdraw")}
                    </Button>
                  ) : (
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      onClick={() => void remove(c.connectionId)}
                    >
                      {t("removeConnection")}
                    </Button>
                  )
                }
              />
            ))}
          </ul>
        </Surface>
      )}
    </main>
  );
}

const EMPTY_STATE_COPY = {
  ACCEPTED: {
    title: "emptyConnectionsTitle",
    body: "emptyConnectionsBody",
  },
  INCOMING: {
    title: "emptyIncomingTitle",
    body: "emptyIncomingBody",
  },
  OUTGOING: {
    title: "emptyOutgoingTitle",
    body: "emptyOutgoingBody",
  },
  // `ConnectionFilter`, not `Filter`: the suggestions and followers tabs own
  // their own empty states, because "no invitations" and "no suggestions" are
  // different sentences with different advice.
} as const satisfies Record<ConnectionFilter, { title: string; body: string }>;

function ConnectionRowSkeleton(): JSX.Element {
  return (
    <RecordCardSkeleton
      as="li"
      variant="row"
      meta={false}
      className="last:border-b-0"
      leading={<Skeleton kind="circle" className="h-10 w-10 shrink-0" />}
      trailing={<Skeleton kind="pill" className="h-7 w-24" />}
    />
  );
}
