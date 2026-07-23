"use client";

import {
  BillingMe,
  CheckoutSession,
  CheckoutSessionBody,
  KaramaBalance,
  KaramaReward,
  KaramaRedeemResult,
  PaymentMethod,
  PlanCode,
  RedeemKaramaBody,
  type BillingMe as BillingMeDto,
  type KaramaBalance as KaramaBalanceDto,
  type KaramaReward as KaramaRewardDto,
  formatNumber,
} from "@baydar/shared";
import { Button, Surface } from "@baydar/ui-web";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { apiFetch, getValidAccessToken } from "@/lib/api";

type RewardKey = "boost" | "premium" | "featured";
type Notice = { kind: "success" | "error"; text: string };

const REWARDS: { reward: KaramaRewardDto; key: RewardKey; cost: number }[] = [
  { reward: KaramaReward.BOOST_APPLICATION, key: "boost", cost: 100 },
  { reward: KaramaReward.PREMIUM_30D, key: "premium", cost: 500 },
  { reward: KaramaReward.FEATURED_PROFILE_7D, key: "featured", cost: 1000 },
];

export default function KaramaPage(): JSX.Element {
  const router = useRouter();
  const t = useTranslations("karama");
  const locale = useLocale();
  const [balance, setBalance] = useState<KaramaBalanceDto | null>(null);
  const [billingMe, setBillingMe] = useState<BillingMeDto | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyReward, setBusyReward] = useState<KaramaRewardDto | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const token = await getValidAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setNotice(null);
    try {
      const [nextBalance, nextBillingMe] = await Promise.all([
        apiFetch("/karama/balance", KaramaBalance, { token }),
        apiFetch("/billing/me", BillingMe, { token }),
      ]);
      setBalance(nextBalance);
      setBillingMe(nextBillingMe);
    } catch {
      setNotice({ kind: "error", text: t("loadFailed") });
    }
  }, [router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function redeemPremiumWithPoints(token: string): Promise<void> {
    const body = CheckoutSessionBody.parse({
      planCode: PlanCode.USER_PREMIUM,
      returnUrl: window.location.href,
      method: PaymentMethod.POINTS,
    });
    await apiFetch("/billing/checkout-session", CheckoutSession, {
      method: "POST",
      body,
      token,
    });
  }

  async function redeem(reward: KaramaRewardDto): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) return;
    setBusyReward(reward);
    setNotice(null);
    try {
      if (reward === KaramaReward.PREMIUM_30D) {
        await redeemPremiumWithPoints(token);
      } else {
        const parsed = RedeemKaramaBody.parse({
          reward,
          idempotencyKey: `${reward}-${crypto.randomUUID()}`,
        });
        await apiFetch("/karama/redeem", KaramaRedeemResult, {
          method: "POST",
          body: parsed,
          token,
        });
      }
      await load();
      setNotice({
        kind: "success",
        text: reward === KaramaReward.PREMIUM_30D ? t("checkoutSuccess") : t("redeemSuccess"),
      });
    } catch {
      setNotice({ kind: "error", text: t("redeemFailed") });
    } finally {
      setBusyReward(null);
    }
  }

  const hasPremium = billingMe?.subscription?.plan?.code === PlanCode.USER_PREMIUM;

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
            <p className="text-ink text-5xl font-bold">
              {balance ? formatNumber(balance.balance, locale) : t("loadingValue")}
            </p>
          </div>
          <p className="text-ink-muted text-sm">
            {t("cap")} <span>{formatNumber(balance?.cap ?? 5000, locale)}</span>
          </p>
        </div>
      </Surface>

      {notice ? (
        <p className={notice.kind === "error" ? "text-danger text-sm" : "text-brand-700 text-sm"}>
          {notice.text}
        </p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        {REWARDS.map((item) => {
          const isPremium = item.reward === KaramaReward.PREMIUM_30D;
          const disabled =
            !balance ||
            balance.balance < item.cost ||
            busyReward !== null ||
            (isPremium && hasPremium);
          return (
            <Surface key={item.reward} as="article" variant="card" padding="4">
              <div className="flex h-full flex-col gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-ink text-base font-semibold">
                      {t(`rewards.${item.key}.title`)}
                    </h2>
                    {isPremium ? (
                      <span className="border-accent-600 text-accent-700 rounded-full border px-2 py-0.5 text-xs font-semibold">
                        {t("checkoutBadge")}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-ink-muted mt-1 text-sm">{t(`rewards.${item.key}.body`)}</p>
                  <p className="text-brand-700 mt-3 text-sm font-semibold">
                    <span>{formatNumber(item.cost, locale)}</span> {t("points")}
                  </p>
                </div>
                {isPremium && hasPremium ? (
                  <p className="text-ink-muted text-sm">
                    {t("premiumActive")}{" "}
                    <Link
                      href={`/${locale}/me/premium`}
                      className="text-brand-700 font-semibold underline focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)]"
                    >
                      {t("premiumLink")}
                    </Link>
                  </p>
                ) : (
                  <Button
                    variant={isPremium ? "primary" : "secondary"}
                    size="md"
                    disabled={disabled}
                    loading={busyReward === item.reward}
                    onClick={() => void redeem(item.reward)}
                  >
                    {t("redeem")}
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
              <span dir="ltr" className={entry.delta >= 0 ? "text-brand-700" : "text-danger"}>
                {entry.delta > 0 ? "+" : ""}
                {formatNumber(entry.delta, locale)}
              </span>
            </li>
          ))}
        </ul>
        {balance?.recent.length === 0 ? (
          <p className="text-ink-muted text-sm">{t("recentEmpty")}</p>
        ) : null}
      </Surface>
    </main>
  );
}
