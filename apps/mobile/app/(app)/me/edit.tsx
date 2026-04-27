import {
  AddSkillBody,
  EducationBody,
  ExperienceBody,
  JobLocationMode,
  Profile as ProfileSchema,
  UpdateProfileBody,
  type Profile,
} from "@baydar/shared";
import { Avatar, Button, Icon, Surface, nativeTokens } from "@baydar/ui-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import { uploadAsset } from "@/lib/uploads";

export default function EditProfileScreen(): JSX.Element {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async (): Promise<void> => {
    const token = await getAccessToken();
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }
    const p = await apiFetch("/profiles/me", ProfileSchema, { token });
    setProfile(p);
  };

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, []);

  if (loading || !profile) {
    return (
      <SafeAreaView style={styles.centerScreen}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("profile.editTitle")}</Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
            accessibilityLabel={t("common.cancel")}
          >
            {t("common.cancel")}
          </Button>
        </View>

        <BasicsCard profile={profile} onChanged={setProfile} />
        <ExperiencesCard profile={profile} onChanged={setProfile} />
        <EducationsCard profile={profile} onChanged={setProfile} />
        <SkillsCard profile={profile} onChanged={setProfile} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <Surface variant="card" padding="4">
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </Surface>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}): JSX.Element {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={nativeTokens.color.inkMuted}
      multiline={multiline}
      style={[styles.input, multiline ? styles.multilineInput : null]}
    />
  );
}

function BasicsCard({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [about, setAbout] = useState(profile.about ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    });
    if (!parsed.success) return;
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch("/profiles/me", ProfileSchema, {
        method: "PATCH",
        body: parsed.data,
        token,
      });
      onChanged(next);
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
        <Button
          variant="secondary"
          size="md"
          onPress={pickAvatar}
          disabled={uploading}
          accessibilityLabel={t("profile.changeAvatar")}
        >
          {uploading ? t("profile.uploading") : t("profile.changeAvatar")}
        </Button>
      </View>
      <Input value={firstName} onChangeText={setFirstName} placeholder={t("profile.firstName")} />
      <Input value={lastName} onChangeText={setLastName} placeholder={t("profile.lastName")} />
      <Input value={headline} onChangeText={setHeadline} placeholder={t("profile.headline")} />
      <Input value={about} onChangeText={setAbout} placeholder={t("profile.about")} multiline />
      <Input value={location} onChangeText={setLocation} placeholder={t("profile.location")} />
      <Button
        onPress={save}
        disabled={busy}
        loading={busy}
        style={styles.alignEnd}
        accessibilityLabel={t("profile.save")}
      >
        {t("profile.save")}
      </Button>
    </Card>
  );
}

function ExperiencesCard({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function add(): Promise<void> {
    const parsed = ExperienceBody.safeParse({
      title,
      companyName,
      companyId: null,
      location: null,
      locationMode: JobLocationMode.ONSITE,
      startDate: new Date(startDate).toISOString(),
      endDate: null,
      description: description || null,
    });
    if (!parsed.success) return;
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch(`/profiles/me/experiences/${id}`, ProfileSchema, {
        method: "DELETE",
        token,
      });
      onChanged(next);
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
              accessibilityLabel={t("profile.remove")}
            >
              {t("profile.remove")}
            </Button>
          ) : null}
        </View>
      ))}

      {show ? (
        <Surface variant="tinted" padding="3">
          <View style={styles.cardBody}>
            <Input value={title} onChangeText={setTitle} placeholder={t("profile.expTitle")} />
            <Input
              value={companyName}
              onChangeText={setCompanyName}
              placeholder={t("profile.company")}
            />
            <Input
              value={startDate}
              onChangeText={setStartDate}
              placeholder={t("profile.dateHint")}
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
          leading={
            <Icon name="plus" size={nativeTokens.space[4]} color={nativeTokens.color.brand700} />
          }
          onPress={() => setShow(true)}
          accessibilityLabel={t("profile.add")}
        >
          {t("profile.add")}
        </Button>
      )}
    </Card>
  );
}

function EducationsCard({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [school, setSchool] = useState("");
  const [degree, setDegree] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(): Promise<void> {
    const parsed = EducationBody.safeParse({
      school,
      degree: degree || null,
      fieldOfStudy: fieldOfStudy || null,
      startDate: null,
      endDate: null,
      description: null,
    });
    if (!parsed.success) return;
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch(`/profiles/me/educations/${id}`, ProfileSchema, {
        method: "DELETE",
        token,
      });
      onChanged(next);
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
              accessibilityLabel={t("profile.remove")}
            >
              {t("profile.remove")}
            </Button>
          ) : null}
        </View>
      ))}

      {show ? (
        <Surface variant="tinted" padding="3">
          <View style={styles.cardBody}>
            <Input value={school} onChangeText={setSchool} placeholder={t("profile.school")} />
            <Input value={degree} onChangeText={setDegree} placeholder={t("profile.degree")} />
            <Input
              value={fieldOfStudy}
              onChangeText={setFieldOfStudy}
              placeholder={t("profile.fieldOfStudy")}
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
          leading={
            <Icon name="plus" size={nativeTokens.space[4]} color={nativeTokens.color.brand700} />
          }
          onPress={() => setShow(true)}
          accessibilityLabel={t("profile.add")}
        >
          {t("profile.add")}
        </Button>
      )}
    </Card>
  );
}

function SkillsCard({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: (next: Profile) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(): Promise<void> {
    const parsed = AddSkillBody.safeParse({ name });
    if (!parsed.success) return;
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch("/profiles/me/skills", ProfileSchema, {
        method: "POST",
        body: parsed.data,
        token,
      });
      onChanged(next);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  async function remove(skillId: string): Promise<void> {
    const token = await getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const next = await apiFetch(`/profiles/me/skills/${skillId}`, ProfileSchema, {
        method: "DELETE",
        token,
      });
      onChanged(next);
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
              accessibilityLabel={t("profile.remove")}
            >
              {t("profile.remove")}
            </Button>
          </Surface>
        ))}
      </View>
      <View style={styles.skillInputRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("profile.addSkillPlaceholder")}
          placeholderTextColor={nativeTokens.color.inkMuted}
          maxLength={60}
          style={[styles.input, styles.skillInput]}
        />
        <Button onPress={add} disabled={busy || name.trim().length === 0} loading={busy}>
          {t("profile.add")}
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  flex: {
    flex: 1,
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: nativeTokens.color.surfaceMuted,
  },
  scrollContent: {
    padding: nativeTokens.space[4],
    gap: nativeTokens.space[4],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: nativeTokens.space[3],
  },
  title: {
    flex: 1,
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h1.size,
    lineHeight: nativeTokens.type.scale.h1.line,
    fontWeight: "700",
    fontFamily: nativeTokens.type.family.sans,
  },
  cardTitle: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h2.size,
    lineHeight: nativeTokens.type.scale.h2.line,
    fontWeight: "600",
    fontFamily: nativeTokens.type.family.sans,
    marginBottom: nativeTokens.space[3],
  },
  cardBody: {
    gap: nativeTokens.space[2],
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[3],
    marginBottom: nativeTokens.space[1],
  },
  input: {
    minHeight: nativeTokens.chrome.minHit,
    borderRadius: nativeTokens.radius.md,
    borderWidth: 1,
    borderColor: nativeTokens.color.lineHard,
    backgroundColor: nativeTokens.color.surface,
    paddingHorizontal: nativeTokens.space[3],
    paddingVertical: nativeTokens.space[2],
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.body.size,
    fontFamily: nativeTokens.type.family.sans,
  },
  multilineInput: {
    minHeight: nativeTokens.space[20],
    textAlignVertical: "top",
  },
  alignEnd: {
    alignSelf: "flex-end",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: nativeTokens.space[3],
    paddingBottom: nativeTokens.space[3],
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.h3.size,
    lineHeight: nativeTokens.type.scale.h3.line,
    fontWeight: "600",
    fontFamily: nativeTokens.type.family.sans,
  },
  itemMeta: {
    color: nativeTokens.color.inkMuted,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.sans,
  },
  itemBody: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.small.size,
    lineHeight: nativeTokens.type.scale.small.line,
    fontFamily: nativeTokens.type.family.body,
    marginTop: nativeTokens.space[1],
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: nativeTokens.space[2],
  },
  skillList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: nativeTokens.space[2],
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
  },
  skillText: {
    color: nativeTokens.color.ink,
    fontSize: nativeTokens.type.scale.small.size,
    fontFamily: nativeTokens.type.family.sans,
  },
  skillInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: nativeTokens.space[2],
  },
  skillInput: {
    flex: 1,
  },
});
