import {
  formatMoney,
  CheckoutSession,
  PaymentMethod,
  type BankTransferDestination as BankTransferDestinationDto,
  type CheckoutSession as CheckoutSessionDto,
  type KaramaBalance as KaramaBalanceDto,
  type PlanOffer as PlanOfferDto,
  type WalletAvailability as WalletAvailabilityDto,
} from "@baydar/shared";
import {
  Alert,
  Button,
  RadioGroup,
  Surface,
  nativeTokens,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Linking, StyleSheet, Text, View } from "react-native";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";

// Same returnUrl on web and mobile: the payment provider sends the shopper
// back here; the universal-link handler reopens the app when installed.
const CHECKOUT_RETURN_URL = "https://baydar.ps/ar-PS/me/premium";

const WALLET_METHOD_KEYS: Record<string, string> = {
  JAWWALPAY: "jawwalpay",
  PALPAY: "palpay",
  REFLECT: "reflect",
};

export interface CheckoutPanelProps {
  plan: PlanOfferDto;
  /** Company scope for employer plans; omit for personal plans. */
  companyId?: string;
  wallets: WalletAvailabilityDto[];
  /** Bank-transfer destination from the catalog; null = rail unconfigured. */
  bankTransfer?: BankTransferDestinationDto | null;
  /** Karama balance enables the POINTS method (personal plans only). */
  karama?: KaramaBalanceDto | null;
  /** Called after a payment method completes synchronously (POINTS). */
  onActivated: () => void;
}

export function CheckoutPanel({
  plan,
  companyId,
  wallets,
  bankTransfer = null,
  karama = null,
  onActivated,
}: CheckoutPanelProps): JSX.Element {
  const styles = useStyles();
  const { i18n, t } = useTranslation();
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CARD);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CheckoutSessionDto | null>(null);

  const pointsPrice = !companyId && karama ? plan.pointsPrice : null;
  const pointsAffordable = pointsPrice !== null && karama !== null && karama.balance >= pointsPrice;

  const items = [
    { value: PaymentMethod.CARD, label: t("billing.checkout.methods.card") },
    {
      value: PaymentMethod.BANK_TRANSFER,
      label:
        bankTransfer === null
          ? `${t("billing.checkout.methods.bankTransfer")} — ${t("billing.checkout.comingSoon")}`
          : t("billing.checkout.methods.bankTransfer"),
      disabled: bankTransfer === null,
    },
    ...(pointsPrice !== null
      ? [
          {
            value: PaymentMethod.POINTS,
            label: t("billing.checkout.methods.points"),
            disabled: !pointsAffordable,
          },
        ]
      : []),
    ...wallets.map((wallet) => ({
      value: wallet.provider as PaymentMethod,
      label: wallet.configured
        ? t(`billing.checkout.methods.${WALLET_METHOD_KEYS[wallet.provider]}`)
        : `${t(`billing.checkout.methods.${WALLET_METHOD_KEYS[wallet.provider]}`)} — ${t(
            "billing.checkout.comingSoon",
          )}`,
      disabled: !wallet.configured,
    })),
  ];

  async function checkout(): Promise<void> {
    setBusy(true);
    setError(null);
    setSession(null);
    try {
      const result = await apiFetch("/billing/checkout-session", CheckoutSession, {
        method: "POST",
        body: {
          planCode: plan.code,
          companyId,
          returnUrl: CHECKOUT_RETURN_URL,
          method,
        },
      });
      if (result.method === PaymentMethod.CARD) {
        if (result.checkoutUrl) {
          await Linking.openURL(result.checkoutUrl);
        } else {
          setError(t("billing.checkout.cardError"));
        }
      } else {
        setSession(result);
        if (result.method === PaymentMethod.POINTS) onActivated();
      }
    } catch (caught) {
      setError(
        method === PaymentMethod.CARD
          ? t("billing.checkout.cardError")
          : apiErrorMessage(t, caught),
      );
    } finally {
      setBusy(false);
    }
  }

  if (session?.method === PaymentMethod.POINTS) {
    return (
      <Alert
        kind="success"
        title={t("billing.checkout.pointsSuccess.title")}
        body={t("billing.checkout.pointsSuccess.body")}
      />
    );
  }

  if (session?.bankTransfer) {
    const bank = session.bankTransfer;
    return (
      <Surface variant="tinted" padding="5" style={styles.bankCard}>
        <Text style={styles.sectionTitle}>{t("billing.checkout.bank.title")}</Text>
        <Text style={styles.bodyText}>{t("billing.checkout.bank.body")}</Text>
        <BankRow label={t("billing.checkout.bank.beneficiary")} value={bank.beneficiary} />
        <BankRow label={t("billing.checkout.bank.iban")} value={bank.iban} ltr />
        <BankRow label={t("billing.checkout.bank.reference")} value={bank.reference} ltr />
        <BankRow
          label={t("billing.checkout.bank.amount")}
          value={formatMoney(bank.amountCents, bank.currency, i18n.language)}
        />
        <Text style={styles.bodyText}>{t("billing.checkout.bank.due")}</Text>
      </Surface>
    );
  }

  if (session?.wallet) {
    return <Alert body={session.wallet.instructions} />;
  }

  return (
    <Surface variant="flat" padding="5" style={styles.checkoutCard}>
      <Text style={styles.sectionTitle}>{t("billing.checkout.title")}</Text>
      <RadioGroup
        label={t("billing.checkout.title")}
        items={items}
        value={method}
        onValueChange={(next) => setMethod(next as PaymentMethod)}
        disabled={busy}
      />
      {method === PaymentMethod.CARD ? (
        <Text style={styles.bodyText}>{t("billing.checkout.cardRedirect")}</Text>
      ) : null}
      {method === PaymentMethod.POINTS && pointsPrice !== null && karama ? (
        <Text style={styles.bodyText}>
          {t("billing.checkout.pointsBalance", { balance: karama.balance, cost: pointsPrice })}
        </Text>
      ) : null}
      {pointsPrice !== null && !pointsAffordable ? (
        <Text style={styles.bodyText}>
          {t("billing.checkout.pointsInsufficient", { cost: pointsPrice })}
        </Text>
      ) : null}
      {error ? <Alert body={error} kind="danger" /> : null}
      <Button
        variant="primary"
        size="md"
        loading={busy}
        disabled={busy}
        onPress={() => void checkout()}
        accessibilityLabel={t("billing.checkout.confirm")}
      >
        {method === PaymentMethod.POINTS && pointsPrice !== null
          ? t("billing.checkout.confirmPoints", { cost: pointsPrice })
          : t("billing.checkout.confirm")}
      </Button>
    </Surface>
  );
}

function BankRow({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}): JSX.Element {
  const styles = useStyles();
  return (
    <View style={styles.bankRow}>
      <Text style={styles.bankLabel}>{label}</Text>
      <Text selectable style={[styles.bankValue, ltr && styles.ltrValue]}>
        {value}
      </Text>
    </View>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    checkoutCard: {
      gap: nativeTokens.space[3],
    },
    bankCard: {
      gap: nativeTokens.space[2],
    },
    sectionTitle: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.h3.size,
      lineHeight: nativeTokens.type.scale.h3.line,
      fontWeight: "700",
    },
    bodyText: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.body,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    bankRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[1],
    },
    bankLabel: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    bankValue: {
      flexShrink: 1,
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "700",
    },
    ltrValue: {
      writingDirection: "ltr",
    },
  });
}

function useStyles() {
  const c = useThemeTokens().color;
  return useMemo(() => makeStyles(c), [c]);
}
