import { ExperienceBody, JobLocationMode, Profile as ProfileSchema } from "@baydar/shared";
import { Button, Icon, Surface, nativeTokens, useThemeTokens } from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken } from "@/lib/session";
import { Card, Input, parseDateInput, type ProfileCardProps } from "./shared";
import { useStyles } from "./styles";

export function ExperiencesCard({ profile, onChanged, onError }: ProfileCardProps): JSX.Element {
  const c = useThemeTokens().color;
  const styles = useStyles();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  async function add(): Promise<void> {
    const parsed = ExperienceBody.safeParse({
      title,
      companyName,
      companyId: null,
      location: null,
      locationMode: JobLocationMode.ONSITE,
      startDate: parseDateInput(startDate) ?? "",
      endDate: null,
      description: description || null,
    });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        title: errors.title?.length ? t("profile.validation.expTitle") : null,
        companyName: errors.companyName?.length ? t("profile.validation.company") : null,
        startDate: errors.startDate?.length ? t("profile.validation.date") : null,
      });
      return;
    }
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    onError(null);
    try {
      const next = await apiFetch("/profiles/me/experiences", ProfileSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setShow(false);
      setTitle("");
      setCompanyName("");
      setDescription("");
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
      const next = await apiFetch(`/profiles/me/experiences/${id}`, ProfileSchema, {
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
    <Card title={t("profile.experience")}>
      {profile.experiences.map((experience) => (
        <View
          key={experience.id ?? `${experience.companyName}-${experience.startDate}`}
          style={styles.itemRow}
        >
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>{experience.title}</Text>
            <Text style={styles.itemMeta}>{experience.companyName}</Text>
            {experience.description ? (
              <Text style={styles.itemBody}>{experience.description}</Text>
            ) : null}
          </View>
          {experience.id ? (
            <Button
              variant="danger-ghost"
              size="sm"
              onPress={() => void remove(experience.id as string)}
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
              value={title}
              onChangeText={setTitle}
              placeholder={t("profile.expTitle")}
              error={fieldErrors.title}
              inputDirection="auto"
              fullWidth
            />
            <Input
              value={companyName}
              onChangeText={setCompanyName}
              placeholder={t("profile.company")}
              error={fieldErrors.companyName}
              inputDirection="auto"
              fullWidth
            />
            <Input
              value={startDate}
              onChangeText={setStartDate}
              placeholder={t("profile.dateHint")}
              error={fieldErrors.startDate}
              inputDirection="ltr"
            />
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder={t("profile.description")}
              multiline
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
