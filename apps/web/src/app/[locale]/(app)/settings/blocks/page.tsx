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
      <h2 className="text-ink text-2xl font-bold md:hidden">{t("title")}</h2>
      <Surface as="section" variant="flat" padding="6">
        <header className="mb-4 flex flex-col gap-1">
          <h2 className="text-ink text-lg font-semibold">{t("title")}</h2>
          <p className="text-ink-muted text-sm">{t("description")}</p>
        </header>

        {blocks === null && !error ? <p className="text-ink-muted text-sm">…</p> : null}

        {error ? (
          <p role="alert" className="text-danger text-sm">
            {t("genericError")}
          </p>
        ) : null}

        {blocks && blocks.length === 0 ? (
          <p className="text-ink-muted text-sm">{t("empty")}</p>
        ) : null}

        {blocks && blocks.length > 0 ? (
          <ul className="divide-ink-muted/15 flex flex-col divide-y">
            {blocks.map((b) => (
              <li key={b.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
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
                    <p className="text-ink truncate text-sm font-semibold">
                      {`${b.firstName} ${b.lastName}`.trim() || b.handle}
                    </p>
                    <p className="text-ink-muted truncate text-xs" dir="ltr">
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
                  className="border-ink-muted/30 text-ink hover:bg-surface-subtle rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-60"
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
