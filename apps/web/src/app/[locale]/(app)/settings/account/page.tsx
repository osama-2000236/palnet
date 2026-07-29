"use client";

import { AuthSession } from "@baydar/shared";
import { Button, Dialog, Input, Surface, useToast } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiCall, apiFetch } from "@/lib/api";
import { sendVerifyEmailAction } from "@/lib/auth-actions";
import { clearSession, getAccessToken } from "@/lib/session";

const MeUser = AuthSession.shape.user;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const CONFIRMATION = "DELETE_MY_ACCOUNT";

export default function AccountSettingsPage(): JSX.Element {
  const t = useTranslations("account");
  const { showToast } = useToast();
  const locale = useLocale();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState<"export" | "delete" | "verify" | null>(null);
  const [me, setMe] = useState<{ email: string; emailVerified: string | null } | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    apiFetch("/auth/me", MeUser, { token })
      .then((user) => setMe({ email: user.email, emailVerified: user.emailVerified ?? null }))
      .catch(() => setMe(null));
  }, []);

  async function sendVerification(): Promise<void> {
    if (!me) return;
    setBusy("verify");
    try {
      await sendVerifyEmailAction(me.email);
      showToast({ message: t("email.sentToast"), kind: "success" });
    } catch {
      showToast({ message: t("email.error"), kind: "error" });
    } finally {
      setBusy(null);
    }
  }

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

      {me ? (
        <Surface as="section" variant="card" padding="4" className="flex flex-col gap-3">
          <h2 className="text-ink text-lg font-semibold">{t("email.title")}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink text-sm" dir="ltr">
              {me.email}
            </span>
            {me.emailVerified ? (
              <span className="bg-brand-50 text-micro text-brand-700 rounded-full px-2 py-0.5 font-semibold">
                {t("email.verified")}
              </span>
            ) : (
              <span className="bg-surface-subtle text-micro text-ink-muted rounded-full px-2 py-0.5 font-semibold">
                {t("email.unverified")}
              </span>
            )}
          </div>
          {me.emailVerified ? null : (
            <>
              <p className="text-ink-muted text-sm">{t("email.body")}</p>
              <Button
                variant="secondary"
                onClick={() => void sendVerification()}
                loading={busy === "verify"}
                disabled={busy !== null}
                className="self-start"
              >
                {t("email.sendButton")}
              </Button>
            </>
          )}
        </Surface>
      ) : null}

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
