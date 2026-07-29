"use client";

import {
  ConnectionListItem as ConnectionListItemSchema,
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
} from "@baydar/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch, getValidAccessToken } from "@/lib/api";
import { readSession } from "@/lib/session";

const ListEnvelope = z.array(ConnectionListItemSchema);
type Filter = "ACCEPTED" | "INCOMING" | "OUTGOING";
const Raw = z.object({}).passthrough();

export default function NetworkRoute(): JSX.Element {
  const router = useRouter();
  const t = useTranslations("network");
  const [filter, setFilter] = useState<Filter>("ACCEPTED");
  const [items, setItems] = useState<ConnectionListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (f: Filter): Promise<void> => {
    const token = await getValidAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/connections?filter=${f}`, ListEnvelope, {
        token,
      });
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    void load(filter);
  }, [router, filter, load]);

  async function respond(id: string, action: "ACCEPT" | "DECLINE"): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}/respond`, Raw, {
      method: "POST",
      token,
      body: { action },
    });
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  async function withdraw(id: string): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}/withdraw`, Raw, {
      method: "POST",
      token,
    });
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  async function remove(id: string): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}`, Raw, {
      method: "DELETE",
      token,
    });
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-4 px-6 py-8">
      <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>

      <nav className="flex gap-2">
        <FilterTab active={filter === "ACCEPTED"} onClick={() => setFilter("ACCEPTED")}>
          {t("myConnections")}
        </FilterTab>
        <FilterTab active={filter === "INCOMING"} onClick={() => setFilter("INCOMING")}>
          {t("invitations")}
        </FilterTab>
        <FilterTab active={filter === "OUTGOING"} onClick={() => setFilter("OUTGOING")}>
          {t("sent")}
        </FilterTab>
      </nav>

      {loading ? (
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
} as const satisfies Record<Filter, { title: string; body: string }>;

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "bg-brand-600 text-ink-inverse focus-visible:outline-hidden rounded-md px-4 py-1.5 text-sm font-semibold focus-visible:[box-shadow:var(--focus-ring)]"
          : "border-ink-muted/30 text-ink hover:bg-ink-muted/5 focus-visible:outline-hidden rounded-md border px-4 py-1.5 text-sm focus-visible:[box-shadow:var(--focus-ring)]"
      }
    >
      {children}
    </button>
  );
}

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
