"use client";

import {
  ConnectionListItem as ConnectionListItemSchema,
  type ConnectionListItem,
} from "@palnet/shared";
import { Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken, readSession } from "@/lib/session";

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
    const token = getAccessToken();
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
    const token = getAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}/respond`, Raw, {
      method: "POST",
      token,
      body: { action },
    });
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  async function withdraw(id: string): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}/withdraw`, Raw, {
      method: "POST",
      token,
    });
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  async function remove(id: string): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    await apiFetch(`/connections/${id}`, Raw, {
      method: "DELETE",
      token,
    });
    setItems((prev) => prev.filter((x) => x.connectionId !== id));
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-col gap-4 px-6 py-8">
      <h1 className="text-3xl font-bold text-ink">{t("title")}</h1>

      <nav className="flex gap-2">
        <FilterTab
          active={filter === "ACCEPTED"}
          onClick={() => setFilter("ACCEPTED")}
        >
          {t("myConnections")}
        </FilterTab>
        <FilterTab
          active={filter === "INCOMING"}
          onClick={() => setFilter("INCOMING")}
        >
          {t("invitations")}
        </FilterTab>
        <FilterTab
          active={filter === "OUTGOING"}
          onClick={() => setFilter("OUTGOING")}
        >
          {t("sent")}
        </FilterTab>
      </nav>

      {loading ? (
        <p className="text-ink-muted">…</p>
      ) : items.length === 0 ? (
        <Surface variant="flat" padding="6" className="text-ink-muted">
          {t("empty")}
        </Surface>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((c) => (
            <Surface
              as="li"
              key={c.connectionId}
              variant="flat"
              padding="4"
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <Link href={`/in/${c.user.handle}`} className="flex flex-col">
                <span className="font-semibold text-ink">
                  {c.user.firstName} {c.user.lastName}
                </span>
                {c.user.headline ? (
                  <span className="text-sm text-ink-muted">
                    {c.user.headline}
                  </span>
                ) : null}
              </Link>

              {filter === "INCOMING" ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void respond(c.connectionId, "ACCEPT")}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-ink-inverse"
                  >
                    {t("accept")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void respond(c.connectionId, "DECLINE")}
                    className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-sm text-ink"
                  >
                    {t("decline")}
                  </button>
                </div>
              ) : filter === "OUTGOING" ? (
                <button
                  type="button"
                  onClick={() => void withdraw(c.connectionId)}
                  className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-sm text-ink"
                >
                  {t("withdraw")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void remove(c.connectionId)}
                  className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-sm text-ink"
                >
                  {t("removeConnection")}
                </button>
              )}
            </Surface>
          ))}
        </ul>
      )}
    </main>
  );
}

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
          ? "rounded-md bg-brand-600 px-4 py-1.5 text-sm font-semibold text-ink-inverse"
          : "rounded-md border border-ink-muted/30 px-4 py-1.5 text-sm text-ink hover:bg-ink-muted/5"
      }
    >
      {children}
    </button>
  );
}
