import type { MetadataRoute } from "next";

// PWA manifest. Brand hex literals here are the canonical token values
// (brand-50 cream, brand-600 olive). Manifest cannot reference Tailwind
// classes — these are duplicated by necessity, not by drift.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baydar — بيدر",
    short_name: "بيدر",
    description: "شبكتك المهنية العربية",
    start_url: "/ar-PS/feed",
    display: "standalone",
    background_color: "#f4f6ef",
    theme_color: "#526030",
    dir: "rtl",
    lang: "ar-PS",
    icons: [
      { src: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
  };
}
