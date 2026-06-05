import type { MetadataRoute } from "next";

import { tokens } from "@baydar/ui-tokens";

// PWA manifest. Manifest cannot reference Tailwind classes, so read the
// canonical token values directly.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baydar — بيدر",
    short_name: "بيدر",
    description: "شبكتك المهنية العربية",
    start_url: "/ar-PS/feed",
    display: "standalone",
    background_color: tokens.color.brand[50],
    theme_color: tokens.color.brand[600],
    dir: "rtl",
    lang: "ar-PS",
    icons: [
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
  };
}
