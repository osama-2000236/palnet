"use client";

import { AdminInvoiceActionBody, Invoice } from "@baydar/shared";
import { Button, EmptyState, Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch, ApiRequestError, getValidAccessToken } from "@/lib/api";
import { readSession } from "@/lib/session";

type InvoiceDto = z.infer<typeof Invoice>;
type InvoiceAction = z.infer<typeof AdminInvoiceActionBody>["action"];

const ACTIONS: InvoiceAction[] = ["MARK_PAID", "VOID"];

function formatAmount(amountCents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amountCents / 100);
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminBillingPage(): JSX.Element {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.billing");
  const [invoices, setInvoices] = useState<InvoiceDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  async function load(): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(null);
    try {
      setInvoices(
        await apiFetch("/admin/billing/invoices?status=NEEDS_REVIEW", z.array(Invoice), { token }),
      );
    } catch {
      setError(t("loadFailed"));
    }
  }

  useEffect(() => {
    // The (admin) layout admits ADMIN and MODERATOR; billing review is
    // ADMIN-only. Show a denied state instead of a raw API 403.
    if (readSession()?.user.role !== "ADMIN") {
      setForbidden(true);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(invoiceId: string, action: InvoiceAction): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    let note: string | undefined;
    if (action === "VOID") {
      const reason = window.prompt(t("voidReasonPrompt"));
      if (reason === null) return;
      // Contract caps the note at 500 chars; truncate rather than 400.
      note = reason.trim().slice(0, 500) || undefined;
    }
    const key = `${invoiceId}:${action}`;
    setPendingAction(key);
    setError(null);
    try {
      await apiFetch(`/admin/billing/invoices/${invoiceId}/action`, Invoice, {
        method: "POST",
        token,
        body: note === undefined ? { action } : { action, note },
      });
      await load();
    } catch (err) {
      // Another operator may have handled the item; refresh so the queue
      // does not keep offering actions on a stale row.
      await load();
      setError(
        err instanceof ApiRequestError && err.status === 409
          ? t("actionConflict")
          : t("actionFailed"),
      );
    } finally {
      setPendingAction(null);
    }
  }

  if (forbidden) {
    return (
      <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 px-6 py-8">
        <Surface variant="flat" padding="4">
          <EmptyState motif="settings" title={t("forbiddenTitle")} body={t("forbiddenBody")} />
        </Surface>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 px-6 py-8">
      <header>
        <p className="text-brand-700 text-sm font-semibold">{t("kicker")}</p>
        <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted mt-1 text-sm">{t("subtitle")}</p>
      </header>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <section className="flex flex-col gap-3">
        {(invoices ?? []).map((invoice) => (
          <Surface key={invoice.id} as="article" variant="card" padding="4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-ink text-sm font-semibold">
                  <span dir="ltr">
                    {formatAmount(invoice.amountCents, invoice.currency, locale)}
                  </span>
                  {" · "}
                  {t(`methods.${invoice.method}`)}
                </p>
                <p className="text-ink-muted text-xs">
                  <span dir="ltr">{formatDate(invoice.createdAt, locale)}</span>
                  {" · "}
                  {t("invoice")} <span dir="ltr">{invoice.id}</span>
                </p>
                <p className="text-ink-muted mt-2 text-sm">
                  {t("company")}{" "}
                  {invoice.companyId ? <span dir="ltr">{invoice.companyId}</span> : t("missing")}
                  {" · "}
                  {t("user")}{" "}
                  {invoice.userId ? <span dir="ltr">{invoice.userId}</span> : t("missing")}
                </p>
                <p className="text-ink-muted mt-1 text-sm">
                  {t("status")} {t(`statuses.${invoice.status}`)}
                </p>
                {invoice.bankReceiptUrl ? (
                  <a
                    href={invoice.bankReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 mt-2 inline-flex rounded-sm text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
                  >
                    {t("receipt")}
                  </a>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {ACTIONS.map((action) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={action === "VOID" ? "danger-ghost" : "secondary"}
                    loading={pendingAction === `${invoice.id}:${action}`}
                    disabled={pendingAction !== null}
                    onClick={() => void act(invoice.id, action)}
                  >
                    {t(`actions.${action}`)}
                  </Button>
                ))}
              </div>
            </div>
          </Surface>
        ))}
      </section>
      {invoices === null && !error ? (
        <Surface variant="flat" padding="4">
          <p className="text-ink-muted text-sm">{t("loading")}</p>
        </Surface>
      ) : null}
      {invoices?.length === 0 ? (
        <Surface variant="flat" padding="4">
          <EmptyState motif="settings" title={t("emptyTitle")} body={t("emptyBody")} />
        </Surface>
      ) : null}
    </main>
  );
}
