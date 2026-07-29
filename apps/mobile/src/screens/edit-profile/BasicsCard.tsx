import { Profile as ProfileSchema, UpdateProfileBody } from "@baydar/shared";
import { Avatar, Button, SwitchRow } from "@baydar/ui-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { CityField } from "@/components/CityField";
import { apiFetch } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-errors";
import { getAccessToken } from "@/lib/session";
import { uploadAsset } from "@/lib/uploads";
import { Card, Input, LabeledField, type ProfileCardProps } from "./shared";
import { useStyles } from "./styles";

export function BasicsCard({ profile, onChanged, onError }: ProfileCardProps): JSX.Element {
  const styles = useStyles();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [about, setAbout] = useState(profile.about ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [openToWork, setOpenToWork] = useState(profile.openToWork);
  const [hiring, setHiring] = useState(profile.hiring);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  async function pickAvatar(): Promise<void> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const token = await getAccessToken();
    if (!token) return;
    setUploading(true);
    onError(null);
    try {
      const uploaded = await uploadAsset({
        asset: {
          uri: asset.uri,
          mimeType: asset.mimeType ?? "image/jpeg",
          sizeBytes: asset.fileSize ?? 0,
          filename: asset.fileName ?? undefined,
        },
        purpose: "AVATAR",
        token,
      });
      const next = await apiFetch("/profiles/me", ProfileSchema, {
        method: "PATCH",
        body: { avatarUrl: uploaded.publicUrl },
        token,
      });
      onChanged(next);
    } catch (caught) {
      onError(apiErrorMessage(t, caught));
    } finally {
      setUploading(false);
    }
  }

  async function save(): Promise<void> {
    const parsed = UpdateProfileBody.safeParse({
      firstName,
      lastName,
      headline: headline || null,
      about: about || null,
      location: location || null,
      openToWork,
      hiring,
    });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        firstName: errors.firstName?.length ? t("profile.validation.firstName") : null,
        lastName: errors.lastName?.length ? t("profile.validation.lastName") : null,
        headline: errors.headline?.length ? t("profile.validation.headline") : null,
        about: errors.about?.length ? t("profile.validation.about") : null,
        location: errors.location?.length ? t("profile.validation.location") : null,
      });
      return;
    }
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    onError(null);
    try {
      const next = await apiFetch("/profiles/me", ProfileSchema, {
        method: "PATCH",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setFieldErrors({});
    } catch (caught) {
      onError(apiErrorMessage(t, caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("profile.basics")}>
      <View style={styles.avatarRow}>
        <Avatar
          user={{
            id: profile.userId,
            handle: profile.handle,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
          }}
          size="lg"
        />
        <Button variant="secondary" size="md" onPress={pickAvatar} disabled={uploading}>
          {uploading ? t("profile.uploading") : t("profile.changeAvatar")}
        </Button>
      </View>
      <View style={styles.nameGrid}>
        <View style={styles.nameCell}>
          <Input
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t("profile.firstName")}
            error={fieldErrors.firstName}
            fullWidth
          />
        </View>
        <View style={styles.nameCell}>
          <Input
            value={lastName}
            onChangeText={setLastName}
            placeholder={t("profile.lastName")}
            error={fieldErrors.lastName}
            fullWidth
          />
        </View>
      </View>
      <Input
        value={headline}
        onChangeText={setHeadline}
        placeholder={t("profile.headline")}
        error={fieldErrors.headline}
        inputDirection="auto"
        fullWidth
      />
      <Input
        value={about}
        onChangeText={setAbout}
        placeholder={t("profile.about")}
        multiline
        error={fieldErrors.about}
        fullWidth
      />
      <LabeledField label={t("onboarding.location")}>
        <CityField value={location} onChange={setLocation} />
      </LabeledField>
      {/* Web parity: the two availability signals the DTO always carried and
          no editor on either platform ever let anyone set. */}
      <SwitchRow
        checked={openToWork}
        onChange={setOpenToWork}
        label={t("profile.openToWork")}
        description={t("profile.openToWorkHint")}
      />
      <SwitchRow
        checked={hiring}
        onChange={setHiring}
        label={t("profile.hiring")}
        description={t("profile.hiringHint")}
      />
      <Button onPress={save} disabled={busy} loading={busy} fullWidth>
        {t("common.saveChanges")}
      </Button>
    </Card>
  );
}
