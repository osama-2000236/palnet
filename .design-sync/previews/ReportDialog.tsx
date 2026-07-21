import { ReportDialog } from "@baydar/ui-web";

// Dialog/Toast layers are position:fixed. In a preview card the containing
// block is the card itself, which has no intrinsic height when the only
// children are fixed — so the overlay centers against a zero-height box and
// gets clipped. This spacer gives it room.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: "relative", minHeight: 480 }}>{children}</div>
);

const noop = (): void => undefined;

const labels = {
  title: "الإبلاغ عن المنشور",
  detailsLabel: "تفاصيل إضافية (اختياري)",
  cancel: "إلغاء",
  submit: "إرسال البلاغ",
  close: "إغلاق",
  reasons: {
    SPAM: "محتوى مزعج أو دعائي",
    HARASSMENT: "إساءة أو تحرّش",
    HATE: "خطاب كراهية",
    MISINFORMATION: "معلومات مضللة",
    NUDITY: "محتوى جنسي",
    VIOLENCE: "عنف أو تهديد",
    OTHER: "سبب آخر",
  },
};

export const ReportPost = () => (
  <Stage>
    <ReportDialog
      open
      onOpenChange={noop}
      target={{ kind: "post", id: "p_1" }}
      onSubmit={noop}
      labels={labels}
    />
  </Stage>
);

export const Submitting = () => (
  <Stage>
    <ReportDialog
      open
      onOpenChange={noop}
      target={{ kind: "user", id: "u_2" }}
      onSubmit={noop}
      labels={labels}
      submitting
    />
  </Stage>
);
