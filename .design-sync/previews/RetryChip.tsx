import { RetryChip } from "@baydar/ui-web";

const noop = (): void => undefined;

export const States = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <RetryChip label="إعادة المحاولة" onRetry={noop} />
    <RetryChip label="جارٍ المحاولة…" onRetry={noop} loading />
  </div>
);

// The standalone/inline split is a padding difference — it reads only in
// context, so show it inside the sentence it lives in.
export const InlineInSentence = () => (
  <p className="text-ink-muted max-w-[420px] text-sm">
    تعذّر تحميل الاقتراحات. <RetryChip label="حاول مرة أخرى" onRetry={noop} inline />
  </p>
);
