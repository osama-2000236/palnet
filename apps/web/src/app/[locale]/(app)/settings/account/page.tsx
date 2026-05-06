"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiCall } from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const CONFIRMATION = "DELETE_MY_ACCOUNT";

export default function AccountSettingsPage(): JSX.Element {
  const t = useTranslations("account");
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadExport(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy("export");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/account/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("EXPORT_FAILED");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `baydar-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("export.error"));
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount(): Promise<void> {
    setBusy("delete");
    setError(null);
    try {
      await apiCall("/account/delete", {
        method: "POST",
        token: getAccessToken() ?? undefined,
        body: { confirmation: CONFIRMATION },
      });
      clearSession();
      router.replace(`/${locale}/auth/login?deleted=grace`);
    } catch {
      setError(t("delete.error"));
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-6 py-8">
      <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
      <section className="border-line-soft bg-surface flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-ink text-lg font-semibold">{t("export.title")}</h2>
        <p className="text-ink-muted text-sm">{t("export.body")}</p>
        <button
          type="button"
          onClick={() => void downloadExport()}
          disabled={busy !== null}
          className="border-line-soft bg-surface-subtle text-ink hover:bg-surface-muted self-start rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {busy === "export" ? t("export.downloading") : t("export.button")}
        </button>
      </section>

      <section className="border-danger/30 bg-danger/5 flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-danger text-lg font-semibold">{t("delete.title")}</h2>
        <p className="text-ink-muted text-sm">{t("delete.body")}</p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy !== null}
          className="bg-danger text-ink-inverse self-start rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {t("delete.button")}
        </button>
      </section>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4">
          <div className="bg-surface flex w-full max-w-md flex-col gap-4 rounded-lg p-5 shadow-xl">
            <h2 className="text-ink text-lg font-semibold">{t("delete.confirmTitle")}</h2>
            <p className="text-ink-muted text-sm">{t("delete.confirmBody")}</p>
            <input
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              className="border-line-soft rounded-md border px-3 py-2 font-mono text-sm"
              dir="ltr"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setPhrase("");
                }}
                className="border-line-soft rounded-md border px-4 py-2 text-sm"
              >
                {t("delete.cancel")}
              </button>
              <button
                type="button"
                disabled={phrase !== CONFIRMATION || busy !== null}
                onClick={() => void deleteAccount()}
                className="bg-danger text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {busy === "delete" ? t("delete.deleting") : t("delete.confirmButton")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
