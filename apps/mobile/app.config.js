const productionBuild = process.env.EAS_BUILD_PROFILE === "production";
const defaultEasProjectId = "927bc25d-14dc-42bd-a9b2-92f1db758f3d";

const getOptionalEnv = (name) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

const easProjectId =
  getOptionalEnv("EXPO_PUBLIC_EAS_PROJECT_ID") ??
  getOptionalEnv("EAS_PROJECT_ID") ??
  defaultEasProjectId;

const extra = easProjectId
  ? {
      eas: {
        projectId: easProjectId,
      },
    }
  : {};

module.exports = {
  expo: {
    name: "Baydar",
    slug: "baydar",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "baydar",
    userInterfaceStyle: "automatic",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      bundleIdentifier: "ps.baydar.app",
      supportsTablet: true,
      associatedDomains: ["applinks:baydar.ps"],
      infoPlist: {
        CFBundleAllowMixedLocalizations: true,
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "ps.baydar.app",
      usesCleartextTraffic: !productionBuild,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "baydar.ps",
              pathPrefix: "/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra,
  },
};
