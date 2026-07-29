import {
  formatDate,
  formatMoney,
  Invoice as InvoiceSchema,
  InvoiceStatus,
  PaymentMethod,
  type BankTransferDestination as BankTransferDestinationDto,
  type Invoice as InvoiceDto,
} from "@baydar/shared";
import {
  Alert,
  Button,
  Surface,
  nativeTokens,
  useThemeTokens,
  type NativeTheme,
} from "@baydar/ui-native";
import * as ImagePicker from "expo-image-picker";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadAsset } from "@/lib/uploads";

interface InvoiceListProps {
  invoices: InvoiceDto[];
  /** Bank-transfer destination so open transfer invoices can re-show the
   *  IBAN + reference after the checkout panel is gone. Null = rail off. */
  bankTransfer?: BankTransferDestinationDto | null;
  /** Called after a receipt submission changes an invoice. */
  onChanged: () => void;
}

const METHOD_KEYS: Record<PaymentMethod, string> = {
  CARD: "card",
  BANK_TRANSFER: "bankTransfer",
  POINTS: "points",
  JAWWALPAY: "jawwalpay",
  PALPAY: "palpay",
  REFLECT: "reflect",
};

function statusColor(c: NativeTheme["color"]): Record<InvoiceStatus, string> {
  return {
    DRAFT: c.inkMuted,
    OPEN: c.warning,
    PAID: c.success,
    VOID: c.inkMuted,
    UNCOLLECTIBLE: c.danger,
  };
}

export function InvoiceList({
  invoices,
  bankTransfer = null,
  onChanged,
}: InvoiceListProps): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const STATUS_COLOR = statusColor(c);
  const { i18n, t } = useTranslation();
  const [busyInvoice, setBusyInvoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickAndSubmitReceipt(invoiceId: string): Promise<void> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images" });
    const asset = picked.assets?.[0];
    if (picked.canceled || !asset) return;

    const token = await getAccessToken();
    if (!token) return;
    setBusyInvoice(invoiceId);
    setError(null);
    try {
      const uploaded = await uploadAsset({
        asset: {
          uri: asset.uri,
          mimeType: asset.mimeType ?? "image/jpeg",
          sizeBytes: asset.fileSize ?? 0,
          filename: asset.fileName ?? undefined,
        },
        purpose: "RECEIPT",
        token,
      });
      await apiFetch(`/billing/invoices/${invoiceId}/pay-by-transfer`, InvoiceSchema, {
        method: "POST",
        body: { receiptUrl: uploaded.publicUrl },
      });
      onChanged();
    } catch {
      setError(t("billing.invoices.uploadError"));
    } finally {
      setBusyInvoice(null);
    }
  }

  return (
    <Surface variant="flat" padding="5" style={styles.card}>
      <Text style={styles.title}>{t("billing.invoices.title")}</Text>

      {error ? <Alert body={error} kind="danger" /> : null}

      {invoices.length === 0 ? (
        <Text style={styles.bodyText}>{t("billing.invoices.empty")}</Text>
      ) : (
        invoices.map((invoice, index) => {
          const awaitingReceipt =
            invoice.status === InvoiceStatus.OPEN && invoice.method === PaymentMethod.BANK_TRANSFER;
          return (
            <View key={invoice.id} style={[styles.row, index > 0 && styles.rowBorder]}>
              <View style={styles.rowMain}>
                <Text style={styles.amount}>
                  {formatMoney(invoice.amountCents, invoice.currency, i18n.language)}
                  <Text style={styles.method}>
                    {"  "}
                    {t(`billing.checkout.methods.${METHOD_KEYS[invoice.method]}`)}
                  </Text>
                </Text>
                <Text style={styles.meta}>
                  {formatDate(invoice.createdAt, i18n.language)}
                  {invoice.status === InvoiceStatus.OPEN && invoice.dueAt
                    ? ` · ${t("billing.invoices.dueBy", { date: formatDate(invoice.dueAt, i18n.language) })}`
                    : ""}
                </Text>
                <Text style={[styles.status, { color: STATUS_COLOR[invoice.status] }]}>
                  {t(`billing.invoices.statuses.${invoice.status}`)}
                </Text>
                {awaitingReceipt && invoice.bankReceiptUrl ? (
                  <Text style={styles.meta}>{t("billing.invoices.receiptSubmitted")}</Text>
                ) : null}
                {awaitingReceipt && !invoice.bankReceiptUrl && bankTransfer ? (
                  <View style={styles.bankDetails}>
                    <Text style={styles.meta}>
                      {t("billing.checkout.bank.beneficiary")}{" "}
                      <Text style={styles.bankValue}>{bankTransfer.beneficiary}</Text>
                    </Text>
                    <Text style={styles.meta}>
                      {t("billing.checkout.bank.iban")}{" "}
                      <Text selectable style={[styles.bankValue, styles.ltrValue]}>
                        {bankTransfer.iban}
                      </Text>
                    </Text>
                    <Text style={styles.meta}>
                      {t("billing.checkout.bank.reference")}{" "}
                      <Text selectable style={[styles.bankValue, styles.ltrValue]}>
                        {invoice.id}
                      </Text>
                    </Text>
                  </View>
                ) : null}
              </View>
              {awaitingReceipt && !invoice.bankReceiptUrl ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={busyInvoice === invoice.id}
                  disabled={busyInvoice !== null}
                  onPress={() => void pickAndSubmitReceipt(invoice.id)}
                  accessibilityLabel={t("billing.invoices.uploadReceipt")}
                >
                  {t("billing.invoices.uploadReceipt")}
                </Button>
              ) : null}
            </View>
          );
        })
      )}
    </Surface>
  );
}

function makeStyles(c: NativeTheme["color"]) {
  return StyleSheet.create({
    card: {
      gap: nativeTokens.space[3],
    },
    title: {
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
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: nativeTokens.space[3],
      paddingVertical: nativeTokens.space[2],
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
    },
    rowMain: {
      flex: 1,
      gap: nativeTokens.space[1],
    },
    amount: {
      color: c.ink,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.body.size,
      lineHeight: nativeTokens.type.scale.body.line,
      fontWeight: "700",
    },
    method: {
      color: c.inkMuted,
      fontWeight: "400",
      fontSize: nativeTokens.type.scale.small.size,
    },
    meta: {
      color: c.inkMuted,
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
    },
    status: {
      fontFamily: nativeTokens.type.family.sans,
      fontSize: nativeTokens.type.scale.small.size,
      lineHeight: nativeTokens.type.scale.small.line,
      fontWeight: "700",
    },
    bankDetails: {
      gap: nativeTokens.space[1],
      paddingTop: nativeTokens.space[1],
    },
    bankValue: {
      color: c.ink,
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
