import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import "../global.css";
import "../src/i18n";

export default function RootLayout(): JSX.Element {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
