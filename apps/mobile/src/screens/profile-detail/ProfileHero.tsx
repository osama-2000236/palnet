import type { Profile } from "@baydar/shared";
import { Avatar, Button, Surface } from "@baydar/ui-native";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { FieldCover } from "@/components/FieldCover";

import { useProfileStyles } from "./styles";

export function ProfileHero({
  actionSlot,
  profile,
  onEdit,
}: {
  actionSlot?: ReactNode;
  profile: Profile;
  onEdit?: () => void;
}): JSX.Element {
  const profileStyles = useProfileStyles();
  const { t } = useTranslation();

  return (
    <Surface variant="hero" padding="0" style={profileStyles.hero}>
      <FieldCover uri={profile.coverUrl} />
      <View style={profileStyles.identityBlock}>
        <Avatar
          user={{
            id: profile.userId,
            handle: profile.handle,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
          }}
          size="xl"
        />
        <Text style={profileStyles.name}>
          {profile.firstName} {profile.lastName}
        </Text>
        {profile.headline ? <Text style={profileStyles.headline}>{profile.headline}</Text> : null}
        {profile.location ? <Text style={profileStyles.location}>{profile.location}</Text> : null}
        <Text style={profileStyles.handle}>@{profile.handle}</Text>
      </View>

      {onEdit ? (
        <View style={profileStyles.editWrap}>
          <Button variant="secondary" size="md" testID="profile-edit-button" onPress={onEdit}>
            {t("profile.edit")}
          </Button>
        </View>
      ) : null}

      {actionSlot}
    </Surface>
  );
}

// expo-router colocation: not a screen.
export default (): null => null;
