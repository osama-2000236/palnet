import { RoomRow, Surface } from "@baydar/ui-web";

const noop = (): void => undefined;

const laila = { id: "u_1", handle: "laila-nassar", firstName: "ليلى", lastName: "نصار" };
const omar = { id: "u_2", handle: "omar-h", firstName: "عمر", lastName: "حجازي" };
const rana = { id: "u_3", handle: "rana-k", firstName: "رنا", lastName: "خليل" };

export const InboxList = () => (
  <Surface variant="card" padding="0" className="max-w-[420px] overflow-hidden">
    <RoomRow
      user={laila}
      preview="ابعتيلي سيرتك الذاتية وبرجعلك خلال يومين."
      timestamp="٩:٤٣"
      unreadCount={2}
      online
      onClick={noop}
    />
    <RoomRow user={omar} preview="تمام، بنحكي بكرة." timestamp="أمس" active onClick={noop} />
    <RoomRow
      user={rana}
      preview="رفعت الملخص على المجلد المشترك."
      timestamp="الأحد"
      onClick={noop}
    />
  </Surface>
);

export const Unread = () => (
  <Surface variant="card" padding="0" className="max-w-[420px] overflow-hidden">
    <RoomRow
      user={laila}
      preview="عندك ٩ رسائل جديدة في هالمحادثة."
      timestamp="الآن"
      unreadCount={9}
      online
      onClick={noop}
    />
  </Surface>
);

export const LongPreviewTruncates = () => (
  <Surface variant="card" padding="0" className="max-w-[420px] overflow-hidden">
    <RoomRow
      user={omar}
      preview="شكرًا على الوقت اليوم — لخصت النقاط الرئيسية بملف وبعتهولك على البريد، وفيه كمان اقتراحات للمرحلة الجاية."
      timestamp="١١:٢٠"
      onClick={noop}
    />
  </Surface>
);
