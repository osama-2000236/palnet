import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { NotoNaskhArabic_400Regular } from "@expo-google-fonts/noto-naskh-arabic";
import { nativeTokens } from "@baydar/ui-native";
import { useFonts } from "expo-font";
import { router, Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { I18nManager, Linking, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { routeFromUrl } from "@/lib/linking";
import { installNotificationHandlers } from "@/lib/push";

import "../global.css";
import "../src/i18n";

// Arabic is the default. Force RTL once on first boot so every screen lays
// out mirrored without each component having to think about it.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

// Keep the native splash up until fonts load so we never flash system text.
void SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden — ignore */
});

export default function RootLayout(): JSX.Element | null {
  // Family aliases here match nativeTokens.type.family.* so atoms in ui-native
  // can reference the family by string. See packages/ui-tokens/src/tokens.native.ts.
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic: IBMPlexSansArabic_400Regular,
    "IBMPlexSansArabic-SemiBold": IBMPlexSansArabic_600SemiBold,
    "IBMPlexSansArabic-Bold": IBMPlexSansArabic_700Bold,
    NotoNaskhArabic: NotoNaskhArabic_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => {
        /* already hidden — ignore */
      });
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    let mounted = true;
    const openUrl = (url: string | null): void => {
      if (!url) return;
      const route = routeFromUrl(url);
      if (route) router.push(route as never);
    };

    void Linking.getInitialURL().then((url) => {
      if (mounted) openUrl(url);
    });

    const subscription = Linking.addEventListener("url", (event) => {
      openUrl(event.url);
    });

    return (): void => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => installNotificationHandlers(), []);

  // While fonts load, render a blank surface-coloured view so we don't flash
  // the default system font for a single frame.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: nativeTokens.color.surfaceMuted }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
