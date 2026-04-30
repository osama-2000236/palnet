import { Button, Icon, Surface, nativeTokens } from "@baydar/ui-native";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { resolvePostAuthRoute } from "@/lib/profile-state";
import { readSession } from "@/lib/session";

export default function Landing(): JSX.Element {
  const { t } = useTranslation();
  const [checkingSession, setCheckingSession] = useState(true);
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(intro, {
      toValue: 1,
      duration: 520,
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [intro]);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const session = await readSession();
      if (session) {
        try {
          const route = await resolvePostAuthRoute(session);
          router.replace(route);
        } catch {
          router.replace("/(app)/feed");
        }
        return;
      }
      if (mounted) setCheckingSession(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const introMotion = useMemo(
    () => ({
      opacity: intro,
      transform: [
        {
          translateY: intro.interpolate({
            inputRange: [0, 1],
            outputRange: [nativeTokens.space[5], 0],
          }),
        },
        { scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
      ],
    }),
    [intro],
  );

  return (
    <SafeAreaView
      testID="landing-screen"
      style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: nativeTokens.space[4],
          gap: nativeTokens.space[5],
        }}
      >
        <Animated.View style={[{ gap: nativeTokens.space[5] }, introMotion]}>
          <Surface
            variant="hero"
            padding="6"
            style={{
              gap: nativeTokens.space[5],
              alignItems: "center",
            }}
          >
            <View
              accessibilityElementsHidden
              style={{
                width: nativeTokens.space[24],
                height: nativeTokens.space[24],
                borderRadius: nativeTokens.radius.xl,
                borderWidth: 1,
                borderColor: nativeTokens.color.lineSoft,
                backgroundColor: nativeTokens.color.surface,
                alignItems: "center",
                justifyContent: "center",
                ...nativeTokens.shadow.card,
              }}
            >
              <Icon name="logo" size={nativeTokens.space[12]} color={nativeTokens.color.brand600} />
            </View>

            <View style={{ gap: nativeTokens.space[2], alignItems: "center" }}>
              <Text
                selectable
                style={{
                  color: nativeTokens.color.brand600,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.caption.size,
                  fontWeight: nativeTokens.type.scale.caption.weight,
                  lineHeight: nativeTokens.type.scale.caption.line,
                  textAlign: "center",
                }}
              >
                {t("landing.kicker")}
              </Text>
              <Text
                selectable
                style={{
                  color: nativeTokens.color.ink,
                  fontFamily: nativeTokens.type.family.sans,
                  fontSize: nativeTokens.type.scale.display.size,
                  fontWeight: nativeTokens.type.scale.display.weight,
                  lineHeight: nativeTokens.type.scale.display.line,
                  textAlign: "center",
                }}
              >
                {t("landing.title")}
              </Text>
              <Text
                selectable
                style={{
                  color: nativeTokens.color.inkMuted,
                  fontFamily: nativeTokens.type.family.body,
                  fontSize: nativeTokens.type.scale.body.size,
                  lineHeight: nativeTokens.type.scale.body.line,
                  textAlign: "center",
                }}
              >
                {t("landing.subtitle")}
              </Text>
            </View>

            <View
              style={{
                alignSelf: "stretch",
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: nativeTokens.space[2],
              }}
            >
              {[
                t("landing.featureNetwork"),
                t("landing.featureJobs"),
                t("landing.featureMessages"),
              ].map((feature) => (
                <Surface key={feature} variant="tinted" padding="2">
                  <Text
                    selectable
                    style={{
                      color: nativeTokens.color.ink,
                      fontFamily: nativeTokens.type.family.sans,
                      fontSize: nativeTokens.type.scale.caption.size,
                      fontWeight: nativeTokens.type.scale.caption.weight,
                      lineHeight: nativeTokens.type.scale.caption.line,
                      textAlign: "center",
                    }}
                  >
                    {feature}
                  </Text>
                </Surface>
              ))}
            </View>

            <View style={{ alignSelf: "stretch", gap: nativeTokens.space[3] }}>
              <Button
                fullWidth
                size="lg"
                testID="landing-primary-cta"
                accessibilityLabel={t("landing.cta")}
                onPress={() => router.push("/(auth)/register")}
              >
                {t("landing.cta")}
              </Button>
              <Button
                fullWidth
                variant="secondary"
                size="lg"
                testID="landing-login-link"
                accessibilityLabel={t("landing.login")}
                onPress={() => router.push("/(auth)/login")}
              >
                {t("landing.login")}
              </Button>
            </View>
          </Surface>

          {checkingSession ? (
            <Text
              selectable
              style={{
                color: nativeTokens.color.inkSubtle,
                fontFamily: nativeTokens.type.family.sans,
                fontSize: nativeTokens.type.scale.caption.size,
                lineHeight: nativeTokens.type.scale.caption.line,
                textAlign: "center",
              }}
            >
              {t("landing.loading")}
            </Text>
          ) : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
