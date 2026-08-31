// The four components the 2026-08 mobile redesign added, on their web side.
// Twins of packages/ui-native/src/__tests__/{AppBand,ProvenanceLine,ScoreBar,
// StepRail}.test.tsx — same assertions, expressed against the DOM.

const { TextDecoder, TextEncoder } = require("node:util");

global.IS_REACT_ACT_ENVIRONMENT = true;
global.TextDecoder = global.TextDecoder ?? TextDecoder;
global.TextEncoder = global.TextEncoder ?? TextEncoder;

const React = require("react");
const { createRoot } = require("react-dom/client");

const { AppBand } = require("../../dist/AppBand");
const { ProvenanceLine } = require("../../dist/ProvenanceLine");
const { ScoreBar } = require("../../dist/ScoreBar");
const { StepRail } = require("../../dist/StepRail");

function renderClient(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(element);
  });
  return {
    container,
    unmount() {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

const el = React.createElement;
const testId = (container, id) => container.querySelector(`[data-testid="${id}"]`);

const STEPS = [
  { key: "sent", label: "أُرسل" },
  { key: "seen", label: "شوهد" },
  { key: "interview", label: "مقابلة" },
  { key: "decision", label: "قرار" },
];

describe("AppBand", () => {
  it("renders title and subtitle, and paints the band with no shadow", () => {
    const { container, unmount } = renderClient(
      el(AppBand, { title: "الخلاصة", subtitle: "جولة اليوم", "data-testid": "band" }),
    );
    expect(container.textContent).toContain("الخلاصة");
    expect(container.textContent).toContain("جولة اليوم");

    const band = testId(container, "band");
    expect(band.className).toContain("bg-band");
    expect(band.className).not.toMatch(/shadow/);
    unmount();
  });

  it("renders count in mono and ignores it when trailing is passed", () => {
    const { container, unmount } = renderClient(
      el(AppBand, { title: "الإشعارات", count: 24, "data-testid": "band" }),
    );
    const count = container.querySelector(".font-mono");
    expect(count.textContent).toBe("24");
    unmount();

    const second = renderClient(
      el(AppBand, {
        title: "الإشعارات",
        count: 24,
        trailing: el("span", null, "تحديد الكل"),
        "data-testid": "band",
      }),
    );
    expect(second.container.textContent).toContain("تحديد الكل");
    expect(second.container.textContent).not.toContain("24");
    second.unmount();
  });

  it("formatCount localises the count", () => {
    const { container, unmount } = renderClient(
      el(AppBand, { title: "الإشعارات", count: 24, formatCount: () => "٢٤" }),
    );
    expect(container.textContent).toContain("٢٤");
    unmount();
  });
});

describe("ProvenanceLine", () => {
  it("renders text and trailing, and hides the dot from the a11y tree", () => {
    const { container, unmount } = renderClient(
      el(ProvenanceLine, { text: "سبب الترتيب", trailing: "٣١ نتيجة", "data-testid": "prov" }),
    );
    expect(container.textContent).toContain("سبب الترتيب");
    expect(container.textContent).toContain("٣١ نتيجة");
    expect(testId(container, "prov-dot").getAttribute("aria-hidden")).toBe("true");
    unmount();
  });

  it("reads text and trailing as one label", () => {
    const { container, unmount } = renderClient(
      el(ProvenanceLine, { text: "سبب الترتيب", trailing: "٣١ نتيجة", "data-testid": "prov" }),
    );
    expect(testId(container, "prov").getAttribute("aria-label")).toBe("سبب الترتيب — ٣١ نتيجة");
    unmount();
  });

  it("tone=accent colours the dot accent-500", () => {
    const neutral = renderClient(el(ProvenanceLine, { text: "سبب", "data-testid": "p" }));
    expect(testId(neutral.container, "p-dot").className).toContain("bg-brand-600");
    neutral.unmount();

    const accent = renderClient(
      el(ProvenanceLine, { text: "سبب", tone: "accent", "data-testid": "p" }),
    );
    expect(testId(accent.container, "p-dot").className).toContain("bg-accent-500");
    accent.unmount();
  });

  it("variant=inline drops the band background and rule", () => {
    const { container, unmount } = renderClient(
      el(ProvenanceLine, { text: "سبب", variant: "inline", "data-testid": "p" }),
    );
    const row = testId(container, "p");
    expect(row.className).not.toContain("bg-surface-band");
    expect(row.className).not.toContain("border-b");
    unmount();
  });

  it("onClick makes the whole row a button with a real hit target", () => {
    const onClick = jest.fn();
    const { container, unmount } = renderClient(
      el(ProvenanceLine, { text: "سبب", onClick, "data-testid": "p" }),
    );
    const row = testId(container, "p");
    expect(row.tagName).toBe("BUTTON");
    expect(row.className).toContain("min-h-10");

    React.act(() => {
      row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe("ScoreBar", () => {
  it("clamps value outside 0–1", () => {
    const high = renderClient(el(ScoreBar, { value: 1.8, "data-testid": "bar" }));
    expect(testId(high.container, "bar-fill").style.width).toBe("100%");
    high.unmount();

    const low = renderClient(el(ScoreBar, { value: -3, "data-testid": "bar" }));
    expect(testId(low.container, "bar-fill").style.width).toBe("0%");
    low.unmount();
  });

  it("tone=auto picks the weak fill below 0.5 and never red", () => {
    const weak = renderClient(el(ScoreBar, { value: 0.41, "data-testid": "bar" }));
    expect(testId(weak.container, "bar-fill").className).toContain("bg-bar-fill-weak");
    expect(testId(weak.container, "bar-fill").className).not.toMatch(/danger|red/);
    weak.unmount();

    const strong = renderClient(el(ScoreBar, { value: 0.5, "data-testid": "bar" }));
    expect(testId(strong.container, "bar-fill").className).toContain("bg-bar-fill");
    strong.unmount();
  });

  it("display=ratio renders value over max", () => {
    const { container, unmount } = renderClient(
      el(ScoreBar, { value: 0.6, display: "ratio", max: 500, "data-testid": "bar" }),
    );
    expect(container.textContent).toContain("300 / 500");
    unmount();
  });

  it("segments render one progressbar whose value is the sum", () => {
    const { container, unmount } = renderClient(
      el(ScoreBar, {
        value: 0,
        display: "none",
        caption: ["الحد الأدنى", "نطاقك", "وسيط"],
        segments: [
          { value: 0.2, tone: "weak" },
          { value: 0.5, tone: "strong" },
        ],
        "data-testid": "bar",
      }),
    );
    expect(testId(container, "bar-segment-0").style.width).toBe("20%");
    expect(testId(container, "bar-segment-1").style.width).toBe("50%");

    const bars = container.querySelectorAll('[role="progressbar"]');
    expect(bars).toHaveLength(1);
    expect(bars[0].getAttribute("aria-valuenow")).toBe("70");
    unmount();
  });

  it("onBand swaps to the inverse track and fill", () => {
    const { container, unmount } = renderClient(
      el(ScoreBar, { value: 0.7, onBand: true, "data-testid": "bar" }),
    );
    expect(testId(container, "bar-fill").className).toContain("bg-bar-on-band-fill");
    expect(testId(container, "bar-track").className).toContain("bg-bar-on-band-track");
    unmount();
  });

  it("aria-valuenow matches the rendered percent", () => {
    const { container, unmount } = renderClient(
      el(ScoreBar, { value: 0.894, label: "ملاءمة", "data-testid": "bar" }),
    );
    expect(container.textContent).toContain("89%");
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar.getAttribute("aria-valuenow")).toBe("89");
    expect(bar.getAttribute("aria-label")).toBe("ملاءمة 89%");
    unmount();
  });

  it("throws when display=none has no caption, and when ratio has no max", () => {
    expect(() => renderClient(el(ScoreBar, { value: 0.5, display: "none" }))).toThrow(/decoration/);
    expect(() => renderClient(el(ScoreBar, { value: 0.5, display: "ratio" }))).toThrow(/requires/);
  });
});

describe("StepRail", () => {
  it("renders one node per step and one more segment than nodes", () => {
    const { container, unmount } = renderClient(
      el(StepRail, { steps: STEPS, current: 1, "data-testid": "rail" }),
    );
    expect(container.querySelectorAll('[data-testid^="rail-node-"]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-testid^="rail-segment-"]')).toHaveLength(5);
    unmount();
  });

  it("fills segments before current and leaves the rest on the track", () => {
    const { container, unmount } = renderClient(
      el(StepRail, { steps: STEPS, current: 2, "data-testid": "rail" }),
    );
    expect(testId(container, "rail-segment-0").className).toContain("bg-bar-fill");
    expect(testId(container, "rail-segment-2").className).toContain("bg-bar-fill");
    expect(testId(container, "rail-segment-3").className).toContain("bg-bar-track");
    expect(testId(container, "rail-segment-4").className).toContain("bg-bar-track");
    unmount();
  });

  it("current={-1} fills nothing", () => {
    const { container, unmount } = renderClient(
      el(StepRail, { steps: STEPS, current: -1, "data-testid": "rail" }),
    );
    for (let i = 0; i <= STEPS.length; i += 1) {
      expect(testId(container, `rail-segment-${i}`).className).toContain("bg-bar-track");
    }
    unmount();
  });

  it("completed nodes are brand-600 and the current node takes the accent", () => {
    const { container, unmount } = renderClient(
      el(StepRail, { steps: STEPS, current: 2, "data-testid": "rail" }),
    );
    expect(testId(container, "rail-node-0").className).toContain("bg-brand-600");
    expect(testId(container, "rail-node-2").className).toContain("bg-accent-500");
    expect(testId(container, "rail-node-3").className).toContain("bg-bar-track");
    unmount();
  });

  it("terminal=closed greys every node", () => {
    const { container, unmount } = renderClient(
      el(StepRail, { steps: STEPS, current: 2, terminal: "closed", "data-testid": "rail" }),
    );
    for (let i = 0; i < STEPS.length; i += 1) {
      expect(testId(container, `rail-node-${i}`).className).toContain("bg-bar-track");
    }
    unmount();
  });

  it("compact drops the label row", () => {
    const full = renderClient(el(StepRail, { steps: STEPS, current: 1 }));
    expect(full.container.textContent).toContain("أُرسل");
    full.unmount();

    const compact = renderClient(el(StepRail, { steps: STEPS, current: 1, compact: true }));
    expect(compact.container.textContent).not.toContain("أُرسل");
    compact.unmount();
  });

  it("aria-valuenow equals current + 1", () => {
    const { container, unmount } = renderClient(el(StepRail, { steps: STEPS, current: 2 }));
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar.getAttribute("aria-valuenow")).toBe("3");
    expect(bar.getAttribute("aria-valuemax")).toBe("4");
    expect(bar.getAttribute("aria-label")).toBe("مقابلة — 3 / 4");
    unmount();
  });

  it("throws on fewer than 3 or more than 5 steps", () => {
    expect(() => renderClient(el(StepRail, { steps: STEPS.slice(0, 2), current: 0 }))).toThrow(
      /3–5/,
    );
    expect(() =>
      renderClient(el(StepRail, { steps: [...STEPS, ...STEPS].slice(0, 6), current: 0 })),
    ).toThrow(/3–5/);
  });
});
