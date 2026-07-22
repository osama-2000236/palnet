"use client";

import {
  formatMoney,
  CheckoutSession,
  PaymentMethod,
  type CheckoutSession as CheckoutSessionDto,
  type KaramaBalance as KaramaBalanceDto,
  type PlanOffer as PlanOfferDto,
  type WalletAvailability as WalletAvailabilityDto,
} from "@baydar/shared";
import { Alert, Button, RadioGroup, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { apiFetch, getValidAccessToken } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";

interface PremiumCheckoutProps {
  plan: PlanOfferDto;
  wallets: WalletAvailabilityDto[];
  karama: KaramaBalanceDto;
  /** Called after a payment method activates Premium synchronously (POINTS). */
  onActivated: () => void;
}

const WALLET_METHOD_KEYS: Record<string, string> = {
  JAWWALPAY: "jawwalpay",
  PALPAY: "palpay",
  REFLECT: "reflect",
};

export function PremiumCheckout({
  plan,
  wallets,
  karama,
  onActivated,
}: PremiumCheckoutProps): JSX.Element {
  const t = useTranslations("premium.checkout");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CheckoutSessionDto | null>(null);

  const pointsPrice = plan.pointsPrice;
  const pointsAffordable = pointsPrice !== null && karama.balance >= pointsPrice;

  const items = [
    { value: PaymentMethod.CARD, label: t("methods.card") },
    { value: PaymentMethod.BANK_TRANSFER, label: t("methods.bankTransfer") },
    ...(pointsPrice !== null
      ? [
          {
            value: PaymentMethod.POINTS,
            label: t("methods.points"),
            disabled: !pointsAffordable,
          },
        ]
      : []),
    ...wallets.map((wallet) => ({
      value: wallet.provider as PaymentMethod,
      label: wallet.configured
        ? t(`methods.${WALLET_METHOD_KEYS[wallet.provider]}`)
        : `${t(`methods.${WALLET_METHOD_KEYS[wallet.provider]}`)} — ${t("comingSoon")}`,
      disabled: !wallet.configured,
    })),
  ];

  async function checkout(): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    setSession(null);
    try {
      const result = await apiFetch("/billing/checkout-session", CheckoutSession, {
        method: "POST",
        token,
        body: {
          planCode: plan.code,
          returnUrl: window.location.href,
          method,
        },
      });
      if (result.method === PaymentMethod.CARD) {
        if (result.checkoutUrl) {
          window.location.assign(result.checkoutUrl);
          return; // keep the busy state while the browser navigates away
        }
        setError(t("cardError"));
      } else {
        setSession(result);
        if (result.method === PaymentMethod.POINTS) onActivated();
      }
    } catch (caught) {
      setError(method === PaymentMethod.CARD ? t("cardError") : toErrorMessage(caught, tErrors));
    } finally {
      setBusy(false);
    }
  }

  if (session?.method === PaymentMethod.POINTS) {
    return (
      <Alert kind="success" title={t("pointsSuccess.title")}>
        {t("pointsSuccess.body")}
      </Alert>
    );
  }

  if (session?.bankTransfer) {
    const bank = session.bankTransfer;
    return (
      <Surface as="section" variant="tinted" padding="5" className="flex flex-col gap-3">
        <h3 className="text-ink text-base font-semibold">{t("bank.title")}</h3>
        <p className="text-ink-muted text-sm">{t("bank.body")}</p>
        <dl className="flex flex-col gap-2 text-sm">
          <BankRow label={t("bank.beneficiary")} value={bank.beneficiary} />
          <BankRow label={t("bank.iban")} value={bank.iban} mono />
          <BankRow label={t("bank.reference")} value={bank.reference} mono />
          <BankRow
            label={t("bank.amount")}
            value={formatMoney(bank.amountCents, bank.currency, locale)}
          />
        </dl>
        <p className="text-ink-muted text-sm">{t("bank.due")}</p>
      </Surface>
    );
  }

  if (session?.wallet) {
    return (
      <Alert kind="info">
        {session.wallet.instructions}
        {session.wallet.deepLink ? (
          <a href={session.wallet.deepLink} className="text-brand-700 ms-1 font-semibold underline">
            {t(`methods.${WALLET_METHOD_KEYS[session.wallet.provider]}`)}
          </a>
        ) : null}
      </Alert>
    );
  }

  return (
    <Surface as="section" variant="flat" padding="5" className="flex flex-col gap-4">
      <RadioGroup
        legend={t("title")}
        items={items}
        value={method}
        onValueChange={(next) => setMethod(next as PaymentMethod)}
        disabled={busy}
      />

      {method === PaymentMethod.CARD ? (
        <p className="text-ink-muted text-sm">{t("cardRedirect")}</p>
      ) : null}
      {method === PaymentMethod.POINTS && pointsPrice !== null ? (
        <p className="text-ink-muted text-sm">
          {t("pointsBalance", { balance: karama.balance, cost: pointsPrice })}
        </p>
      ) : null}
      {pointsPrice !== null && !pointsAffordable ? (
        <p className="text-ink-muted text-sm">
          {t("pointsInsufficient", { cost: pointsPrice })}{" "}
          <Link href={`/${locale}/me/karama`} className="text-brand-700 font-semibold underline">
            {t("earnPoints")}
          </Link>
        </p>
      ) : null}

      {error ? <Alert kind="danger">{error}</Alert> : null}

      <Button
        variant="primary"
        loading={busy}
        onClick={() => void checkout()}
        className="self-start"
      >
        {busy
          ? t("processing")
          : method === PaymentMethod.POINTS && pointsPrice !== null
            ? t("confirmPoints", { cost: pointsPrice })
            : t("confirm")}
      </Button>
    </Surface>
  );
}

function BankRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd
        className={mono ? "text-ink font-mono" : "text-ink font-semibold"}
        dir={mono ? "ltr" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
