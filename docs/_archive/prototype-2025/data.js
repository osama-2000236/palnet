// Shared fake data + helpers for the prototype.
// All Arabic; written to be realistic for a Palestinian professional network.

window.PALNET_DATA = (() => {
  const me = {
    id: "u-me",
    handle: "leen-salah",
    firstName: "لين",
    lastName: "صلاح",
    headline: "مهندسة منتجات · تصميم تجارب RTL",
    location: "رام الله، فلسطين",
    avatar: { initials: "ل ص", palette: "palette-1" },
    connections: 482,
  };

  const people = [
    {
      id: "u1",
      handle: "omar-khalil",
      firstName: "عمر",
      lastName: "خليل",
      headline: "مدير هندسة في منصة كرمة",
      location: "رام الله",
      avatar: { initials: "ع خ", palette: "palette-2" },
    },
    {
      id: "u2",
      handle: "reem-dabbagh",
      firstName: "ريم",
      lastName: "دباغ",
      headline: "مصممة واجهات أولى · Figma community contributor",
      location: "حيفا",
      avatar: { initials: "ر د", palette: "palette-3" },
    },
    {
      id: "u3",
      handle: "yazan-hafez",
      firstName: "يزن",
      lastName: "حافظ",
      headline: "مهندس بيانات · Neon · PostgreSQL",
      location: "نابلس",
      avatar: { initials: "ي ح", palette: "palette-4" },
    },
    {
      id: "u4",
      handle: "sara-nasrallah",
      firstName: "سارة",
      lastName: "نصر الله",
      headline: "باحثة UX · جامعة بيرزيت",
      location: "بيرزيت",
      avatar: { initials: "س ن", palette: "palette-5" },
    },
    {
      id: "u5",
      handle: "bashar-odeh",
      firstName: "بشار",
      lastName: "عودة",
      headline: "مؤسس شركة زيتونة للتقنية",
      location: "القدس",
      avatar: { initials: "ب ع", palette: "palette-1" },
    },
    {
      id: "u6",
      handle: "dana-mansour",
      firstName: "دانا",
      lastName: "منصور",
      headline: "كاتبة تقنية · محتوى عربي",
      location: "عمّان",
      avatar: { initials: "د م", palette: "palette-2" },
    },
    {
      id: "u7",
      handle: "tareq-awad",
      firstName: "طارق",
      lastName: "عوض",
      headline: "مهندس DevOps · Render · Docker",
      location: "غزة",
      avatar: { initials: "ط ع", palette: "palette-3" },
    },
    {
      id: "u8",
      handle: "nour-qasem",
      firstName: "نور",
      lastName: "قاسم",
      headline: "مديرة توظيف تقني",
      location: "رام الله",
      avatar: { initials: "ن ق", palette: "palette-4" },
    },
  ];

  const byId = Object.fromEntries([me, ...people].map((p) => [p.id, p]));

  const posts = [
    {
      id: "p1",
      authorId: "u1",
      createdAt: "منذ ساعتين",
      body: "بعد ستة أشهر من العمل، أطلقنا أول نسخة عامة من منصة كرمة — منصة للفرق الصغيرة لإدارة مشاريعها بلغة عربية أصيلة، بواجهة RTL من أول سطر كود.\n\nشكرًا لكل من ساهم وكل من جرّب النسخة التجريبية.",
      media: [{ kind: "IMAGE", label: "لقطة من المنصة" }],
      reactions: 124,
      comments: 23,
      reposts: 8,
      liked: false,
    },
    {
      id: "p2",
      authorId: "u2",
      createdAt: "منذ 5 ساعات",
      body: "ملاحظة سريعة للمصممين الذين يعملون على واجهات عربية:\n\nلا تستخدموا left/right في CSS. استخدموا start/end. خطأ بسيط لكنه يكسر الواجهة بالكامل عند التبديل للإنجليزية.",
      media: [],
      reactions: 67,
      comments: 12,
      reposts: 4,
      liked: true,
    },
    {
      id: "p3",
      authorId: "u5",
      createdAt: "منذ يوم",
      body: "نبحث في زيتونة عن مهندس full-stack بخبرة في Next.js و Prisma. العمل عن بُعد مع اجتماع أسبوعي في رام الله.\n\nالتفاصيل في الوظائف — أو راسلوني مباشرة.",
      media: [],
      reactions: 45,
      comments: 18,
      reposts: 11,
      liked: false,
    },
    {
      id: "p4",
      authorId: "u4",
      createdAt: "منذ يومين",
      body: 'نشرت دراسة حالة عن كيف يقرأ المستخدم العربي صفحات التسجيل — نتائج مفاجئة حول مكان زر "إنشاء حساب" في تصميمات RTL.',
      media: [{ kind: "IMAGE", label: "مخطط نتائج البحث" }],
      reactions: 89,
      comments: 31,
      reposts: 14,
      liked: false,
    },
  ];

  const comments = {
    p1: [
      {
        authorId: "u2",
        body: "مبروك! الواجهة تبدو ممتازة. هل النسخة المتاحة مجانية؟",
        createdAt: "منذ ساعة",
      },
      { authorId: "u4", body: "سأجرّبها مع فريقي هذا الأسبوع.", createdAt: "منذ 45 دقيقة" },
    ],
    p2: [
      {
        authorId: "u3",
        body: "معلومة ذهبية. أضف إليها: icons اتجاه التنقل يجب أن تنعكس، لكن icons الإيميل والهاتف لا.",
        createdAt: "منذ 3 ساعات",
      },
    ],
  };

  const rooms = [
    {
      id: "r1",
      userId: "u1",
      lastBody: "تمام، أرسلت لك الرابط الآن.",
      lastAt: "10:24",
      unread: 2,
      online: true,
    },
    {
      id: "r2",
      userId: "u2",
      lastBody: "شكراً على الملاحظة 🙏",
      lastAt: "أمس",
      unread: 0,
      online: false,
    },
    {
      id: "r3",
      userId: "u8",
      lastBody: "هل أنت متاحة لمقابلة قصيرة الخميس؟",
      lastAt: "أمس",
      unread: 1,
      online: true,
    },
    {
      id: "r4",
      userId: "u5",
      lastBody: "سأراجع السيرة الذاتية وأعود إليك.",
      lastAt: "الأحد",
      unread: 0,
      online: false,
    },
    {
      id: "r5",
      userId: "u4",
      lastBody: "الدراسة منشورة على الرابط.",
      lastAt: "12 نيسان",
      unread: 0,
      online: false,
    },
  ];

  const threads = {
    r1: [
      {
        authorId: "u1",
        body: "أهلاً لين، رأيتُ عرضك على مؤتمر التصميم الأسبوع الماضي — كان ممتازاً.",
        at: "10:10",
      },
      { authorId: "u-me", body: "شكراً جزيلاً عمر، يسعدني أن العرض كان مفيداً.", at: "10:14" },
      { authorId: "u1", body: "هل يمكن أن ترسلي لي الشرائح؟ سأشاركها مع فريقي.", at: "10:18" },
      { authorId: "u-me", body: "طبعاً، لحظة.", at: "10:20" },
      { authorId: "u1", body: "تمام، أرسلت لك الرابط الآن.", at: "10:24" },
    ],
  };

  const jobs = [
    {
      id: "j1",
      title: "مهندس Full-Stack",
      company: "زيتونة",
      location: "رام الله · عن بُعد",
      postedAt: "منذ يومين",
    },
    {
      id: "j2",
      title: "مصمم منتجات أول",
      company: "منصة كرمة",
      location: "حيفا · مختلط",
      postedAt: "منذ 3 أيام",
    },
  ];

  const notifications = [
    { id: "n1", kind: "connect", userId: "u3", at: "منذ 20 دقيقة", read: false },
    { id: "n2", kind: "react", userId: "u2", at: "منذ ساعتين", read: false },
    { id: "n3", kind: "comment", userId: "u4", at: "منذ 4 ساعات", read: true },
  ];

  return { me, people, byId, posts, comments, rooms, threads, jobs, notifications };
})();
