import { Tab, Tabs } from "@baydar/ui-web";

// <Tab> reads its selected state from <Tabs> context and throws outside it, so
// every cell here is the full parent composition.
const noop = (): void => undefined;

export const ActiveAndInactive = () => (
  <Tabs value="posts" onChange={noop} label="أقسام الملف">
    <Tab value="posts">المنشورات</Tab>
    <Tab value="about">نبذة</Tab>
  </Tabs>
);

export const WithCount = () => (
  <Tabs value="invitations" onChange={noop} label="أقسام الشبكة">
    <Tab value="invitations" count={12}>
      الدعوات
    </Tab>
    <Tab value="connections" count={248}>
      الاتصالات
    </Tab>
  </Tabs>
);

// count={0} is intentionally not rendered — a zero badge is noise.
export const ZeroCountHidden = () => (
  <Tabs value="archived" onChange={noop} label="الرسائل">
    <Tab value="archived" count={0}>
      المؤرشفة
    </Tab>
    <Tab value="inbox" count={3}>
      الوارد
    </Tab>
  </Tabs>
);
