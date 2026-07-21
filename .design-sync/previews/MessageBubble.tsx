import { MessageBubble } from "@baydar/ui-web";

const labels = {
  ownPrefix: (time: string) => `أنت، الساعة ${time}:`,
  otherPrefix: (name: string, time: string) => `${name}، الساعة ${time}:`,
  failedHint: "لم يُرسل — اضغط لإعادة المحاولة",
  statusSending: "جارٍ الإرسال",
  statusSent: "أُرسلت",
  statusDelivered: "وصلت",
  statusRead: "قُرئت",
  statusFailed: "فشل الإرسال",
  editedSuffix: "معدّلة",
  deletedBody: "حُذفت هذه الرسالة",
};

const Thread = ({ children }: { children: React.ReactNode }) => (
  <ul
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      maxWidth: 420,
      margin: 0,
      padding: 0,
      listStyle: "none",
    }}
  >
    {children}
  </ul>
);

export const Conversation = () => (
  <Thread>
    <MessageBubble side="theirs" authorName="ليلى" labels={labels}>
      مرحبا عمر! شفت إعلان الوظيفة اللي نزلتوه.
    </MessageBubble>
    <MessageBubble side="theirs" authorName="ليلى" tail timestamp="٩:٤١" labels={labels}>
      بتقبلوا خبرة ٣ سنوات؟
    </MessageBubble>
    <MessageBubble side="mine" labels={labels}>
      أهلًا ليلى — أكيد.
    </MessageBubble>
    <MessageBubble side="mine" tail timestamp="٩:٤٣" status="read" labels={labels}>
      ابعتيلي سيرتك الذاتية وبرجعلك خلال يومين.
    </MessageBubble>
  </Thread>
);

export const Statuses = () => (
  <Thread>
    <MessageBubble side="mine" tail timestamp="٩:٤١" status="sending" labels={labels}>
      جارٍ الإرسال
    </MessageBubble>
    <MessageBubble side="mine" tail timestamp="٩:٤١" status="sent" labels={labels}>
      أُرسلت
    </MessageBubble>
    <MessageBubble side="mine" tail timestamp="٩:٤٢" status="delivered" labels={labels}>
      وصلت
    </MessageBubble>
    <MessageBubble side="mine" tail timestamp="٩:٤٢" status="read" labels={labels}>
      قُرئت
    </MessageBubble>
  </Thread>
);

export const Failed = () => (
  <Thread>
    <MessageBubble side="mine" tail timestamp="٩:٤٤" status="failed" labels={labels}>
      هاي الرسالة ما وصلت.
    </MessageBubble>
  </Thread>
);

export const EditedAndDeleted = () => (
  <Thread>
    <MessageBubble side="theirs" authorName="ليلى" tail timestamp="٩:٥٠" edited labels={labels}>
      بعتذر — قصدت يوم الخميس مش الأربعاء.
    </MessageBubble>
    <MessageBubble side="mine" tail timestamp="٩:٥١" deleted labels={labels}>
      (محذوفة)
    </MessageBubble>
  </Thread>
);

export const GroupRoom = () => (
  <Thread>
    <MessageBubble
      side="theirs"
      authorName="رنا خليل"
      groupAuthor={{ id: "u_3", handle: "rana-k", firstName: "رنا", lastName: "خليل" }}
      tail
      timestamp="١٠:٠٥"
      labels={labels}
    >
      رفعت الملخص على المجلد المشترك.
    </MessageBubble>
  </Thread>
);
