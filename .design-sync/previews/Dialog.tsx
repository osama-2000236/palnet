import { Button, Dialog, Input } from "@baydar/ui-web";

// Dialog/Toast layers are position:fixed. In a preview card the containing
// block is the card itself, which has no intrinsic height when the only
// children are fixed — so the overlay centers against a zero-height box and
// gets clipped. This spacer gives it room.
const Stage = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: "relative", minHeight: 400 }}>{children}</div>
);

const noop = (): void => undefined;

// Dialogs render open so the card shows the thing worth seeing.
export const Confirm = () => (
  <Stage>
    <Dialog
      open
      onClose={noop}
      title="حذف المنشور؟"
      description="لن يظهر المنشور لأحد بعد الحذف، وما في تراجع."
      closeLabel="إغلاق"
      footer={
        <>
          <Button variant="ghost" size="sm">
            إلغاء
          </Button>
          <Button variant="danger-ghost" size="sm">
            حذف
          </Button>
        </>
      }
    >
      <p className="text-ink-muted text-sm">نُشر قبل ٣ ساعات · ٤٨ تفاعلًا</p>
    </Dialog>
  </Stage>
);

export const WithForm = () => (
  <Stage>
    <Dialog
      open
      onClose={noop}
      title="أضف خبرة"
      closeLabel="إغلاق"
      footer={
        <>
          <Button variant="ghost" size="sm">
            إلغاء
          </Button>
          <Button size="sm">حفظ</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-ink text-sm font-medium">المسمى الوظيفي</span>
          <Input placeholder="مهندسة برمجيات" fullWidth />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-ink text-sm font-medium">الشركة</span>
          <Input placeholder="جذور للتقنية" fullWidth />
        </label>
      </div>
    </Dialog>
  </Stage>
);

// blocking: no backdrop dismiss, no close button — the user must choose.
export const Blocking = () => (
  <Stage>
    <Dialog
      open
      onClose={noop}
      title="انتهت جلستك"
      description="سجّل الدخول مرة أخرى للمتابعة."
      blocking
      showClose={false}
      footer={<Button size="sm">تسجيل الدخول</Button>}
    >
      <p className="text-ink-muted text-sm">حفظنا مسودتك — بترجعلك بعد الدخول.</p>
    </Dialog>
  </Stage>
);
