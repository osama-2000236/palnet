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

// Arabic-Indic digits come from an injected formatter, never from a table
// inside the kit (A1.6/A2.14). Without `formatCount` the badge renders Latin
// digits inside an Arabic UI — which is precisely the defect this fixed, and
// showing it uncorrected here would teach the wrong thing.
const arabicDigits = (n: number): string => new Intl.NumberFormat("ar-PS-u-nu-arab").format(n);

export const LocalisedCounts = () => (
  <Tabs value="invitations" onChange={noop} label="أقسام الشبكة" formatCount={arabicDigits}>
    <Tab value="invitations" count={12}>
      الدعوات
    </Tab>
    <Tab value="connections" count={248}>
      الاتصالات
    </Tab>
  </Tabs>
);

// The strip wraps at narrow widths in Arabic (labels are wider than their
// English equivalents). The active underline must stay on its own tab's bottom
// edge, not float under the first row — F1.
export const Wrapped = () => (
  <div style={{ maxWidth: 320 }}>
    <Tabs value="activity" onChange={noop} label="أقسام الملف" formatCount={arabicDigits}>
      <Tab value="about">نبذة</Tab>
      <Tab value="experience" count={3}>
        الخبرات
      </Tab>
      <Tab value="education" count={2}>
        التعليم
      </Tab>
      <Tab value="skills" count={11}>
        المهارات
      </Tab>
      <Tab value="activity">النشاط</Tab>
    </Tabs>
  </div>
);
