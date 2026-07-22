"use client";

import { localeTag, AdminInvoice, AdminInvoiceActionBody, Invoice } from "@baydar/shared";
import { Button, EmptyState, Surface, Tab, Tabs, useToast } from "@baydar/ui-web";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch, ApiRequestError, getValidAccessToken } from "@/lib/api";
import { readSession } from "@/lib/session";

type InvoiceDto = z.infer<typeof AdminInvoice>;
type InvoiceAction = z.infer<typeof AdminInvoiceActionBody>["action"];

const ACTIONS: InvoiceAction[] = ["MARK_PAID", "VOID"];

type InvoiceFilter = "NEEDS_REVIEW" | "PAID" | "VOID" | "ALL";
const FILTERS: InvoiceFilter[] = ["NEEDS_REVIEW", "PAID", "VOID", "ALL"];

// Only rows still in the review queue get action buttons; history rows are
// read-only. Mirrors the API's NEEDS_REVIEW predicate.
function isActionable(invoice: InvoiceDto): boolean {
  return (
    invoice.status === "OPEN" &&
    invoice.method === "BANK_TRANSFER" &&
    invoice.bankReceiptUrl !== null
  );
}

// next/image only accepts hosts from next.config remotePatterns; receipts
// normally live on media.baydar.ps / R2, anything else keeps the plain link.
function canPreviewReceipt(url: string): boolean {
  return /^https:\/\/(media\.baydar\.ps|[^/]+\.r2\.dev)\//.test(url);
}

function formatAmount(amountCents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(amountCents / 100);
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminBillingPage(): JSX.Element {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.billing");
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceDto[] | null>(null);
  const [filter, setFilter] = useState<InvoiceFilter>("NEEDS_REVIEW");
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  async function load(status: InvoiceFilter = filter): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(null);
    try {
      setInvoices(
        await apiFetch(`/admin/billing/invoices?status=${status}`, z.array(AdminInvoice), {
          token,
        }),
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
    setInvoices(null);
    void load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

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
    // Money action: marking paid activates the purchase immediately, so a
    // misclick needs a gate. Native confirm matches the VOID prompt idiom.
    if (action === "MARK_PAID" && !window.confirm(t("confirmMarkPaid"))) return;
    const key = `${invoiceId}:${action}`;
    setPendingAction(key);
    setError(null);
    try {
      await apiFetch(`/admin/billing/invoices/${invoiceId}/action`, Invoice, {
        method: "POST",
        token,
        body: note === undefined ? { action } : { action, note },
      });
      showToast({ kind: "success", message: t("actionDone", { action: t(`actions.${action}`) }) });
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
          <EmptyState
            motif="settings"
            direction="outline"
            title={t("forbiddenTitle")}
            body={t("forbiddenBody")}
          />
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
      <Tabs
        value={filter}
        onChange={(next) => setFilter(next as InvoiceFilter)}
        label={t("filters.label")}
      >
        {FILTERS.map((status) => (
          <Tab key={status} value={status}>
            {t(`filters.${status}`)}
          </Tab>
        ))}
      </Tabs>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <section className="flex flex-col gap-3">
        {(invoices ?? []).map((invoice) => (
          <Surface
            key={invoice.id}
            as="article"
            variant="card"
            padding="4"
            data-testid={`billing-invoice-${invoice.id}`}
          >
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
                {/* One attribution line per scope — a personal invoice never
                 * prints a "company: n/a" placeholder and vice versa. */}
                <p className="text-ink-muted mt-2 text-sm">
                  {invoice.companyId || invoice.companyName ? (
                    <>
                      {t("company")}{" "}
                      {invoice.companyName ?? <span dir="ltr">{invoice.companyId}</span>}
                    </>
                  ) : invoice.userId || invoice.userName || invoice.userEmail ? (
                    <>
                      {t("user")}{" "}
                      {(invoice.userName ?? invoice.userEmail) ? (
                        <>
                          {invoice.userName}
                          {invoice.userEmail ? <span dir="ltr"> ({invoice.userEmail})</span> : null}
                        </>
                      ) : (
                        <span dir="ltr">{invoice.userId}</span>
                      )}
                    </>
                  ) : (
                    <>
                      {t("user")} {t("missing")}
                    </>
                  )}
                </p>
                <p className="text-ink-muted mt-1 text-sm">
                  {t("status")} {t(`statuses.${invoice.status}`)}
                </p>
                {invoice.reviewNote ? (
                  <p className="text-ink-muted mt-1 text-sm">
                    {t("reviewNote")}: {invoice.reviewNote}
                  </p>
                ) : null}
                {invoice.bankReceiptUrl ? (
                  <a
                    href={invoice.bankReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 mt-2 inline-flex flex-col gap-2 rounded-sm text-sm font-semibold hover:underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
                  >
                    {t("receipt")}
                    {canPreviewReceipt(invoice.bankReceiptUrl) ? (
                      <Image
                        src={invoice.bankReceiptUrl}
                        alt={t("receipt")}
                        width={192}
                        height={128}
                        className="border-line-soft rounded-md border object-cover"
                      />
                    ) : null}
                  </a>
                ) : null}
              </div>
              {isActionable(invoice) ? (
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
              ) : null}
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
          {filter === "NEEDS_REVIEW" ? (
            <EmptyState
              motif="settings"
              direction="outline"
              title={t("emptyTitle")}
              body={t("emptyBody")}
            />
          ) : (
            <EmptyState
              motif="settings"
              direction="outline"
              title={t("emptyFilteredTitle")}
              body={t("emptyFilteredBody")}
            />
          )}
        </Surface>
      ) : null}
    </main>
  );
}
