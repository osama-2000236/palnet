"use client";

// Settings → Verification.
//
// Four checks, and the screen's job is to keep them four. Every row names what
// it proves; nothing here says «موثّق» on its own, because a generic verified
// mark makes a promise Baydar cannot keep — and «معتمد» is banned outright.
//
// The phone flow is two steps in one card rather than a wizard: the member is
// on a phone, on a slow connection, and a second page load between "send" and
// "enter the code" is a page load that can fail.

import { OTP_LIMITS, VerificationMethod, toE164, type VerificationState } from "@baydar/shared";
import { Banner, Button, Input, Surface, VerificationBadge, useToast } from "@baydar/ui-web";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  useConfirmPhoneVerification,
  useMyVerifications,
  useStartEmailDomainVerification,
  useStartPhoneVerification,
} from "@/lib/api/verifications";

const METHODS = [
  VerificationMethod.PHONE,
  VerificationMethod.WORK_EMAIL,
  VerificationMethod.EDU_EMAIL,
  VerificationMethod.PROFESSIONAL_BODY,
] as const;

export default function VerificationSettingsPage(): JSX.Element {
  const t = useTranslations("verification");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();

  const mine = useMyVerifications();
  const startPhone = useStartPhoneVerification();
  const confirmPhone = useConfirmPhoneVerification();
  const startEmail = useStartEmailDomainVerification();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  const byMethod = new Map<string, VerificationState>(
    (mine.data?.verifications ?? []).map((row) => [row.method, row]),
  );

  // Normalised on the client so the member sees the number the code will go to,
  // and so `+970`, `00970` and Arabic-Indic digits all reach the same place.
  const normalised = toE164(phone);

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("subtitle")}</p>
      </header>

      <Banner kind="info">{t("notice")}</Banner>

      <Surface variant="card" padding="0">
        <ul>
          {METHODS.map((method, index) => {
            const row = byMethod.get(method);
            return (
              <li
                key={method}
                className={
                  "flex items-start justify-between gap-3 px-4 py-4" +
                  (index > 0 ? " border-line-soft border-t" : "")
                }
              >
                <div className="min-w-0">
                  <div className="text-ink text-sm font-semibold">
                    {t(`methods.${method}.title`)}
                  </div>
                  <div className="text-ink-muted mt-0.5 text-xs">
                    {t(`methods.${method}.proves`)}
                  </div>
                </div>
                {row?.status === "VERIFIED" ? (
                  <VerificationBadge
                    method={method}
                    label={t(`methods.${method}.badge`)}
                    srLabel={t(`methods.${method}.badgeSpoken`)}
                  />
                ) : (
                  <span className="text-ink-subtle shrink-0 text-xs">
                    {row?.status === "PENDING" ? t("statePending") : t("stateNone")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Surface>

      {/* ── Phone ── */}
      <Surface variant="card" padding="4" className="flex flex-col gap-3">
        <h2 className="text-ink text-base font-semibold">{t("phone.title")}</h2>
        <p className="text-ink-muted text-xs">{t("phone.help")}</p>

        <Input
          fullWidth
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-label={t("phone.label")}
          placeholder={t("phone.placeholder")}
          helper={normalised ?? undefined}
          error={phone.length > 0 && normalised === null}
          errorMessage={phone.length > 0 && normalised === null ? t("phone.invalid") : undefined}
        />

        <Button
          variant="primary"
          disabled={!normalised || startPhone.isPending}
          onClick={() => {
            if (!normalised) return;
            startPhone.mutate(
              { phoneE164: normalised },
              {
                onSuccess: (challenge) => {
                  setSentTo(challenge.phoneTail);
                  showToast({ message: t("phone.sent"), kind: "success" });
                },
                onError: () => showToast({ message: tCommon("genericError"), kind: "error" }),
              },
            );
          }}
        >
          {t("phone.send")}
        </Button>

        {sentTo ? (
          <div className="flex flex-col gap-2">
            <p className="text-ink-muted text-xs">{t("phone.sentTo", { tail: sentTo })}</p>
            <Input
              fullWidth
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              aria-label={t("phone.codeLabel")}
              helper={t("phone.attempts", { value: OTP_LIMITS.MAX_CONFIRM_ATTEMPTS })}
            />
            <Button
              variant="secondary"
              disabled={code.length !== 6 || confirmPhone.isPending}
              onClick={() => {
                if (!normalised) return;
                confirmPhone.mutate(
                  { phoneE164: normalised, code },
                  {
                    onSuccess: () => {
                      setSentTo(null);
                      setCode("");
                      showToast({ message: t("phone.confirmed"), kind: "success" });
                    },
                    onError: () => showToast({ message: t("phone.codeWrong"), kind: "error" }),
                  },
                );
              }}
            >
              {t("phone.confirm")}
            </Button>
          </div>
        ) : null}
      </Surface>

      {/* ── Work or university email ── */}
      <Surface variant="card" padding="4" className="flex flex-col gap-3">
        <h2 className="text-ink text-base font-semibold">{t("email.title")}</h2>
        {/* The domain decides which of the two badges this becomes. Letting the
            member choose would let them choose wrong, and EDU_EMAIL is worth
            more. */}
        <p className="text-ink-muted text-xs">{t("email.help")}</p>

        <Input
          fullWidth
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-label={t("email.label")}
          placeholder={t("email.placeholder")}
        />

        <Button
          variant="primary"
          disabled={!email.includes("@") || startEmail.isPending}
          onClick={() =>
            startEmail.mutate(
              { email },
              {
                onSuccess: () => showToast({ message: t("email.sent"), kind: "success" }),
                onError: () => showToast({ message: tCommon("genericError"), kind: "error" }),
              },
            )
          }
        >
          {t("email.send")}
        </Button>
      </Surface>
    </main>
  );
}
