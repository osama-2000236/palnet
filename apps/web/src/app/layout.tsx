// Root layout — provides HTML, head, and body shell.
// Locale-specific layout lives in [locale]/layout.tsx.
import { IBM_Plex_Sans_Arabic, Noto_Naskh_Arabic } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import { defaultLocale, localeDir, locales, type Locale } from "@/i18n";
import { themeBootScript } from "@/lib/theme";

import "./globals.css";

export const metadata = {
  title: "Baydar — بيدر",
  description: "شبكة عربية مهنية — حيث يلتقي أثرك بفرصتك.",
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
  },
};

const sansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-arabic",
  display: "swap",
});

const bodyArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-naskh",
  display: "swap",
});

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const headerLocale = headerStore.get("x-baydar-locale");
  const locale = locales.includes(headerLocale as Locale)
    ? (headerLocale as Locale)
    : defaultLocale;
  const dir = headerStore.get("x-baydar-dir") === "ltr" ? "ltr" : localeDir[locale];

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${sansArabic.variable} ${bodyArabic.variable}`}
      // The boot script below sets the `dark` class + `color-scheme` on <html>
      // before React hydrates, so the server markup intentionally differs.
      suppressHydrationWarning
    >
      <body>
        {/* Apply the stored theme to <html> before first paint (no light flash).
            Light is the default. See @/lib/theme. */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        {children}
      </body>
    </html>
  );
}
