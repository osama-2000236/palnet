// A cohort of Palestinian professionals so search, network, and connect have
// something real to work against. Before this the seed produced three users
// (demo, a11y, owner) — searching for people returned nothing and there was
// nobody to connect with.

import type { PrismaClient } from "@prisma/client";

interface Person {
  handle: string;
  firstName: string;
  lastName: string;
  headline: string;
  location: string;
  skills: string[];
  /** Connection state toward the demo user. */
  link: "accepted" | "incoming" | "suggested";
  post?: string;
}

// Names, cities, and roles chosen to look like a real Palestinian professional
// network rather than lorem — this fixture is what the app is demoed against.
const PEOPLE: Person[] = [
  {
    handle: "layan-khatib",
    firstName: "ليان",
    lastName: "الخطيب",
    headline: "مهندسة برمجيات أولى — React و TypeScript",
    location: "رام الله",
    skills: ["React", "TypeScript", "Node.js"],
    link: "accepted",
    post: "أنهينا اليوم ترحيل واجهة المنصة إلى تصميم يدعم العربية أولاً. أكبر درس: الاتجاه من اليمين إلى اليسار قرار معماري، لا لمسة أخيرة.",
  },
  {
    handle: "omar-nashashibi",
    firstName: "عمر",
    lastName: "النشاشيبي",
    headline: "مدير منتج في قطاع التقنية المالية",
    location: "رام الله",
    skills: ["Product Management", "Analytics"],
    link: "accepted",
    post: "نبحث عن مختصّ تحليلات بيانات للانضمام إلى فريقنا في رام الله. الأولوية لمن لديه خبرة في المدفوعات المحلية.",
  },
  {
    handle: "rania-abdelhadi",
    firstName: "رانية",
    lastName: "عبد الهادي",
    headline: "مصمّمة تجربة مستخدم — منتجات عربية",
    location: "نابلس",
    skills: ["UX Design", "Figma", "Design Systems"],
    link: "accepted",
    post: "ملاحظة من اختبار قابلية الاستخدام هذا الأسبوع: المستخدمون لا يقرأون البطاقات الفارغة، بل يتخطّونها. الحالة الفارغة يجب أن تقترح خطوة تالية.",
  },
  {
    handle: "khaled-masri",
    firstName: "خالد",
    lastName: "المصري",
    headline: "مهندس بنية تحتية سحابية",
    location: "الخليل",
    skills: ["Kubernetes", "PostgreSQL", "Node.js"],
    link: "accepted",
  },
  {
    handle: "dana-suleiman",
    firstName: "دانا",
    lastName: "سليمان",
    headline: "أخصائية موارد بشرية واستقطاب",
    location: "بيت لحم",
    skills: ["Recruiting", "People Operations"],
    link: "incoming",
  },
  {
    handle: "yousef-tamimi",
    firstName: "يوسف",
    lastName: "التميمي",
    headline: "محلل بيانات — قطاع الصحة",
    location: "رام الله",
    skills: ["Python", "SQL", "Analytics"],
    link: "incoming",
  },
  {
    handle: "maha-darwish",
    firstName: "مها",
    lastName: "درويش",
    headline: "مديرة مشاريع تنموية",
    location: "غزة",
    skills: ["Project Management", "Monitoring & Evaluation"],
    link: "suggested",
    post: "اختتمنا برنامج تدريب ٤٠ مهندسة على تطوير الويب. المرحلة القادمة: ربطهنّ بفرص عمل حقيقية.",
  },
  {
    handle: "tareq-shawa",
    firstName: "طارق",
    lastName: "الشوا",
    headline: "مطوّر تطبيقات جوّال — React Native",
    location: "غزة",
    skills: ["React Native", "TypeScript"],
    link: "suggested",
  },
  {
    handle: "nour-halabi",
    firstName: "نور",
    lastName: "الحلبي",
    headline: "كاتبة محتوى تقني بالعربية",
    location: "نابلس",
    skills: ["Content Strategy", "Arabic Copywriting"],
    link: "suggested",
  },
  {
    handle: "sami-jaber",
    firstName: "سامي",
    lastName: "جابر",
    headline: "مؤسس شركة ناشئة في اللوجستيات",
    location: "رام الله",
    skills: ["Entrepreneurship", "Operations"],
    link: "suggested",
    post: "ثلاث سنوات من العمل على شحن الطرود داخل الضفة علّمتنا أن العنوان ليس سطراً نصياً، بل مسألة ثقة.",
  },
  {
    handle: "ahlam-qasem",
    firstName: "أحلام",
    lastName: "قاسم",
    headline: "مهندسة ضمان جودة",
    location: "جنين",
    skills: ["QA Automation", "Playwright"],
    link: "suggested",
  },
  {
    handle: "bassel-odeh",
    firstName: "باسل",
    lastName: "عودة",
    headline: "مختص أمن معلومات",
    location: "طولكرم",
    skills: ["Security", "Incident Response"],
    link: "suggested",
  },
];

export async function seedPeople(prisma: PrismaClient, demoUserId: string, passwordHash: string) {
  for (const person of PEOPLE) {
    const user = await upsertPerson(prisma, person, passwordHash);
    await linkSkills(prisma, user.profileId, person.skills);
    await linkConnection(prisma, demoUserId, user.userId, person.link);

    if (person.post) {
      // Idempotent by (author, body): re-running the seed must not pile up posts.
      const existing = await prisma.post.findFirst({
        where: { authorId: user.userId, body: person.post },
        select: { id: true },
      });
      if (!existing) {
        await prisma.post.create({ data: { authorId: user.userId, body: person.post } });
      }
    }
  }

  return PEOPLE.length;
}

async function upsertPerson(prisma: PrismaClient, person: Person, passwordHash: string) {
  const email = `${person.handle}@baydar.ps`;
  const profileData = {
    handle: person.handle,
    firstName: person.firstName,
    lastName: person.lastName,
    headline: person.headline,
    country: "PS",
    location: person.location,
  };

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          locale: "ar-PS",
          profile: existing.profile ? { update: profileData } : { create: profileData },
        },
        include: { profile: true },
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "USER",
          locale: "ar-PS",
          emailVerified: new Date(),
          profile: { create: profileData },
        },
        include: { profile: true },
      });

  if (!user.profile) throw new Error(`Seed person ${person.handle} has no profile.`);
  return { userId: user.id, profileId: user.profile.id };
}

async function linkSkills(prisma: PrismaClient, profileId: string, names: string[]) {
  for (const name of names) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const skill = await prisma.skill.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    await prisma.profileSkill.upsert({
      where: { profileId_skillId: { profileId, skillId: skill.id } },
      update: {},
      create: { profileId, skillId: skill.id },
    });
  }
}

async function linkConnection(
  prisma: PrismaClient,
  demoUserId: string,
  personId: string,
  link: Person["link"],
) {
  // "suggested" means no row at all — that is what makes someone appear as a
  // person you *can* connect with rather than one you already know.
  if (link === "suggested") return;

  // accepted: demo asked and they said yes. incoming: they are waiting on demo,
  // so the network screen has real invitations to act on.
  const [requesterId, receiverId] =
    link === "accepted" ? [demoUserId, personId] : [personId, demoUserId];

  await prisma.connection.upsert({
    where: { requesterId_receiverId: { requesterId, receiverId } },
    update: {},
    create: {
      requesterId,
      receiverId,
      status: link === "accepted" ? "ACCEPTED" : "PENDING",
      respondedAt: link === "accepted" ? new Date() : null,
    },
  });
}
