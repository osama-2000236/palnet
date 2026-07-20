import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { NotoNaskhArabic_400Regular } from "@expo-google-fonts/noto-naskh-arabic";
import NetInfo from "@react-native-community/netinfo";
import { useFonts } from "expo-font";
import { router, Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Appearance, I18nManager, Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, ToastProvider } from "@baydar/ui-native";
import { useTranslation } from "react-i18next";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingIntro } from "@/components/LoadingIntro";
import { OfflineBanner } from "@/components/OfflineBanner";
import { initAnalytics } from "@/lib/analytics";
import { routeFromUrl } from "@/lib/linking";
import { initObservability, wrapApp } from "@/lib/observability";
import { installNotificationHandlers } from "@/lib/push";
import { QueryProvider } from "@/lib/query-provider";
import { useNetworkStore } from "@/store/network";
import { useThemeStore } from "@/store/theme";

import "../src/i18n";

initObservability();
initAnalytics();

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

function RootLayout(): JSX.Element | null {
  const { t } = useTranslation();
  // Family aliases here match nativeTokens.type.family.* so atoms in ui-native
  // can reference the family by string. See packages/ui-tokens/src/tokens.native.ts.
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic: IBMPlexSansArabic_400Regular,
    "IBMPlexSansArabic-SemiBold": IBMPlexSansArabic_600SemiBold,
    "IBMPlexSansArabic-Bold": IBMPlexSansArabic_700Bold,
    NotoNaskhArabic: NotoNaskhArabic_400Regular,
  });
  const setConnected = useNetworkStore((state) => state.setConnected);
  const scheme = useThemeStore((state) => state.scheme);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const syncSystemTheme = useThemeStore((state) => state.syncSystem);

  // Load the persisted theme choice once, then keep "system" in step with the OS.
  useEffect(() => {
    void hydrateTheme();
    const subscription = Appearance.addChangeListener(() => syncSystemTheme());
    return () => subscription.remove();
  }, [hydrateTheme, syncSystemTheme]);

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

  useEffect(() => {
    void NetInfo.fetch().then((state) => {
      setConnected(state.isConnected !== false && state.isInternetReachable !== false);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      setConnected(state.isConnected !== false && state.isInternetReachable !== false);
    });

    return (): void => {
      unsubscribe();
    };
  }, [setConnected]);

  // While fonts load, render a blank surface-coloured view so we don't flash
  // the default system font for a single frame.
  if (!fontsLoaded && !fontError) {
    return <LoadingIntro compact showText={false} testID="app-loading-intro" />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider scheme={scheme}>
        <SafeAreaProvider>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <QueryProvider>
            <ToastProvider dismissLabel={t("toast.dismiss.aria")}>
              <ErrorBoundary>
                <Stack screenOptions={{ headerShown: false }} />
              </ErrorBoundary>
            </ToastProvider>
          </QueryProvider>
          <OfflineBanner />
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default wrapApp(RootLayout);
