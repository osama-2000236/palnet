import {
  AddSkillBody,
  EducationBody,
  ExperienceBody,
  JobLocationMode,
  Profile as ProfileSchema,
  UpdateProfileBody,
  type Profile,
} from "@baydar/shared";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

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
      <SafeAreaView className="bg-surface-muted flex-1 items-center justify-center">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-surface-muted flex-1">
      <ScrollView contentContainerClassName="p-4 gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-ink text-2xl font-bold">{t("profile.editTitle")}</Text>
          <Pressable onPress={() => router.back()}>
            <Text className="text-ink-muted text-sm">{t("common.cancel")}</Text>
          </Pressable>
        </View>

        <BasicsCard profile={profile} onChanged={setProfile} />
        <ExperiencesCard profile={profile} onChanged={setProfile} />
        <EducationsCard profile={profile} onChanged={setProfile} />
        <SkillsCard profile={profile} onChanged={setProfile} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <View className="border-ink-muted/20 bg-surface rounded-md border p-4">
      <Text className="text-ink mb-3 text-lg font-semibold">{title}</Text>
      {children}
    </View>
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
      multiline={multiline}
      className="border-ink-muted/30 bg-surface text-ink mb-2 rounded-md border px-3 py-2"
      style={multiline ? { minHeight: 80, textAlignVertical: "top" } : undefined}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────

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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      const publicUrl = await uploadAsset({
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
        body: { avatarUrl: publicUrl },
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
      <View className="mb-3 flex-row items-center gap-3">
        {profile.avatarUrl ? (
          <Image
            source={{ uri: profile.avatarUrl }}
            style={{ width: 64, height: 64, borderRadius: 32 }}
          />
        ) : (
          <View className="border-ink-muted/20 bg-surface-muted h-16 w-16 items-center justify-center rounded-full border">
            <Text className="text-ink-muted text-xs">
              {profile.firstName[0]}
              {profile.lastName[0]}
            </Text>
          </View>
        )}
        <Pressable
          onPress={pickAvatar}
          disabled={uploading}
          className="border-ink-muted/30 rounded-md border px-3 py-2"
        >
          <Text className="text-ink text-sm">
            {uploading ? t("profile.uploading") : t("profile.changeAvatar")}
          </Text>
        </Pressable>
      </View>
      <Input value={firstName} onChangeText={setFirstName} placeholder="First name" />
      <Input value={lastName} onChangeText={setLastName} placeholder="Last name" />
      <Input
        value={headline}
        onChangeText={setHeadline}
        placeholder={t("onboarding.headline") ?? "Headline"}
      />
      <Input value={about} onChangeText={setAbout} placeholder={t("profile.about")} multiline />
      <Input
        value={location}
        onChangeText={setLocation}
        placeholder={t("onboarding.location") ?? "Location"}
      />
      <Pressable
        onPress={save}
        disabled={busy}
        className="bg-brand-600 self-end rounded-md px-4 py-2"
      >
        <Text className="text-ink-inverse text-sm font-semibold">{t("profile.save")}</Text>
      </Pressable>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────

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
      {profile.experiences.map((e) => (
        <View
          key={e.id ?? `${e.companyName}-${e.startDate}`}
          className="mb-3 flex-row items-start justify-between"
        >
          <View className="flex-1">
            <Text className="text-ink font-semibold">{e.title}</Text>
            <Text className="text-ink-muted text-sm">{e.companyName}</Text>
            {e.description ? <Text className="text-ink mt-1 text-sm">{e.description}</Text> : null}
          </View>
          {e.id ? (
            <Pressable onPress={() => void remove(e.id as string)} disabled={busy}>
              <Text className="text-danger text-xs">{t("profile.remove")}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {show ? (
        <View className="border-brand-600/30 bg-brand-600/5 mt-2 rounded-md border p-3">
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder={t("profile.expTitle") ?? "Title"}
          />
          <Input
            value={companyName}
            onChangeText={setCompanyName}
            placeholder={t("profile.company") ?? "Company"}
          />
          <Input value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder={t("profile.description") ?? "Description"}
            multiline
          />
          <View className="flex-row justify-end gap-2">
            <Pressable onPress={() => setShow(false)}>
              <Text className="text-ink-muted text-sm">{t("profile.cancel")}</Text>
            </Pressable>
            <Pressable onPress={add} disabled={busy} className="bg-brand-600 rounded-md px-4 py-2">
              <Text className="text-ink-inverse text-sm font-semibold">{t("profile.save")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setShow(true)}>
          <Text className="text-brand-600 text-sm">+ {t("profile.add")}</Text>
        </Pressable>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────

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
      {profile.educations.map((e) => (
        <View key={e.id ?? e.school} className="mb-3 flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-ink font-semibold">{e.school}</Text>
            {e.degree ? (
              <Text className="text-ink-muted text-sm">
                {e.degree}
                {e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}
              </Text>
            ) : null}
          </View>
          {e.id ? (
            <Pressable onPress={() => void remove(e.id as string)} disabled={busy}>
              <Text className="text-danger text-xs">{t("profile.remove")}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {show ? (
        <View className="border-brand-600/30 bg-brand-600/5 mt-2 rounded-md border p-3">
          <Input
            value={school}
            onChangeText={setSchool}
            placeholder={t("profile.school") ?? "School"}
          />
          <Input
            value={degree}
            onChangeText={setDegree}
            placeholder={t("profile.degree") ?? "Degree"}
          />
          <Input
            value={fieldOfStudy}
            onChangeText={setFieldOfStudy}
            placeholder={t("profile.fieldOfStudy") ?? "Field of study"}
          />
          <View className="flex-row justify-end gap-2">
            <Pressable onPress={() => setShow(false)}>
              <Text className="text-ink-muted text-sm">{t("profile.cancel")}</Text>
            </Pressable>
            <Pressable onPress={add} disabled={busy} className="bg-brand-600 rounded-md px-4 py-2">
              <Text className="text-ink-inverse text-sm font-semibold">{t("profile.save")}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable onPress={() => setShow(true)}>
          <Text className="text-brand-600 text-sm">+ {t("profile.add")}</Text>
        </Pressable>
      )}
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────

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
      <View className="mb-3 flex-row flex-wrap gap-2">
        {profile.skills.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => void remove(s.id)}
            disabled={busy}
            className="border-ink-muted/30 flex-row items-center gap-1 rounded-full border px-3 py-1"
          >
            <Text className="text-ink text-sm">{s.name}</Text>
            <Text className="text-danger text-xs"> ×</Text>
          </Pressable>
        ))}
      </View>
      <View className="flex-row gap-2">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("profile.addSkillPlaceholder") ?? "Add a skill"}
          maxLength={60}
          className="border-ink-muted/30 bg-surface text-ink flex-1 rounded-md border px-3 py-2"
        />
        <Pressable
          onPress={add}
          disabled={busy || name.trim().length === 0}
          className="bg-brand-600 rounded-md px-4 py-2"
        >
          <Text className="text-ink-inverse text-sm font-semibold">{t("profile.add")}</Text>
        </Pressable>
      </View>
    </Card>
  );
}
