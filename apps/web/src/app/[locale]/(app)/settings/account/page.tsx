"use client";

import { Button, Dialog, Input, Surface, useToast } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiCall } from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const CONFIRMATION = "DELETE_MY_ACCOUNT";

export default function AccountSettingsPage(): JSX.Element {
  const t = useTranslations("account");
  const { showToast } = useToast();
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);

  async function downloadExport(): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    setBusy("export");
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
      showToast({ message: t("export.success"), kind: "success" });
    } catch {
      showToast({ message: t("export.error"), kind: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount(): Promise<void> {
    setBusy("delete");
    try {
      await apiCall("/account/delete", {
        method: "POST",
        token: getAccessToken() ?? undefined,
        body: { confirmation: CONFIRMATION },
      });
      clearSession();
      router.replace(`/${locale}/login?deleted=grace`);
    } catch {
      showToast({ message: t("delete.error"), kind: "error" });
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-6 py-8">
      <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
      <Surface as="section" variant="card" padding="4" className="flex flex-col gap-3">
        <h2 className="text-ink text-lg font-semibold">{t("export.title")}</h2>
        <p className="text-ink-muted text-sm">{t("export.body")}</p>
        <Button
          variant="secondary"
          onClick={() => void downloadExport()}
          disabled={busy !== null}
          className="self-start"
        >
          {busy === "export" ? t("export.downloading") : t("export.button")}
        </Button>
      </Surface>

      <Surface
        as="section"
        variant="flat"
        padding="4"
        className="border-danger/30 flex flex-col gap-3 bg-[var(--danger-soft)]"
      >
        <h2 className="text-danger text-lg font-semibold">{t("delete.title")}</h2>
        <p className="text-ink-muted text-sm">{t("delete.body")}</p>
        <Button
          variant="danger-ghost"
          onClick={() => setConfirming(true)}
          disabled={busy !== null}
          className="border-danger/30 bg-surface self-start"
        >
          {t("delete.button")}
        </Button>
      </Surface>

      {confirming ? (
        <Dialog
          open
          onClose={() => {
            setConfirming(false);
            setPhrase("");
          }}
          title={t("delete.confirmTitle")}
          description={t("delete.confirmBody")}
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setConfirming(false);
                  setPhrase("");
                }}
              >
                {t("delete.cancel")}
              </Button>
              <Button
                variant="danger-ghost"
                disabled={phrase !== CONFIRMATION || busy !== null}
                loading={busy === "delete"}
                onClick={() => void deleteAccount()}
                className="border-danger/30"
              >
                {busy === "delete" ? t("delete.deleting") : t("delete.confirmButton")}
              </Button>
            </>
          }
        >
          <Input
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            dir="ltr"
            fullWidth
            autoFocus
            className="font-mono"
          />
        </Dialog>
      ) : null}
    </main>
  );
}
