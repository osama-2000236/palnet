"use client";

import {
  BillingMe,
  CheckoutSession,
  KaramaBalance,
  KaramaRedeemResult,
  KaramaReward,
  PlanCode,
  PaymentMethod,
  RedeemKaramaBody,
  type BillingMe as BillingMeDto,
  type KaramaBalance as KaramaBalanceDto,
  type KaramaReward as KaramaRewardDto,
} from "@baydar/shared";
import { Alert, Button, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { apiFetch, getValidAccessToken } from "@/lib/api";
import { toErrorMessage } from "@/lib/error-message";

// Rewards and their point costs. PREMIUM_30D goes through the billing
// POINTS checkout so the redemption is recorded as an invoice + active
// subscription; the rest redeem directly against the Karama ledger.
const REWARDS: { reward: KaramaRewardDto; key: "boost" | "premium" | "featured"; cost: number }[] =
  [
    { reward: KaramaReward.BOOST_APPLICATION, key: "boost", cost: 100 },
    { reward: KaramaReward.PREMIUM_30D, key: "premium", cost: 500 },
    { reward: KaramaReward.FEATURED_PROFILE_7D, key: "featured", cost: 1000 },
  ];

export default function KaramaPage(): JSX.Element {
  const t = useTranslations("karama");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();

  const [balance, setBalance] = useState<KaramaBalanceDto | null>(null);
  const [billingMe, setBillingMe] = useState<BillingMeDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyReward, setBusyReward] = useState<KaramaRewardDto | null>(null);

  async function load(): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    setError(null);
    try {
      const [nextBalance, nextBillingMe] = await Promise.all([
        apiFetch("/karama/balance", KaramaBalance, { token }),
        apiFetch("/billing/me", BillingMe, { token }),
      ]);
      setBalance(nextBalance);
      setBillingMe(nextBillingMe);
    } catch {
      setError(t("loadError"));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPremium = billingMe?.subscription?.plan?.code === PlanCode.USER_PREMIUM;

  async function redeem(reward: KaramaRewardDto): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    setBusyReward(reward);
    setError(null);
    setNotice(null);
    try {
      if (reward === KaramaReward.PREMIUM_30D) {
        // Billing-backed: debits points, creates the invoice, and activates
        // the USER_PREMIUM subscription in one call.
        await apiFetch("/billing/checkout-session", CheckoutSession, {
          method: "POST",
          token,
          body: {
            planCode: PlanCode.USER_PREMIUM,
            returnUrl: window.location.href,
            method: PaymentMethod.POINTS,
          },
        });
      } else {
        const body = RedeemKaramaBody.parse({
          reward,
          idempotencyKey: `${reward}-${crypto.randomUUID()}`,
        });
        await apiFetch("/karama/redeem", KaramaRedeemResult, { method: "POST", body, token });
      }
      await load();
      setNotice(t("redeemed", { reward: t(`rewards.${rewardKey(reward)}.title`) }));
    } catch (caught) {
      const message = toErrorMessage(caught, tErrors);
      setError(message === tErrors("fallback") ? t("redeemError") : message);
    } finally {
      setBusyReward(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-brand-700 text-sm font-semibold">{t("kicker")}</p>
        <h1 className="text-ink text-3xl font-bold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("subtitle")}</p>
      </header>

      <Surface as="section" variant="flat" padding="6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-ink-muted text-sm">{t("balance")}</p>
            <p className="text-ink text-5xl font-bold">{balance?.balance ?? tCommon("loading")}</p>
          </div>
          <p className="text-ink-muted text-sm">{t("cap", { cap: balance?.cap ?? 5000 })}</p>
        </div>
      </Surface>

      {error ? (
        <Alert
          kind="danger"
          action={
            <Button variant="ghost" size="sm" onClick={() => void load()}>
              {tCommon("retry")}
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}
      {notice ? <Alert kind="success">{notice}</Alert> : null}

      <section className="grid gap-3 md:grid-cols-3">
        {REWARDS.map((item) => {
          const isPremium = item.reward === KaramaReward.PREMIUM_30D;
          const premiumBlocked = isPremium && hasPremium;
          const disabled =
            !balance || balance.balance < item.cost || busyReward !== null || premiumBlocked;
          return (
            <Surface key={item.reward} as="article" variant="card" padding="4">
              <div className="flex h-full flex-col gap-3">
                <div className="flex-1">
                  <h2 className="text-ink text-base font-semibold">
                    {t(`rewards.${item.key}.title`)}
                  </h2>
                  <p className="text-ink-muted mt-1 text-sm">{t(`rewards.${item.key}.body`)}</p>
                  <p className="text-brand-700 mt-3 text-sm font-semibold">
                    {t("points", { count: item.cost })}
                  </p>
                </div>
                {premiumBlocked ? (
                  <p className="text-ink-muted text-sm">
                    {t("premiumActive")}{" "}
                    <Link
                      href={`/${locale}/me/premium`}
                      className="text-brand-700 font-semibold underline"
                    >
                      {t("premiumLink")}
                    </Link>
                  </p>
                ) : (
                  <Button
                    variant="primary"
                    disabled={disabled}
                    loading={busyReward === item.reward}
                    onClick={() => void redeem(item.reward)}
                  >
                    {busyReward === item.reward ? t("redeeming") : t("redeem")}
                  </Button>
                )}
              </div>
            </Surface>
          );
        })}
      </section>

      <Surface as="section" variant="flat" padding="6">
        <h2 className="text-ink mb-3 text-lg font-semibold">{t("recent")}</h2>
        <ul className="flex flex-col gap-2">
          {(balance?.recent ?? []).map((entry) => (
            <li
              key={entry.id}
              className="border-line-soft flex justify-between gap-3 border-b pb-2 text-sm"
            >
              <span className="text-ink">{t(`reasons.${entry.reason}`)}</span>
              <span className={entry.delta >= 0 ? "text-brand-700" : "text-danger"}>
                {entry.delta > 0 ? "+" : ""}
                {entry.delta}
              </span>
            </li>
          ))}
        </ul>
      </Surface>
    </main>
  );
}

function rewardKey(reward: KaramaRewardDto): "boost" | "premium" | "featured" {
  if (reward === KaramaReward.BOOST_APPLICATION) return "boost";
  if (reward === KaramaReward.PREMIUM_30D) return "premium";
  return "featured";
}
