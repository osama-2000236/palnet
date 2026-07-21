import { Alert, Button } from "@baydar/ui-web";

export const Kinds = () => (
  <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
    <Alert kind="info" title="ملفك غير مكتمل">
      أضف خبرتك الحالية ليظهر ملفك في نتائج البحث.
    </Alert>
    <Alert kind="success" title="تم حفظ التغييرات">
      ستظهر التحديثات على ملفك خلال دقائق.
    </Alert>
    <Alert kind="warning" title="بريدك غير مُفعّل">
      أرسلنا رابط تفعيل إلى بريدك. الرابط صالح ٢٤ ساعة.
    </Alert>
    <Alert kind="danger" title="تعذّر تحميل الخلاصة">
      حصل خطأ في الاتصال. حاول مرة أخرى.
    </Alert>
  </div>
);

export const WithAction = () => (
  <div style={{ maxWidth: 520 }}>
    <Alert
      kind="warning"
      title="بريدك غير مُفعّل"
      action={
        <Button size="sm" variant="secondary">
          إعادة الإرسال
        </Button>
      }
    >
      لن تصلك إشعارات الوظائف قبل تفعيل البريد.
    </Alert>
  </div>
);

export const Closable = () => (
  <div style={{ maxWidth: 520 }}>
    <Alert kind="info" title="جديد: تنبيهات الوظائف" closable closeAriaLabel="إغلاق التنبيه">
      فعّل التنبيهات لتصلك الوظائف المطابقة لخبرتك أولًا بأول.
    </Alert>
  </div>
);

export const BodyOnly = () => (
  <div style={{ maxWidth: 520 }}>
    <Alert kind="info">لا يوجد شيء في خلاصتك بعد — تواصل مع زملاء لتظهر منشوراتهم هنا.</Alert>
  </div>
);
