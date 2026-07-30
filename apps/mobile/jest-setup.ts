import { configure } from "@testing-library/react-native";

// RNTL defaults asyncUtilTimeout to 1s. This suite runs at maxWorkers:1 while the api/web/shared
// suites saturate the same box, and a screen test that renders then awaits several fetches already
// burns ~460ms of that budget idle — so under load the default is a coin flip, not a real assertion.
// Set once here rather than per waitFor: 30 call sites share the same ceiling.
configure({ asyncUtilTimeout: 5_000 });
// Keep Jest's own per-test timeout above asyncUtilTimeout, or Jest fires first and swallows the
// RNTL diff that tells you which element never showed up.
jest.setTimeout(20_000);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      language: "ar-PS",
      changeLanguage: jest.fn(),
    },
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const router = {
    back: jest.fn(),
    dismissAll: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  };
  return {
    Link: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    Redirect: () => null,
    Stack: { Screen: () => null },
    Tabs: { Screen: () => null },
    router,
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => callback(), [callback]);
    },
    useLocalSearchParams: () => ({}),
    useRouter: () => router,
  };
});

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
}));

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "file:///documents/",
  cacheDirectory: "file:///cache/",
  EncodingType: { UTF8: "utf8" },
  writeAsStringAsync: jest.fn(async () => undefined),
}));

jest.mock(
  "expo-sharing",
  () => ({
    isAvailableAsync: jest.fn(async () => true),
    shareAsync: jest.fn(async () => undefined),
  }),
  { virtual: true },
);

jest.mock("expo-image", () => ({
  Image: (props: { children?: unknown }) => {
    const React = require("react");
    return React.createElement(React.Fragment, null, props.children ?? null);
  },
}));

jest.mock("react-native-sse", () =>
  jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    close: jest.fn(),
  })),
);

jest.mock("expo-notifications", () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "granted" })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[test]" })),
  setNotificationHandler: jest.fn(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
}));

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: unknown) => component,
}));

jest.mock("posthog-react-native", () =>
  jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
  })),
);

jest.mock("react-native-safe-area-context", () => {
  const actual = jest.requireActual("react-native-safe-area-context");
  const React = require("react");
  return {
    ...actual,
    SafeAreaProvider: ({ children }: { children: unknown }) => children,
    SafeAreaView: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
