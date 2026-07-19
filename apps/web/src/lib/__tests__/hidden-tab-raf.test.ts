import { hiddenTabRafBootScript } from "../hidden-tab-raf";

// The boot script must keep rAF callbacks flowing while the document is
// hidden (React 19 schedules streamed-Suspense reveal + hydration retry on
// rAF) and stay hands-off when visible.
describe("hiddenTabRafBootScript", () => {
  const nativeRaf = window.requestAnimationFrame;
  const nativeCaf = window.cancelAnimationFrame;
  let hidden = false;

  beforeAll(() => {
    Object.defineProperty(document, "hidden", { get: () => hidden });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    window.requestAnimationFrame = nativeRaf;
    window.cancelAnimationFrame = nativeCaf;
    // eslint-disable-next-line no-eval
    (0, eval)(hiddenTabRafBootScript);
  });

  afterEach(() => {
    jest.useRealTimers();
    window.requestAnimationFrame = nativeRaf;
    window.cancelAnimationFrame = nativeCaf;
  });

  it("services callbacks via timers while the document is hidden", () => {
    hidden = true;
    const cb = jest.fn();
    const id = window.requestAnimationFrame(cb);
    expect(id).toBeLessThan(0);
    jest.advanceTimersByTime(50);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0]?.[0]).toEqual(expect.any(Number));
  });

  it("cancelAnimationFrame clears a hidden-mode handle", () => {
    hidden = true;
    const cb = jest.fn();
    const id = window.requestAnimationFrame(cb);
    window.cancelAnimationFrame(id);
    jest.advanceTimersByTime(50);
    expect(cb).not.toHaveBeenCalled();
  });

  it("delegates to native rAF while visible", () => {
    hidden = false;
    const spy = jest.fn().mockReturnValue(7);
    window.requestAnimationFrame = spy as unknown as typeof window.requestAnimationFrame;
    // eslint-disable-next-line no-eval
    (0, eval)(hiddenTabRafBootScript);
    const cb = jest.fn();
    expect(window.requestAnimationFrame(cb)).toBe(7);
    expect(spy).toHaveBeenCalledWith(cb);
  });
});
