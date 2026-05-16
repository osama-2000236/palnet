"use client";

import { Invoice } from "@baydar/shared";
import { Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type InvoiceDto = z.infer<typeof Invoice>;

export default function AdminBillingPage(): JSX.Element {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    const token = getAccessToken();
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
      setError("Could not load payment review queue.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(invoiceId: string, action: "MARK_PAID" | "VOID"): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    await apiFetch(`/admin/billing/invoices/${invoiceId}/action`, Invoice, {
      method: "POST",
      token,
      body: { action },
    });
    await load();
  }

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-5 px-6 py-8">
      <header>
        <p className="text-brand-700 text-sm font-semibold">Admin</p>
        <h1 className="text-ink text-3xl font-bold">Payment review</h1>
      </header>
      {error ? <p className="text-danger text-sm">{error}</p> : null}
      <section className="flex flex-col gap-3">
        {(invoices ?? []).map((invoice) => (
          <Surface key={invoice.id} as="article" variant="card" padding="4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-ink text-sm font-semibold">
                  {invoice.amountCents / 100} {invoice.currency} · {invoice.method}
                </p>
                <p className="text-ink-muted text-xs">
                  {new Date(invoice.createdAt).toLocaleString()} · invoice {invoice.id}
                </p>
                <p className="text-ink-muted mt-2 text-sm">
                  Company {invoice.companyId ?? "n/a"} · User {invoice.userId ?? "n/a"}
                </p>
                {invoice.bankReceiptUrl ? (
                  <a
                    href={invoice.bankReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 mt-2 inline-flex text-sm font-semibold hover:underline"
                  >
                    Open receipt
                  </a>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void act(invoice.id, "VOID")}
                  className="border-line-hard rounded-md border px-3 py-2 text-sm"
                >
                  Void
                </button>
                <button
                  type="button"
                  onClick={() => void act(invoice.id, "MARK_PAID")}
                  className="bg-brand-700 text-ink-inverse rounded-md px-3 py-2 text-sm font-semibold"
                >
                  Mark paid
                </button>
              </div>
            </div>
          </Surface>
        ))}
      </section>
      {invoices?.length === 0 ? (
        <Surface variant="flat" padding="4">
          <p className="text-ink-muted text-sm">No bank-transfer receipts need review.</p>
        </Surface>
      ) : null}
    </main>
  );
}
