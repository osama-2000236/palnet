/**
 * The payload budgets, asserted on the DTO shapes.
 *
 * At 30 kbit/s — Gaza's 2G — every 24 KB of response costs 6.4 seconds. The
 * budgets below are therefore hard numbers, not guidance:
 *
 *   GET /feed (10 posts)                   24 KB   6.4 s
 *   GET /jobs (20 jobs)                    18 KB   4.8 s
 *   GET /profiles/:handle                  12 KB   3.2 s
 *   GET /messaging/rooms (20)              10 KB   2.7 s
 *   GET /messaging/rooms/:id/messages (30) 14 KB   3.7 s
 *   GET /notifications (20)                 9 KB   2.4 s
 *   GET /search/* (20 hits)                12 KB   3.2 s
 *
 * This file gates `GET /feed`. The other six are owed and are listed above so
 * the table has one home; each lands with the phase that reshapes its DTO.
 *
 * Lives beside the endpoint it measures, in `apps/api`, because
 * `packages/shared` compiles against `lib: ["ES2022"]` and no Node types —
 * `node:zlib` does not exist there, deliberately.
 *
 * Measured here rather than end-to-end because the budget is a property of the
 * response *shape*, and the regression it exists to catch is a field added
 * without thinking about what it costs. A database is not required to notice
 * that, and requiring one would mean the check does not run.
 *
 * WHAT THIS MEASURED, and what it stopped being built (GAP-03):
 *
 * A ten-post feed page is about 2 KB gzipped against a 24 KB budget — twelve
 * times under. The specification predicted that two changes were needed to get
 * there: an `authors` map instead of a repeated author object, and `?fields=`
 * selection with a server-side allowlist per resource.
 *
 * Both were built and then measured, gzipped, on this fixture:
 *
 *   authors in the page   map     repeated   difference
 *   1                     1870 B    1910 B     −2.1%
 *   5                     1953 B    1969 B     −0.8%
 *   10                    2039 B    2020 B     +0.9%
 *
 * The predicted ~40% is an uncompressed number, and this table is gzipped —
 * which the budget table above already specifies, because that is what goes
 * over the air. DEFLATE deduplicates a repeated JSON object about as well as a
 * hand-built map does, and on a page where nobody repeats it costs slightly
 * more. So the map was reverted: it bought roughly one percent, and charged a
 * wire format, a hydrate step and a new failure mode — a post whose author is
 * missing from the map — for it.
 *
 * Field selection was not built for the same reason. With 22 KB of headroom
 * there is nothing to select away, and an allowlist per resource is a
 * mechanism that has to be maintained on every DTO change forever. Build it
 * when this file goes red.
 */
import { type Post } from "@baydar/shared";
import { gzipSync } from "node:zlib";

const KB = 1024;

/** Gzipped bytes of the JSON that would go on the wire. */
function wireBytes(body: unknown): number {
  return gzipSync(Buffer.from(JSON.stringify(body), "utf8")).length;
}

const id = (prefix: string, n: number) => `ck${prefix}${String(n).padStart(20, "0")}`;

/**
 * Ten different posts, because ten copies of one body measures gzip's
 * dictionary rather than the product. Arabic is the point too — UTF-8 encodes
 * it at two bytes a character, so an English fixture understates every payload
 * here by roughly half.
 */
const BODIES = [
  "أنهينا اليوم تركيب شبكة الكهرباء لمشغل خياطة في نابلس، ثلاثة خطوط منفصلة ولوحة توزيع جديدة. شكرًا لفريق العمل على الالتزام بالمواعيد رغم إغلاق الطريق.",
  "مطلوب محاسب لديه خبرة سنتين على الأقل في برامج الفوترة الإلكترونية، الدوام في رام الله من الأحد إلى الخميس. الراتب يُناقش حسب الخبرة ولا نطلب أي رسوم.",
  "بعد تسعة أشهر من البحث بدأت العمل مساعدة صيدلانية في مستشفى المقاصد. أشكر كل من دلّني على الإعلان وكل من راجع سيرتي الذاتية قبل التقديم.",
  "ورشتنا في خان يونس رجعت تشتغل بعد انقطاع طويل. عندنا قدرة على تصليح مضخات المياه والمولدات الصغيرة، ومن يحتاج تفاصيل يراسلني هنا مباشرة.",
  "سؤال لأصحاب المكاتب الهندسية: كيف تتعاملون مع تأخر ترخيص البناء في البلديات الصغيرة؟ نحن ننتظر منذ خمسة أشهر ولا نعرف إن كان الانتظار طبيعيًا.",
  "أنجزنا تجهيز مطبخ مطعم في بيت لحم بالكامل: تمديدات الغاز، الشفاطات، وأرضية مقاومة للانزلاق. المدة أربعة عشر يومًا والتسليم كان في موعده.",
  "دورة مجانية في الخياطة الصناعية لعشر متدربات في طولكرم، تبدأ الشهر القادم بالتعاون مع مركز تدريب مهني. الأولوية لمن ليس لديها دخل ثابت.",
  "خبرتي أحد عشر عامًا في تمديدات الصرف الصحي، وأبحث الآن عن عمل ثابت مع شركة مقاولات في الخليل أو ما حولها. لدي شهادة مهنية ورخصة قيادة.",
  "لمن يسأل عن أسعار الحديد هذا الأسبوع: ارتفعت مرة أخرى، وكل من يتعاقد بسعر ثابت لثلاثة أشهر يخسر. اكتبوا بند مراجعة الأسعار في العقد.",
  "أغلقنا اليوم أول عقد صيانة سنوي لمصعدين في مبنى تجاري بغزة. البداية كانت طلب تصليح واحد قبل سنة، والباقي جاء من رضا الزبون فقط.",
];
function post(n: number, authorIndex: number): Post {
  return {
    id: id("post", n),
    authorId: id("user", authorIndex),
    body: BODIES[n % BODIES.length]!,
    language: "ar",
    media: [
      {
        id: id("medi", n),
        url: `https://media.baydar.ps/p/${id("medi", n)}/640.webp`,
        kind: "IMAGE",
        mimeType: "image/webp",
        width: 640,
        height: 480,
        sizeBytes: 48_000,
        blurhash: "L6PZfSjE.AyE_3t7t7R**0o#DgR4",
      },
    ],
    createdAt: "2026-08-08T10:14:00.000Z",
    updatedAt: "2026-08-08T10:14:00.000Z",
    counts: {
      reactions: 12,
      comments: 3,
      reposts: 1,
      byReaction: { LIKE: 9, INSIGHTFUL: 3 },
    },
    viewer: { reaction: "LIKE", reposted: false, bookmarkId: null },
    author: {
      id: id("user", authorIndex),
      handle: `member-${authorIndex}`,
      firstName: "عبد الرحمن",
      lastName: "أبو ستة",
      headline: "كهربائي مباني — نابلس",
      avatarUrl: `https://media.baydar.ps/a/${id("user", authorIndex)}/96.webp`,
    },
  };
}

/** Ten posts from five authors — a feed where people follow each other. */
const posts = Array.from({ length: 10 }, (_, i) => post(i, i % 5));
const meta = { nextCursor: id("post", 9), hasMore: true, limit: 10 };

describe("GET /feed payload budget", () => {
  it("fits ten posts in 24 KB gzipped", () => {
    const bytes = wireBytes({ data: posts, meta });

    // A failure here is not a nit. It is somebody in Gaza waiting longer than
    // 6.4 seconds for a feed page, so the fix is to remove a field, not to
    // raise the number.
    expect(bytes).toBeLessThanOrEqual(24 * KB);
  });

  // Twelve times under budget, which is the finding that stopped two payload
  // optimisations from being built. See the note at the top of this file.
  it("leaves room for the fields phases 3 to 6 will add", () => {
    expect(wireBytes({ data: posts, meta })).toBeLessThanOrEqual(4 * KB);
  });
});
