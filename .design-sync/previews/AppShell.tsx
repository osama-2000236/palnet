import { AppShell, PostCard, Surface } from "@baydar/ui-web";

const noop = (): void => undefined;

const me = { id: "u_1", handle: "laila-nassar", firstName: "ليلى", lastName: "نصار" };

const labels = {
  logoAlt: "بيدر",
  searchPlaceholder: "ابحث عن أشخاص، وظائف، شركات",
  searchLabel: "بحث",
  mainNavLabel: "التنقّل الرئيسي",
  myProfile: "ملفي",
  viewProfile: "عرض الملف",
  settings: "الإعدادات",
  signOut: "تسجيل الخروج",
  bellDisconnected: "انقطع الاتصال بالإشعارات",
  nav: {
    feed: "الخلاصة",
    network: "شبكتي",
    jobs: "الوظائف",
    messages: "الرسائل",
    notifications: "الإشعارات",
    activity: "النشاط",
    saved: "المحفوظات",
    employer: "لوحة التوظيف",
  },
  unreadTemplate: {
    messages: "{n} رسالة غير مقروءة",
    notifications: "{n} إشعار جديد",
    activity: "{n} تحديث",
    saved: "{n} عنصر محفوظ",
    employer: "{n} طلب جديد",
  },
};

const postLabels = {
  like: "إعجاب",
  liked: "أعجبني",
  comment: "تعليق",
  repost: "إعادة نشر",
  send: "إرسال",
  commentsCount: (n: number) => `${n} تعليق`,
  repostsCount: (n: number) => `${n} إعادة نشر`,
  authorLabel: "الملف الشخصي لـ عمر حجازي",
  moreOptions: "خيارات إضافية",
  publicAudience: "منشور عام",
};

export const FeedRoute = () => (
  <AppShell
    currentRoute="feed"
    me={me}
    meHeadline="مهندسة برمجيات · رام الله"
    labels={labels}
    messagesUnread={2}
    notificationsUnread={7}
    searchValue=""
    onSearchChange={noop}
    onNavigate={noop}
  >
    <div style={{ display: "grid", gap: 12, maxWidth: 560, margin: "0 auto" }}>
      <PostCard
        id="p_1"
        author={{
          id: "u_2",
          handle: "omar-h",
          firstName: "عمر",
          lastName: "حجازي",
          headline: "مؤسس مشارك · نابلس",
        }}
        body="نبحث عن مطوّر واجهات أمامية للانضمام لفريقنا في نابلس."
        timestamp="قبل ساعتين"
        counts={{ reactions: 132, comments: 27, reposts: 9 }}
        liked={false}
        labels={postLabels}
      />
    </div>
  </AppShell>
);

export const MessagesRoute = () => (
  <AppShell
    currentRoute="messages"
    me={me}
    labels={labels}
    messagesUnread={12}
    notificationsUnread={0}
    onNavigate={noop}
  >
    <Surface variant="card" padding="6" className="mx-auto max-w-[560px]">
      <p className="text-ink text-sm">محتوى الصفحة يركب هنا كـ children.</p>
    </Surface>
  </AppShell>
);

// `bare` drops the nav chrome — auth and onboarding screens use it.
export const Bare = () => (
  <AppShell bare currentRoute={null} me={null} labels={labels} onNavigate={noop}>
    <Surface variant="card" padding="6" className="mx-auto mt-8 max-w-[380px]">
      <h1 className="text-ink mb-2 text-lg font-semibold">تسجيل الدخول</h1>
      <p className="text-ink-muted text-sm">بدون شريط تنقّل — الشاشة تملك تخطيطها.</p>
    </Surface>
  </AppShell>
);

export const DisconnectedNotifications = () => (
  <AppShell
    currentRoute="network"
    me={me}
    labels={labels}
    notificationsConnectionDropped
    onNavigate={noop}
  >
    <Surface variant="tinted" padding="6" className="mx-auto max-w-[560px]">
      <p className="text-ink text-sm">جرس الإشعارات يعرض حالة انقطاع الاتصال.</p>
    </Surface>
  </AppShell>
);
