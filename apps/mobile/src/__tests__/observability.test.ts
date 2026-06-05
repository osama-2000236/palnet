describe("observability", () => {
  const originalDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.resetModules();
    jest.dontMock("@sentry/react-native");
    jest.dontMock("expo-constants");
    process.env.EXPO_PUBLIC_SENTRY_DSN = originalDsn;
    process.env.NODE_ENV = originalNodeEnv;
  });

  function loadSubject(dsn?: string) {
    jest.resetModules();
    process.env.NODE_ENV = "development";
    process.env.EXPO_PUBLIC_SENTRY_DSN = dsn ?? "";

    const sentry = {
      init: jest.fn(),
      captureException: jest.fn(),
      wrap: jest.fn((component: unknown) => component),
    };

    jest.doMock("@sentry/react-native", () => sentry);
    jest.doMock("expo-constants", () => ({
      __esModule: true,
      default: { executionEnvironment: "standalone" },
      ExecutionEnvironment: { StoreClient: "storeClient" },
    }));

    return {
      sentry,
      subject: jest.requireActual("../lib/observability") as typeof import("../lib/observability"),
    };
  }

  it("does not wrap the app when Sentry is disabled", () => {
    const debug = jest.spyOn(console, "debug").mockImplementation(() => undefined);
    const { sentry, subject } = loadSubject();
    const App = () => null;

    subject.initObservability();
    expect(subject.wrapApp(App)).toBe(App);
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.wrap).not.toHaveBeenCalled();
    debug.mockRestore();
  });

  it("wraps the app after Sentry initializes", () => {
    const debug = jest.spyOn(console, "debug").mockImplementation(() => undefined);
    const { sentry, subject } = loadSubject("https://public@example.invalid/1");
    const App = () => null;

    subject.initObservability();
    expect(subject.wrapApp(App)).toBe(App);
    expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ dsn: expect.any(String) }));
    expect(sentry.wrap).toHaveBeenCalledWith(App);
    debug.mockRestore();
  });
});
