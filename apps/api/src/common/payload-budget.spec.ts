/**
 * The other six payload budgets.
 *
 * `modules/feed/payload-budget.spec.ts` holds the feed's, the table both files
 * work from, and the measurement that decided against building the two payload
 * optimisations §15.2 predicted. This file covers the rest:
 *
 *   GET /jobs (20 jobs)                    18 KB   4.8 s at 30 kbit/s
 *   GET /profiles/:handle                  12 KB   3.2 s
 *   GET /messaging/rooms (20)              10 KB   2.7 s
 *   GET /messaging/rooms/:id/messages (30) 14 KB   3.7 s
 *   GET /notifications (20)                 9 KB   2.4 s
 *   GET /search/people (20 hits)           12 KB   3.2 s
 *
 * Every fixture is Arabic at the length people actually write, and every one
 * varies per row — a fixture that repeats itself measures gzip's dictionary
 * rather than the product.
 *
 * A failure here is somebody in Gaza waiting longer than the number in the
 * table. The fix is to remove a field, not to raise the budget.
 */
import type {
  ChatRoom,
  Job,
  Message,
  Notification,
  Profile,
  SearchPersonHit,
} from "@baydar/shared";
import { gzipSync } from "node:zlib";

const KB = 1024;

const wireBytes = (body: unknown): number =>
  gzipSync(Buffer.from(JSON.stringify(body), "utf8")).length;

const id = (prefix: string, n: number) => `ck${prefix}${String(n).padStart(20, "0")}`;
const meta = (limit: number) => ({ nextCursor: id("curs", 1), hasMore: true, limit });

const TITLES = [
  "محاسب/ة",
  "مهندس كهرباء مباني",
  "أخصائية تغذية",
  "سائق شاحنة رخصة ثالثة",
  "مبرمج واجهات أمامية",
  "خياطة صناعية",
  "منسق مشاريع إغاثة",
  "فني تكييف وتبريد",
  "معلمة رياضيات",
  "حداد ألمنيوم",
];
const CITIES = ["رام الله", "نابلس", "غزة", "الخليل", "طولكرم", "جنين", "بيت لحم", "خان يونس"];
const NAMES = ["ليلى", "عبد الرحمن", "رنا", "يوسف", "هبة", "محمود", "سلمى", "أنس"];

const DESCRIPTION =
  "الدوام كامل من الأحد إلى الخميس، والراتب يُناقش حسب الخبرة. يشترط إجادة العمل " +
  "على برامج الفوترة الإلكترونية وخبرة لا تقل عن سنتين في مجال مشابه. لا نطلب أي " +
  "رسوم من المتقدمين في أي مرحلة من مراحل التوظيف.";

function job(n: number): Job {
  return {
    id: id("job_", n),
    companyId: n % 3 === 0 ? null : id("comp", n),
    postedById: id("user", n),
    title: `${TITLES[n % TITLES.length]!} — ${CITIES[n % CITIES.length]!}`,
    description: DESCRIPTION,
    type: "FULL_TIME",
    locationMode: "ONSITE",
    city: CITIES[n % CITIES.length]!,
    country: "PS",
    occupationKey: "accounting",
    minStanding: null,
    requiresLicence: false,
    licenceBodyKey: null,
    payBasis: "MONTHLY",
    salaryMin: 2200 + n * 50,
    salaryMax: 3400 + n * 50,
    salaryCurrency: "ILS",
    skillsRequired: ["Excel", "محاسبة"],
    mustSkills: ["محاسبة"],
    startsAt: null,
    durationDays: null,
    isActive: true,
    expiresAt: "2026-09-30T00:00:00.000Z",
    createdAt: "2026-08-09T08:00:00.000Z",
    company:
      n % 3 === 0
        ? null
        : {
            id: id("comp", n),
            slug: `company-${n}`,
            name: `شركة ${NAMES[n % NAMES.length]!} للتجارة`,
            logoUrl: `https://cdn.baydar.ps/c/${id("comp", n)}/96.webp`,
          },
    poster: {
      handle: `poster-${n}`,
      firstName: NAMES[n % NAMES.length]!,
      lastName: "أبو ستة",
      avatarUrl: `https://cdn.baydar.ps/a/${id("user", n)}/96.webp`,
    },
    viewer: {
      hasApplied: false,
      bookmarkId: null,
      applicationStatus: null,
      rejectionReason: null,
      rejectionNote: null,
    },
  };
}

function message(n: number): Message {
  return {
    id: id("msg_", n),
    roomId: id("room", n % 20),
    authorId: id("user", n % 4),
    body: `${TITLES[n % TITLES.length]!}؟ أرسل لي سيرتك الذاتية وسأراجعها اليوم إن شاء الله.`,
    mediaUrl: null,
    createdAt: "2026-08-09T09:00:00.000Z",
    editedAt: null,
    deletedAt: null,
    clientMessageId: null,
  };
}

function room(n: number): ChatRoom {
  return {
    id: id("room", n),
    isGroup: false,
    title: null,
    lastMessage: message(n),
    unreadCount: n % 4,
    isRequest: false,
    members: [0, 1].map((i) => ({
      userId: id("user", n * 2 + i),
      handle: `member-${n}-${i}`,
      firstName: NAMES[(n + i) % NAMES.length]!,
      lastName: "أبو ستة",
      avatarUrl: `https://cdn.baydar.ps/a/${id("user", n * 2 + i)}/96.webp`,
      lastReadAt: "2026-08-09T09:05:00.000Z",
      lastSeenAt: "2026-08-09T09:06:00.000Z",
    })),
    updatedAt: "2026-08-09T09:06:00.000Z",
  };
}

function notification(n: number): Notification {
  return {
    id: id("noti", n),
    type: "JOB_APPLICATION_UPDATE",
    actorId: id("user", n),
    postId: null,
    commentId: null,
    connectionId: null,
    messageId: null,
    jobId: id("job_", n),
    data: { jobTitle: TITLES[n % TITLES.length]!, status: "SHORTLISTED" },
    readAt: null,
    createdAt: "2026-08-09T09:00:00.000Z",
    actor: {
      id: id("user", n),
      handle: `actor-${n}`,
      firstName: NAMES[n % NAMES.length]!,
      lastName: "أبو ستة",
      avatarUrl: `https://cdn.baydar.ps/a/${id("user", n)}/96.webp`,
    },
  };
}

function personHit(n: number): SearchPersonHit {
  return {
    userId: id("user", n),
    handle: `member-${n}`,
    firstName: NAMES[n % NAMES.length]!,
    lastName: "أبو ستة",
    headline: `${TITLES[n % TITLES.length]!} — ${CITIES[n % CITIES.length]!}`,
    location: CITIES[n % CITIES.length]!,
    avatarUrl: `https://cdn.baydar.ps/a/${id("user", n)}/96.webp`,
    viewer: { isSelf: false, connection: null },
  };
}

/** A full profile: the heaviest single-resource response in the product. */
const profile: Profile = {
  id: id("prof", 1),
  userId: id("user", 1),
  handle: "member-1",
  firstName: "عبد الرحمن",
  lastName: "أبو ستة",
  headline: "كهربائي مباني — نابلس",
  about:
    "أحد عشر عامًا في تمديدات الكهرباء للمباني السكنية والتجارية، من لوحة التوزيع " +
    "إلى التشطيب. عملت مع ثلاث شركات مقاولات في نابلس وطولكرم، وأنفذ الآن مشاريع " +
    "بالتعاقد المباشر. لدي شهادة مهنية من مركز تدريب وزارة العمل ورخصة قيادة.",
  location: "نابلس",
  country: "PS",
  avatarUrl: `https://cdn.baydar.ps/a/${id("user", 1)}/96.webp`,
  coverUrl: `https://cdn.baydar.ps/cover/${id("user", 1)}/1080.webp`,
  website: null,
  pronouns: null,
  openToWork: true,
  hiring: false,
  experiences: Array.from({ length: 5 }, (_, i) => ({
    id: id("expr", i),
    title: TITLES[i % TITLES.length]!,
    companyName: `شركة ${NAMES[i % NAMES.length]!} للمقاولات`,
    companyId: null,
    location: CITIES[i % CITIES.length]!,
    locationMode: "ONSITE" as const,
    startDate: "2019-01-01T00:00:00.000Z",
    endDate: "2023-01-01T00:00:00.000Z",
    description: DESCRIPTION,
  })),
  educations: Array.from({ length: 2 }, (_, i) => ({
    id: id("educ", i),
    school: "جامعة النجاح الوطنية",
    degree: "بكالوريوس",
    fieldOfStudy: "هندسة كهربائية",
    startDate: "2012-09-01T00:00:00.000Z",
    endDate: "2016-06-01T00:00:00.000Z",
    description: null,
  })),
  skills: Array.from({ length: 12 }, (_, i) => ({
    id: id("skil", i),
    name: `مهارة ${i}`,
    slug: `skill-${i}`,
    endorsements: i,
  })),
  viewer: { isSelf: false, connection: null },
};

describe("payload budgets", () => {
  it("GET /jobs fits twenty jobs in 18 KB", () => {
    const data = Array.from({ length: 20 }, (_, i) => job(i));
    expect(wireBytes({ data, meta: meta(20) })).toBeLessThanOrEqual(18 * KB);
  });

  it("GET /profiles/:handle fits a full profile in 12 KB", () => {
    expect(wireBytes({ data: profile })).toBeLessThanOrEqual(12 * KB);
  });

  it("GET /messaging/rooms fits twenty rooms in 10 KB", () => {
    const data = Array.from({ length: 20 }, (_, i) => room(i));
    expect(wireBytes({ data, meta: meta(20) })).toBeLessThanOrEqual(10 * KB);
  });

  it("GET /messaging/rooms/:id/messages fits thirty messages in 14 KB", () => {
    const data = Array.from({ length: 30 }, (_, i) => message(i));
    expect(wireBytes({ data, meta: meta(30) })).toBeLessThanOrEqual(14 * KB);
  });

  it("GET /notifications fits twenty in 9 KB", () => {
    const data = Array.from({ length: 20 }, (_, i) => notification(i));
    expect(wireBytes({ data, meta: meta(20) })).toBeLessThanOrEqual(9 * KB);
  });

  it("GET /search/people fits twenty hits in 12 KB", () => {
    const data = Array.from({ length: 20 }, (_, i) => personHit(i));
    expect(wireBytes({ data, meta: meta(20) })).toBeLessThanOrEqual(12 * KB);
  });
});
