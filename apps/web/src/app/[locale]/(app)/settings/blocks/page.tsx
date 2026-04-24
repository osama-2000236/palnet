"use client";

import { BlockedUserList, type BlockedUserItem } from "@palnet/shared";
import { Avatar, Surface } from "@palnet/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiCall, apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export default function BlocksSettingsPage(): JSX.Element {
  const t = useTranslations("settings.blocks");
  const router = useRouter();
  const [blocks, setBlocks] = useState<BlockedUserItem[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(false);
    try {
      const data = await apiFetch("/blocks", BlockedUserList, { token });
      setBlocks(data.blocks);
    } catch {
      setError(true);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function unblock(item: BlockedUserItem): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    const ok = window.confirm(
      `${t("unblockConfirmTitle", { name: `${item.firstName} ${item.lastName}`.trim() })}\n\n${t(
        "unblockConfirmBody",
      )}`,
    );
    if (!ok) return;
    setBusyId(item.userId);
    setError(false);
    try {
      await apiCall(`/blocks/${item.userId}`, {
        method: "DELETE",
        token,
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-ink md:hidden">{t("title")}</h2>
      <Surface as="section" variant="flat" padding="6">
        <header className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-ink">{t("title")}</h2>
          <p className="text-sm text-ink-muted">{t("description")}</p>
        </header>

        {blocks === null && !error ? (
          <p className="text-sm text-ink-muted">…</p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {t("genericError")}
          </p>
        ) : null}

        {blocks && blocks.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("empty")}</p>
        ) : null}

        {blocks && blocks.length > 0 ? (
          <ul className="flex flex-col divide-y divide-ink-muted/15">
            {blocks.map((b) => (
              <li
                key={b.userId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <Link
                  href={`/in/${b.handle}`}
                  className="flex min-w-0 items-center gap-3 hover:underline"
                >
                  <Avatar
                    user={{
                      handle: b.handle,
                      firstName: b.firstName,
                      lastName: b.lastName,
                      avatarUrl: b.avatarUrl,
                    }}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {`${b.firstName} ${b.lastName}`.trim() || b.handle}
                    </p>
                    <p className="truncate text-xs text-ink-muted" dir="ltr">
                      @{b.handle}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void unblock(b);
                  }}
                  disabled={busyId === b.userId}
                  className="rounded-md border border-ink-muted/30 px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-subtle disabled:opacity-60"
                >
                  {t("unblock")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Surface>
    </div>
  );
}
