import { ThemeProvider } from "@baydar/ui-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { ErrorBoundary } from "../components/ErrorBoundary";

jest.mock("@/lib/observability", () => ({ captureException: jest.fn() }));

jest.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    t: (key: string) =>
      ({
        "system.errorBoundary.title": "حدث خلل في التطبيق",
        "system.errorBoundary.body": "حفظنا تفاصيل الخطأ للمراجعة.",
        "system.errorBoundary.retry": "حاول مرة أخرى",
      })[key] ?? key,
  },
}));

function Boom({ explode }: { explode: boolean }): JSX.Element {
  if (explode) throw new Error("boom");
  return <Text>fine</Text>;
}

function renderBoundary(explode: boolean) {
  return render(
    <ThemeProvider scheme="light">
      <ErrorBoundary>
        <Boom explode={explode} />
      </ErrorBoundary>
    </ThemeProvider>,
  );
}

describe("mobile ErrorBoundary", () => {
  // React logs the caught error itself; silence it so a passing run is quiet.
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  afterAll(() => consoleError.mockRestore());

  it("renders children when nothing throws", () => {
    renderBoundary(false);
    expect(screen.getByText("fine")).toBeTruthy();
  });

  it("shows the crash screen and retries", () => {
    renderBoundary(true);
    expect(screen.getByText("حدث خلل في التطبيق")).toBeTruthy();
    // Retry clears the crashed state; the child throws again immediately, so
    // what this proves is that the CTA is wired, not that recovery succeeds.
    fireEvent.press(screen.getByText("حاول مرة أخرى"));
    expect(screen.getByText("حدث خلل في التطبيق")).toBeTruthy();
  });

  // DESIGN.md §7.5: the crash screen is the failure register, and it is the
  // only mobile surface that passes `direction="block"`. Drop the prop and the
  // whole block kit is unreachable on native again — which is how it got here.
  //
  // The two kits draw the `error` motif at different radii (block r=26,
  // harvest r=14), so the rendered circle says which kit ran without asserting
  // on props.
  it("draws the block illustration, not the harvest default", () => {
    const tree = JSON.stringify(renderBoundary(true).toJSON());
    expect(tree).toContain('"r":"26"');
    expect(tree).not.toContain('"r":"14"');
  });
});
