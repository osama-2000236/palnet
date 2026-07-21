import { EmptyState } from "@baydar/ui-web";

const noop = (): void => undefined;

export const Standalone = () => (
  <div style={{ maxWidth: 520 }}>
    <EmptyState
      motif="feed"
      title="خلاصتك هادية…"
      body="ابدأ منشورًا، أو تواصل مع زملاء جدد لتظهر منشوراتهم هنا."
      cta="اكتب أول منشور"
      onAction={noop}
      altCta="استكشف أشخاصًا"
      onAltAction={noop}
    />
  </div>
);

export const Inline = () => (
  <div style={{ maxWidth: 460 }}>
    <EmptyState
      variant="inline"
      align="start"
      motif="saved"
      title="ما في وظائف محفوظة"
      body="احفظ وظيفة لتلاقيها هون بسرعة."
    />
  </div>
);

export const ErrorState = () => (
  <div style={{ maxWidth: 520 }}>
    <EmptyState
      motif="error"
      tint="none"
      title="الخلاصة غير متاحة الآن"
      body="تعذّر تحميل خلاصتك. حاول مرة أخرى."
      cta="إعادة المحاولة"
      onAction={noop}
    />
  </div>
);

export const NoResults = () => (
  <div style={{ maxWidth: 520 }}>
    <EmptyState
      motif="search"
      direction="outline"
      title="ما في نتائج لـ «مصمم واجهات»"
      body="جرّب كلمات أقل، أو وسّع الفلاتر."
      altCta="مسح الفلاتر"
      onAltAction={noop}
    />
  </div>
);
