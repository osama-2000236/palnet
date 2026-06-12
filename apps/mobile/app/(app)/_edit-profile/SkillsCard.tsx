import { AddSkillBody, Profile as ProfileSchema } from "@baydar/shared";
import { Button, Surface } from "@baydar/ui-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken } from "@/lib/session";
import { Card, Input, type ProfileCardProps } from "./shared";
import { styles } from "./styles";

export function SkillsCard({ profile, onChanged, onError }: ProfileCardProps): JSX.Element {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function add(): Promise<void> {
    const parsed = AddSkillBody.safeParse({ name });
    if (!parsed.success) {
      setFieldError(t("profile.validation.skill"));
      return;
    }
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    onError(null);
    try {
      const next = await apiFetch("/profiles/me/skills", ProfileSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setName("");
      setFieldError(null);
    } catch (caught) {
      onError(apiErrorMessage(t, caught));
    } finally {
      setBusy(false);
    }
  }

  async function remove(skillId: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    onError(null);
    try {
      const next = await apiFetch(`/profiles/me/skills/${skillId}`, ProfileSchema, {
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
    <Card title={t("profile.skills")}>
      <View style={styles.skillList}>
        {profile.skills.map((skill) => (
          <Surface key={skill.id} variant="tinted" padding="2" style={styles.skillChip}>
            <Text style={styles.skillText}>{skill.name}</Text>
            <Button
              variant="danger-ghost"
              size="sm"
              onPress={() => void remove(skill.id)}
              disabled={busy}
            >
              {t("profile.remove")}
            </Button>
          </Surface>
        ))}
      </View>
      <View style={styles.skillInputRow}>
        <Input
          value={name}
          onChangeText={setName}
          placeholder={t("profile.addSkillPlaceholder")}
          maxLength={60}
          error={fieldError}
          inputDirection="auto"
          fullWidth
          style={styles.skillInput}
        />
        <Button onPress={add} disabled={busy || name.trim().length === 0} loading={busy}>
          {t("profile.add")}
        </Button>
      </View>
    </Card>
  );
}

export default () => null;
