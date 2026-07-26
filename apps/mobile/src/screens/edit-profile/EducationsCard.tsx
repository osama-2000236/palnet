import {
  EducationBody,
  PS_UNIVERSITIES,
  Profile as ProfileSchema,
  foldArabic,
} from "@baydar/shared";
import { Button, Chip, Icon, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken } from "@/lib/session";
import { Card, Input, type ProfileCardProps } from "./shared";
import { useStyles } from "./styles";

export function EducationsCard({ profile, onChanged, onError }: ProfileCardProps): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [school, setSchool] = useState("");
  const [degree, setDegree] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  async function add(): Promise<void> {
    const parsed = EducationBody.safeParse({
      school,
      degree: degree || null,
      fieldOfStudy: fieldOfStudy || null,
      startDate: null,
      endDate: null,
      description: null,
    });
    if (!parsed.success) {
      setFieldErrors({ school: t("profile.validation.school") });
      return;
    }
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    onError(null);
    try {
      const next = await apiFetch("/profiles/me/educations", ProfileSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setShow(false);
      setSchool("");
      setDegree("");
      setFieldOfStudy("");
      setFieldErrors({});
    } catch (caught) {
      onError(apiErrorMessage(t, caught));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    onError(null);
    try {
      const next = await apiFetch(`/profiles/me/educations/${id}`, ProfileSchema, {
        method: "DELETE",
        token,
      });
      onChanged(next);
    } catch (caught) {
      onError(apiErrorMessage(t, caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("profile.education")}>
      {profile.educations.map((education) => (
        <View key={education.id ?? education.school} style={styles.itemRow}>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{education.school}</Text>
            {education.degree ? (
              <Text style={styles.itemMeta}>
                {education.degree}
                {education.fieldOfStudy ? ` · ${education.fieldOfStudy}` : ""}
              </Text>
            ) : null}
          </View>
          {education.id ? (
            <Button
              variant="danger-ghost"
              size="sm"
              onPress={() => void remove(education.id as string)}
              disabled={busy}
            >
              {t("profile.remove")}
            </Button>
          ) : null}
        </View>
      ))}
      {show ? (
        <Surface variant="tinted" padding="3">
          <View style={styles.cardBody}>
            <Input
              value={school}
              onChangeText={setSchool}
              placeholder={t("profile.school")}
              error={fieldErrors.school}
              inputDirection="auto"
              fullWidth
            />
            <SchoolSuggestions query={school} onPick={setSchool} />
            <Input
              value={degree}
              onChangeText={setDegree}
              placeholder={t("profile.degree")}
              inputDirection="auto"
              fullWidth
            />
            <Input
              value={fieldOfStudy}
              onChangeText={setFieldOfStudy}
              placeholder={t("profile.fieldOfStudy")}
              inputDirection="auto"
              fullWidth
            />
            <View style={styles.buttonRow}>
              <Button variant="ghost" size="sm" onPress={() => setShow(false)}>
                {t("profile.cancel")}
              </Button>
              <Button size="sm" onPress={add} disabled={busy} loading={busy}>
                {t("profile.save")}
              </Button>
            </View>
          </View>
        </Surface>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          leading={<Icon name="plus" size={nativeTokens.space[4]} color={c.brand700} />}
          onPress={() => setShow(true)}
        >
          {t("profile.add")}
        </Button>
      )}
    </Card>
  );
}

// Web twin: the <datalist> on the school input in
// EditProfileEducationSkills.tsx. Fold-filtered Palestinian university
// chips; picking one writes the canonical Arabic name (free text stays
// allowed for any other school).
function SchoolSuggestions({
  query,
  onPick,
}: {
  query: string;
  onPick: (school: string) => void;
}): JSX.Element | null {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const q = foldArabic(query.trim());
  const lower = query.trim().toLowerCase();
  const hits = PS_UNIVERSITIES.filter(
    (u) =>
      foldArabic(u.ar) !== q &&
      (q === "" || foldArabic(u.ar).includes(q) || u.en.toLowerCase().includes(lower)),
  );
  if (hits.length === 0) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: nativeTokens.space[2] }}>
      {hits.map((u) => (
        <Chip key={u.key} accessibilityLabel={isArabic ? u.ar : u.en} onPress={() => onPick(u.ar)}>
          {isArabic ? u.ar : u.en}
        </Chip>
      ))}
    </View>
  );
}
