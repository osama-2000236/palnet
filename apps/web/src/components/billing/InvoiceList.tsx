"use client";

import {
  localeTag,
  formatMoney,
  Invoice as InvoiceSchema,
  InvoiceStatus,
  PaymentMethod,
  type BankTransferDestination as BankTransferDestinationDto,
  type Invoice as InvoiceDto,
} from "@baydar/shared";
import { Alert, Button, Surface } from "@baydar/ui-web";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { apiFetch, getValidAccessToken } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";
import { uploadFile } from "@/lib/uploads";

interface InvoiceListProps {
  invoices: InvoiceDto[];
  /** Bank-transfer destination so open transfer invoices can re-show the
   *  IBAN + reference after the checkout panel is gone. Null = rail off. */
  bankTransfer?: BankTransferDestinationDto | null;
  /** Called after a receipt submission changes an invoice. */
  onChanged: () => void;
}

const STATUS_TONE: Record<InvoiceStatus, string> = {
  DRAFT: "text-ink-muted bg-surface-subtle",
  OPEN: "text-warning bg-warning/10",
  PAID: "text-success bg-success/10",
  VOID: "text-ink-muted bg-surface-subtle",
  UNCOLLECTIBLE: "text-danger bg-danger/10",
};

export function InvoiceList({
  invoices,
  bankTransfer = null,
  onChanged,
}: InvoiceListProps): JSX.Element {
  const t = useTranslations("billing.invoices");
  const tBilling = useTranslations("billing");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [busyInvoice, setBusyInvoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingInvoiceRef = useRef<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium" });

  function pickReceipt(invoiceId: string): void {
    pendingInvoiceRef.current = invoiceId;
    fileInputRef.current?.click();
  }

  async function submitReceipt(file: File): Promise<void> {
    const invoiceId = pendingInvoiceRef.current;
    pendingInvoiceRef.current = null;
    if (!invoiceId) return;
    const token = await getValidAccessToken();
    if (!token) return;
    setBusyInvoice(invoiceId);
    setError(null);
    try {
      const receiptUrl = await uploadFile({ file, purpose: "RECEIPT", token });
      await apiFetch(`/billing/invoices/${invoiceId}/pay-by-transfer`, InvoiceSchema, {
        method: "POST",
        token,
        body: { receiptUrl },
      });
      onChanged();
    } catch (caught) {
      const message = toErrorMessage(caught, tErrors);
      setError(message === tErrors("fallback") ? t("uploadError") : message);
    } finally {
      setBusyInvoice(null);
    }
  }

  return (
    <Surface as="section" variant="flat" padding="5" className="flex flex-col gap-3">
      <h2 className="text-ink text-lg font-semibold">{t("title")}</h2>

      {error ? <Alert kind="danger">{error}</Alert> : null}

      {invoices.length === 0 ? (
        <p className="text-ink-muted text-sm">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col">
          {invoices.map((invoice, index) => {
            const awaitingReceipt =
              invoice.status === InvoiceStatus.OPEN &&
              invoice.method === PaymentMethod.BANK_TRANSFER;
            return (
              <li
                key={invoice.id}
                className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                  index > 0 ? "border-line-soft border-t" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-ink text-sm font-semibold">
                    {formatMoney(invoice.amountCents, invoice.currency, locale)}
                    <span className="text-ink-muted ms-2 font-normal">
                      {tBilling(`checkout.methods.${methodKey(invoice.method)}`)}
                    </span>
                  </p>
                  <p className="text-ink-muted text-xs">
                    {dateFormatter.format(new Date(invoice.createdAt))}
                    {invoice.status === InvoiceStatus.OPEN && invoice.dueAt
                      ? ` · ${t("dueBy", { date: dateFormatter.format(new Date(invoice.dueAt)) })}`
                      : ""}
                  </p>
                  {awaitingReceipt && invoice.bankReceiptUrl ? (
                    <p className="text-ink-muted mt-1 text-xs">{t("receiptSubmitted")}</p>
                  ) : null}
                  {awaitingReceipt && !invoice.bankReceiptUrl && bankTransfer ? (
                    <dl className="text-ink-muted mt-2 flex flex-col gap-1 text-xs">
                      <div className="flex flex-wrap gap-1">
                        <dt>{tBilling("checkout.bank.beneficiary")}</dt>
                        <dd className="text-ink font-semibold">{bankTransfer.beneficiary}</dd>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <dt>{tBilling("checkout.bank.iban")}</dt>
                        <dd className="text-ink font-mono" dir="ltr">
                          {bankTransfer.iban}
                        </dd>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <dt>{tBilling("checkout.bank.reference")}</dt>
                        <dd className="text-ink font-mono" dir="ltr">
                          {invoice.id}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[invoice.status]}`}
                  >
                    {t(`statuses.${invoice.status}`)}
                  </span>
                  {awaitingReceipt && !invoice.bankReceiptUrl ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={busyInvoice === invoice.id}
                      onClick={() => pickReceipt(invoice.id)}
                    >
                      {busyInvoice === invoice.id ? t("uploading") : t("uploadReceipt")}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void submitReceipt(file);
        }}
      />
    </Surface>
  );
}

function methodKey(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    CARD: "card",
    BANK_TRANSFER: "bankTransfer",
    POINTS: "points",
    JAWWALPAY: "jawwalpay",
    PALPAY: "palpay",
    REFLECT: "reflect",
  };
  return map[method];
}
