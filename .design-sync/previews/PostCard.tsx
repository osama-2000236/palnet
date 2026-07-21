import { PostCard } from "@baydar/ui-web";

const labels = {
  like: "إعجاب",
  liked: "أعجبني",
  comment: "تعليق",
  repost: "إعادة نشر",
  send: "إرسال",
  save: "حفظ",
  saved: "محفوظ",
  commentsCount: (n: number) => `${n} تعليق`,
  repostsCount: (n: number) => `${n} إعادة نشر`,
  authorLabel: "الملف الشخصي لـ ليلى نصار",
  moreOptions: "خيارات إضافية",
  report: "إبلاغ عن المنشور",
  publicAudience: "منشور عام",
};

const author = {
  id: "u_1",
  handle: "laila-nassar",
  firstName: "ليلى",
  lastName: "نصار",
  headline: "مهندسة برمجيات · رام الله",
};

const body =
  "بعد سنتين على مشروع البنية التحتية، أعلن اليوم انضمامي لفريق المنتج في شركة جذور.\n" +
  "شكرًا لكل من رافقني في الطريق — وخصوصًا الفريق الذي علّمني أن الهندسة الجيدة قرار يومي، مش لحظة.";

export const Default = () => (
  <div style={{ maxWidth: 560 }}>
    <PostCard
      id="p_1"
      author={author}
      body={body}
      timestamp="قبل ٣ ساعات"
      counts={{ reactions: 48, comments: 12, reposts: 3 }}
      liked={false}
      labels={labels}
    />
  </div>
);

export const Liked = () => (
  <div style={{ maxWidth: 560 }}>
    <PostCard
      id="p_2"
      author={{
        id: "u_2",
        handle: "omar-h",
        firstName: "عمر",
        lastName: "حجازي",
        headline: "مؤسس مشارك · نابلس",
      }}
      body="نبحث عن مطوّر واجهات أمامية للانضمام لفريقنا في نابلس. التفاصيل في التعليقات."
      timestamp="قبل يومين"
      counts={{ reactions: 132, comments: 27, reposts: 9 }}
      liked
      saved
      labels={{ ...labels, authorLabel: "الملف الشخصي لـ عمر حجازي" }}
    />
  </div>
);

export const WithMedia = () => (
  <div style={{ maxWidth: 560 }}>
    <PostCard
      id="p_3"
      author={author}
      body="من ورشة أمس حول تصميم الواجهات العربية — شكرًا لكل من حضر."
      media={[
        {
          id: "m_1",
          kind: "IMAGE",
          url:
            "data:image/svg+xml;utf8," +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="300"><rect width="560" height="300" fill="#e8e6df"/><rect x="0" y="220" width="560" height="80" fill="#6b7a3f" opacity="0.25"/><circle cx="440" cy="80" r="38" fill="#b8bf6a" opacity="0.6"/></svg>`,
            ),
        },
      ]}
      timestamp="قبل ٦ ساعات"
      counts={{ reactions: 21, comments: 4, reposts: 1 }}
      liked={false}
      labels={labels}
    />
  </div>
);

export const Busy = () => (
  <div style={{ maxWidth: 560 }}>
    <PostCard
      id="p_4"
      author={author}
      body="جارٍ تسجيل التفاعل — الأزرار معطّلة حتى يرد الخادم."
      timestamp="الآن"
      counts={{ reactions: 3, comments: 0, reposts: 0 }}
      liked={false}
      busy
      saveBusy
      labels={labels}
    />
  </div>
);
