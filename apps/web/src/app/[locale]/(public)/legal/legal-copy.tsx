import { Icon } from "@baydar/ui-web";
import Link from "next/link";

const UPDATED = "2026-05-15";

const COPY = {
  tos: {
    en: {
      title: "Terms of Service",
      body: [
        "Baydar is a professional network for people, employers, and communities. Use it lawfully, honestly, and with respect for others.",
        "Accounts must represent real people or authorized company representatives. Employers are responsible for accurate job posts, fair hiring communication, and payment obligations.",
        "Baydar may limit, suspend, or remove accounts, posts, jobs, or messages that break community standards, harm trust, or create legal risk.",
      ],
    },
    ar: {
      title: "شروط الاستخدام",
      body: [
        "بيدر شبكة مهنية للأفراد وأصحاب العمل والمجتمعات. استخدمها بشكل قانوني وصادق ومحترم.",
        "يجب أن تمثل الحسابات أشخاصًا حقيقيين أو ممثلين مخولين عن الشركات. أصحاب العمل مسؤولون عن دقة الوظائف والتواصل العادل والالتزامات المالية.",
        "قد يقيّد بيدر أو يعلّق أو يزيل الحسابات أو المنشورات أو الوظائف أو الرسائل التي تخالف معايير المجتمع أو تضر بالثقة.",
      ],
    },
  },
  privacy: {
    en: {
      title: "Privacy Policy",
      body: [
        "We collect account, profile, professional activity, device, and payment metadata needed to run Baydar safely.",
        "We use data for authentication, recommendations, messaging, hiring workflows, payments, fraud prevention, support, and product analytics.",
        "Users may request export or deletion from account settings. Some records are retained where required for security, billing, dispute, or legal obligations.",
      ],
    },
    ar: {
      title: "سياسة الخصوصية",
      body: [
        "نجمع بيانات الحساب والملف والنشاط المهني والجهاز وبيانات الدفع اللازمة لتشغيل بيدر بأمان.",
        "نستخدم البيانات للمصادقة والتوصيات والرسائل والتوظيف والدفع ومنع الاحتيال والدعم والتحليلات.",
        "يمكن للمستخدم طلب التصدير أو الحذف من إعدادات الحساب. قد نحتفظ ببعض السجلات لأسباب أمنية أو مالية أو قانونية.",
      ],
    },
  },
  community: {
    en: {
      title: "Community Standards",
      body: [
        "Baydar is built for professional trust. No harassment, hate, spam, impersonation, scams, or exploitative job posts.",
        "Report harmful content. Moderators may dismiss, warn, suspend, or delete accounts based on severity and evidence.",
        "Karama Points reward trusted behavior. Gaming, rings, fake endorsements, or coercive reviews can lead to point reversal and account action.",
      ],
    },
    ar: {
      title: "معايير المجتمع",
      body: [
        "بيدر مبني على الثقة المهنية. لا مضايقات، لا كراهية، لا رسائل مزعجة، لا انتحال، لا احتيال، ولا وظائف استغلالية.",
        "بلّغ عن المحتوى المؤذي. يمكن للمشرفين الرفض أو التحذير أو التعليق أو الحذف حسب الخطورة والأدلة.",
        "نقاط الكرامة تكافئ السلوك الموثوق. التلاعب أو التقييمات المزيفة قد يؤدي إلى عكس النقاط وإجراءات على الحساب.",
      ],
    },
  },
  employer: {
    en: {
      title: "Employer Agreement",
      body: [
        "Employers must post accurate roles, compensation context where available, and clear hiring steps.",
        "Paid plans activate after card confirmation or admin approval of bank transfer receipts. Refunds are reviewed case by case before public beta.",
        "Baydar may remove misleading jobs, suspend employer access, or reverse credits when job posts violate law or community standards.",
      ],
    },
    ar: {
      title: "اتفاقية أصحاب العمل",
      body: [
        "على أصحاب العمل نشر وظائف دقيقة، وسياق التعويض عند توفره، وخطوات توظيف واضحة.",
        "تُفعّل الخطط المدفوعة بعد تأكيد البطاقة أو موافقة الإدارة على إيصال التحويل البنكي. تُراجع الاستردادات حالة بحالة قبل البيتا العامة.",
        "قد يزيل بيدر الوظائف المضللة أو يعلّق وصول صاحب العمل أو يعكس الأرصدة عند مخالفة القانون أو معايير المجتمع.",
      ],
    },
  },
} as const;

export type LegalKind = keyof typeof COPY;

// Chrome strings. Inline rather than next-intl because the page copy above
// already is — one mechanism per file beats two.
const SHELL = {
  ar: {
    eyebrow: "الشؤون القانونية",
    home: "بيدر",
    back: "العودة إلى بيدر",
    meta: (updated: string) => `الإصدار ٠٫١ · آخر تحديث ${updated}`,
  },
  en: {
    eyebrow: "Baydar Legal",
    home: "Baydar",
    back: "Back to Baydar",
    meta: (updated: string) => `Version 0.1 · Last updated ${updated}`,
  },
} as const;

export function LegalPage({ kind, locale }: { kind: LegalKind; locale: string }): JSX.Element {
  const lang = locale === "en" ? "en" : "ar";
  const copy = COPY[kind][lang];
  const shell = SHELL[lang];

  return (
    // Rubric functionality 6: these four pages rendered with no application
    // chrome at all — no header, no nav, no back link — so a member who
    // followed the footer link could only leave with the browser back button.
    // The landing page's own minimal header is the precedent, reused here
    // rather than pulling the full AppShell in: these are public pages and a
    // signed-out reader has no shell to return to.
    <div className="bg-surface-muted min-h-screen">
      <header className="border-line-soft bg-surface border-b">
        <div className="mx-auto flex h-14 w-full max-w-[800px] items-center justify-between px-6">
          <Link
            href={`/${locale}`}
            className="target-area text-ink focus-visible:outline-hidden inline-flex items-center gap-2 rounded-md font-semibold focus-visible:[box-shadow:var(--focus-ring)]"
          >
            <Icon name="logo" size={28} />
            <span>{shell.home}</span>
          </Link>
          <Link
            href={`/${locale}`}
            className="target-area text-ink-muted hover:text-ink focus-visible:outline-hidden inline-flex items-center gap-1 rounded-md text-sm focus-visible:[box-shadow:var(--focus-ring)]"
          >
            {/* The kit has no back arrow; `chevron-down` rotated is what the
                rest of the app uses, and `rtl-mirror` flips it in Arabic. */}
            <Icon name="chevron-down" size={16} className="rtl-mirror rotate-90" />
            <span>{shell.back}</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-6 py-10">
        <header className="border-line-soft border-b pb-4">
          <p className="text-brand-700 text-sm font-semibold">{shell.eyebrow}</p>
          <h1 className="text-ink mt-2 text-3xl font-bold">{copy.title}</h1>
          <p className="text-ink-muted mt-1 text-sm">{shell.meta(UPDATED)}</p>
        </header>
        <section className="flex flex-col gap-4">
          {copy.body.map((paragraph) => (
            <p key={paragraph} className="text-ink text-base leading-7">
              {paragraph}
            </p>
          ))}
        </section>
      </main>
    </div>
  );
}
