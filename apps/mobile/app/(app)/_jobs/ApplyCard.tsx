// Inline apply form card — extracted from jobs/[id].tsx (300-LOC design QA
// budget). Presentational only; the screen owns state and submission.

import { Button, Icon, Input, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { useStyles } from "./detailStyles";

export function ApplyCard({
  title,
  company,
  coverLetter,
  onChangeCoverLetter,
  submitting,
  submitError,
  onCancel,
  onSubmit,
}: {
  title: string;
  company: string;
  coverLetter: string;
  onChangeCoverLetter: (value: string) => void;
  submitting: boolean;
  submitError: string | null;
  onCancel: () => void;
  onSubmit: () => void;
}): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <Surface variant="card" padding="6">
      <View style={{ gap: nativeTokens.space[3] }}>
        <View style={{ gap: nativeTokens.space[1] }}>
          <Text style={styles.section}>{t("jobs.applyTitle", { title })}</Text>
          <Text style={styles.muted}>{t("jobs.applySubtitle", { company })}</Text>
        </View>

        <View style={{ gap: nativeTokens.space[1] }}>
          <Text style={styles.fieldLabel}>{t("jobs.coverLetterLabel")}</Text>
          <Input
            fullWidth
            value={coverLetter}
            onChangeText={onChangeCoverLetter}
            placeholder={t("jobs.coverLetterPlaceholder")}
            multiline
            maxLength={8000}
            inputStyle={styles.coverLetterInput}
          />
          <Text style={styles.hint}>{t("jobs.coverLetterHint")}</Text>
        </View>

        {submitError ? (
          <View accessibilityRole="alert" style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{submitError}</Text>
          </View>
        ) : null}

        <View style={styles.formActions}>
          <Button variant="ghost" onPress={onCancel} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="accent"
            onPress={onSubmit}
            loading={submitting}
            testID="job-apply-submit"
            leading={<Icon name="send" size={16} color={c.inkInverse} />}
          >
            {t("jobs.submitApplication")}
          </Button>
        </View>
      </View>
    </Surface>
  );
}
