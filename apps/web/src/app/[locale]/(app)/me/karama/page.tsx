"use client";

import {
  KaramaBalance,
  KaramaReward,
  KaramaRedeemResult,
  RedeemKaramaBody,
  type KaramaBalance as KaramaBalanceDto,
  type KaramaReward as KaramaRewardDto,
} from "@baydar/shared";
import { Surface } from "@baydar/ui-web";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

const REWARDS: { reward: KaramaRewardDto; title: string; cost: number; body: string }[] = [
  {
    reward: KaramaReward.BOOST_APPLICATION,
    title: "Boost application",
    cost: 100,
    body: "Top of employer inbox for 48 hours.",
  },
  {
    reward: KaramaReward.PREMIUM_30D,
    title: "Premium month",
    cost: 500,
    body: "Unlock premium profile visibility for 30 days.",
  },
  {
    reward: KaramaReward.FEATURED_PROFILE_7D,
    title: "Featured profile",
    cost: 1000,
    body: "Pin your profile in skill search for 7 days.",
  },
];

export default function KaramaPage(): JSX.Element {
  const router = useRouter();
  const [balance, setBalance] = useState<KaramaBalanceDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyReward, setBusyReward] = useState<KaramaRewardDto | null>(null);

  async function load(): Promise<void> {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setError(null);
    try {
      setBalance(await apiFetch("/karama/balance", KaramaBalance, { token }));
    } catch {
      setError("Could not load Karama balance.");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function redeem(reward: KaramaRewardDto): Promise<void> {
    const token = getAccessToken();
    if (!token) return;
    const parsed = RedeemKaramaBody.parse({
      reward,
      idempotencyKey: `${reward}-${crypto.randomUUID()}`,
    });
    setBusyReward(reward);
    setError(null);
    try {
      const result = await apiFetch("/karama/redeem", KaramaRedeemResult, {
        method: "POST",
        body: parsed,
        token,
      });
      await load();
      setError(`Redeemed. New balance: ${result.balance}.`);
    } catch {
      setError("Could not redeem this reward.");
    } finally {
      setBusyReward(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <p className="text-brand-700 text-sm font-semibold">Karama Points</p>
        <h1 className="text-ink text-3xl font-bold">Reputation is earned</h1>
        <p className="text-ink-muted text-sm">Spend trusted reputation on visibility boosts.</p>
      </header>

      <Surface as="section" variant="flat" padding="6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-ink-muted text-sm">Balance</p>
            <p className="text-ink text-5xl font-bold">{balance?.balance ?? "…"}</p>
          </div>
          <p className="text-ink-muted text-sm">Cap {balance?.cap ?? 5000}</p>
        </div>
      </Surface>

      {error ? <p className="text-brand-700 text-sm">{error}</p> : null}

      <section className="grid gap-3 md:grid-cols-3">
        {REWARDS.map((item) => {
          const disabled = !balance || balance.balance < item.cost || busyReward !== null;
          return (
            <Surface key={item.reward} as="article" variant="card" padding="4">
              <div className="flex h-full flex-col gap-3">
                <div className="flex-1">
                  <h2 className="text-ink text-base font-semibold">{item.title}</h2>
                  <p className="text-ink-muted mt-1 text-sm">{item.body}</p>
                  <p className="text-brand-700 mt-3 text-sm font-semibold">{item.cost} points</p>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void redeem(item.reward)}
                  className="bg-brand-600 text-ink-inverse rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {busyReward === item.reward ? "Redeeming…" : "Redeem"}
                </button>
              </div>
            </Surface>
          );
        })}
      </section>

      <Surface as="section" variant="flat" padding="6">
        <h2 className="text-ink mb-3 text-lg font-semibold">Recent activity</h2>
        <ul className="flex flex-col gap-2">
          {(balance?.recent ?? []).map((entry) => (
            <li key={entry.id} className="border-line-soft flex justify-between gap-3 border-b pb-2 text-sm">
              <span className="text-ink">{entry.reason.replaceAll("_", " ")}</span>
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
