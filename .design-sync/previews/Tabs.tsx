import { Tab, Tabs } from "@baydar/ui-web";

// <Tab> throws outside <Tabs> — the context lives in the parent, so every
// preview here is the full composition.
const noop = (): void => undefined;

export const Default = () => (
  <Tabs value="posts" onChange={noop} label="أقسام الملف">
    <Tab value="posts">المنشورات</Tab>
    <Tab value="about">نبذة</Tab>
    <Tab value="experience">الخبرات</Tab>
  </Tabs>
);

export const WithCounts = () => (
  <Tabs value="invitations" onChange={noop} label="أقسام الشبكة">
    <Tab value="invitations" count={12}>
      الدعوات
    </Tab>
    <Tab value="connections" count={248}>
      الاتصالات
    </Tab>
    <Tab value="pymk">أشخاص قد تعرفهم</Tab>
  </Tabs>
);

export const ManyTabs = () => (
  <Tabs value="all" onChange={noop} label="تصفية النتائج">
    <Tab value="all" count={94}>
      الكل
    </Tab>
    <Tab value="people" count={41}>
      أشخاص
    </Tab>
    <Tab value="jobs" count={28}>
      وظائف
    </Tab>
    <Tab value="posts" count={19}>
      منشورات
    </Tab>
    <Tab value="companies" count={6}>
      شركات
    </Tab>
  </Tabs>
);
