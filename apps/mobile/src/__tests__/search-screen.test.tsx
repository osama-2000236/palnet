import { fireEvent, render } from "@testing-library/react-native";

import SearchScreen from "../../app/(app)/search";

jest.mock("@/lib/api", () => ({
  apiFetchPage: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock("react-i18next", () => {
  const translate = (key: string) =>
    ({
      "search.tabs.people": "People",
      "search.tabs.posts": "Posts",
      "search.tabs.jobs": "Jobs",
      "search.title": "Search",
      "search.placeholder": "Search",
      "search.prompt": "Search",
      "common.clear": "Clear",
    })[key] ?? key;

  return {
    useTranslation: () => ({ t: translate }),
  };
});

describe("SearchScreen", () => {
  it("renders three segmented search tabs", () => {
    const screen = render(<SearchScreen />);

    expect(screen.getByTestId("search-tabs")).toBeTruthy();
    expect(screen.getByTestId("search-tab-people")).toBeTruthy();
    expect(screen.getByTestId("search-tab-posts")).toBeTruthy();
    expect(screen.getByTestId("search-tab-jobs")).toBeTruthy();

    fireEvent.press(screen.getByTestId("search-tab-posts"));
    expect(screen.getByTestId("search-tab-posts").props.accessibilityState.selected).toBe(true);
  });
});
