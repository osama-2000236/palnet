// A2.11 — toast timing. WCAG 2.2.1 (Timing Adjustable).
//
// The shipped behaviour was a fixed 3.5s with no pause, no extension, and no
// exception for a toast carrying an action. Arabic copy takes longer to read
// than the English that constant was tuned against, and a choice you remove on
// a timer is not a choice.
//
// Raw `createRoot` + `act`, matching message-hooks.test.tsx — the repo has no
// @testing-library and this needs no more than it already has.

import { ToastProvider, useToast, type ShowToastInput } from "@baydar/ui-web";
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let container: HTMLDivElement;
let root: Root;
let fire: (input: ShowToastInput) => void;

function Trigger(): JSX.Element {
  const { showToast } = useToast();
  fire = showToast;
  return <span />;
}

function mount(): void {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
  });
}

const show = (input: ShowToastInput): void => {
  act(() => fire(input));
};

const advance = (ms: number): void => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

const region = (): HTMLElement => document.querySelector("[data-toast-paused]") as HTMLElement;
const toasts = (): NodeListOf<Element> =>
  region().querySelectorAll('[role="status"], [role="alert"]');
const text = (): string => region().textContent ?? "";

describe("toast timing", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mount();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });

  it("auto-dismisses a plain toast", () => {
    show({ message: "تم الحفظ" });
    expect(text()).toContain("تم الحفظ");
    advance(4_000);
    expect(text()).not.toContain("تم الحفظ");
  });

  it("never auto-dismisses a toast that carries an action", () => {
    show({ message: "تعذّر الإرسال", action: { label: "إعادة", onAction: () => {} } });
    advance(60_000);
    expect(text()).toContain("تعذّر الإرسال");
  });

  it("pauses while the stack is hovered, and resumes on leave", () => {
    show({ message: "تم الحفظ" });
    act(() => {
      region().dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    advance(10_000);
    expect(text()).toContain("تم الحفظ");

    act(() => {
      region().dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    });
    advance(4_000);
    expect(text()).not.toContain("تم الحفظ");
  });

  it("pauses while focus is inside the stack", () => {
    show({ message: "تم الحفظ" });
    act(() => {
      (region().querySelector("button") as HTMLElement).dispatchEvent(
        new FocusEvent("focusin", { bubbles: true }),
      );
    });
    advance(10_000);
    expect(text()).toContain("تم الحفظ");
  });

  it("caps the visible stack at three and queues the rest", () => {
    for (let i = 0; i < 5; i += 1) show({ message: `رسالة ${i}` });
    expect(toasts().length).toBe(3);
  });
});
