"use client";

import { RadioGroup, Surface } from "@baydar/ui-web";
import { useTranslations } from "next-intl";

import { useTheme } from "@/lib/theme-provider";
import { type ThemeChoice } from "@/lib/theme";

export default function AppearanceSettingsPage(): JSX.Element {
  const t = useTranslations("settings.appearance");
  const { choice, setChoice } = useTheme();

  const items = [
    { value: "light", label: t("light"), description: t("lightDesc") },
    { value: "dark", label: t("dark"), description: t("darkDesc") },
    { value: "system", label: t("system"), description: t("systemDesc") },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink text-2xl font-semibold">{t("title")}</h1>
        <p className="text-ink-muted text-sm">{t("subtitle")}</p>
      </header>
      <Surface variant="card" padding="6" className="flex flex-col gap-4">
        <RadioGroup
          legend={t("legend")}
          value={choice}
          onValueChange={(value) => setChoice(value as ThemeChoice)}
          items={items}
        />
        <p className="text-ink-subtle text-xs">{t("hint")}</p>
      </Surface>
    </main>
  );
}
