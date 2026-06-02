// Root layout — provides HTML, head, and body shell.
// Locale-specific layout lives in [locale]/layout.tsx.
import type { ReactNode } from "react";

export const metadata = {
  title: "Baydar — بيدر",
  description: "شبكة عربية مهنية — حيث يلتقي أثرك بفرصتك.",
};

// Note: Root layout doesn't receive locale params; that's handled in [locale]/layout.tsx.
// We keep this minimal and let the locale layout handle i18n, fonts, etc.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="und" dir="ltr">
      <body>{children}</body>
    </html>
  );
}
