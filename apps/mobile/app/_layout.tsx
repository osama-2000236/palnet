import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { NotoNaskhArabic_400Regular } from "@expo-google-fonts/noto-naskh-arabic";
import NetInfo from "@react-native-community/netinfo";
import { useFonts } from "expo-font";
import { router, Stack, SplashScreen, usePathname } from "expo-router";
import { useEffect } from "react";
import { Appearance, Linking, StatusBar } from "react-native";
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
import { barStyleFor } from "@/lib/status-bar-routes";
import { useNetworkStore } from "@/store/network";
import { useThemeStore } from "@/store/theme";

import "../src/i18n";

initObservability();
initAnalytics();

// Layout direction is written by `../src/i18n` above, which calls
// applyLocaleDirection(getInitialLocale()) at import time. Nothing else may
// touch I18nManager here: a second writer that forces RTL whenever
// `I18nManager.isRTL` is false undoes the user's switch to English on the very
// launch that was meant to apply it, and the app flip-flops direction forever.
// Arabic-first is preserved by getInitialLocale() (EXPO_PUBLIC_DEFAULT_LOCALE).

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
  const pathname = usePathname();

  // THE status-bar owner. There is exactly one, deliberately: this used to be an
  // `expo-status-bar` element here plus a per-route effect in the (app) layout,
  // and the element re-applied on every root render — including the re-render
  // navigation triggers — so it kept winning and painted dark icons onto the
  // olive band. The root is also the only layout that sees (auth), which is
  // paper. Policy lives in src/lib/status-bar-routes.ts.
  useEffect(() => {
    StatusBar.setBarStyle(barStyleFor(pathname), true);
  }, [pathname]);

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
