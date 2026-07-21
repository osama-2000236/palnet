import { Button, Icon, ProfileHeader } from "@baydar/ui-web";

const laila = { id: "u_1", handle: "laila-nassar", firstName: "ليلى", lastName: "نصار" };

export const OwnProfile = () => (
  <div style={{ maxWidth: 620 }}>
    <ProfileHeader
      user={laila}
      fullName="ليلى نصار"
      headline="مهندسة برمجيات · تصميم أنظمة وواجهات عربية"
      meta="رام الله، فلسطين · ٣٢٠ اتصالًا"
      actions={
        <>
          <Button variant="secondary" size="sm">
            تعديل الملف
          </Button>
          <Button variant="ghost" size="sm" leading={<Icon name="share" size={16} />}>
            مشاركة
          </Button>
        </>
      }
    />
  </div>
);

// DESIGN.md: exactly one accent CTA per header.
export const OtherProfile = () => (
  <div style={{ maxWidth: 620 }}>
    <ProfileHeader
      user={{ id: "u_2", handle: "omar-h", firstName: "عمر", lastName: "حجازي" }}
      fullName="عمر حجازي"
      headline="مؤسس مشارك · جذور للتقنية"
      meta="نابلس، فلسطين · ٥٠٠+ اتصال"
      actions={
        <>
          <Button variant="accent" size="sm">
            تواصل
          </Button>
          <Button variant="secondary" size="sm">
            رسالة
          </Button>
        </>
      }
    />
  </div>
);

export const Minimal = () => (
  <div style={{ maxWidth: 620 }}>
    <ProfileHeader user={{ handle: "new-user" }} fullName="حساب جديد" meta="/in/new-user" />
  </div>
);
