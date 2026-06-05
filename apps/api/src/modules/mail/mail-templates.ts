import { tokens } from "@baydar/ui-tokens";

export type MailTemplate = "verify-email" | "password-reset";
export type MailLocale = "ar-PS" | "en";

export interface MailData {
  url: string;
  locale?: MailLocale;
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const BRAND = {
  name: { "ar-PS": "بيدر", en: "Baydar" },
  tagline: { "ar-PS": "السمعة تُكتسب.", en: "Reputation is earned." },
  signoff: { "ar-PS": "فريق بيدر", en: "The Baydar team" },
} as const;

const COPY: Record<
  MailTemplate,
  Record<
    MailLocale,
    { subject: string; heading: string; body: string; cta: string; fallback: string }
  >
> = {
  "verify-email": {
    "ar-PS": {
      subject: "أكّد بريدك في بيدر",
      heading: "مرحبًا بك في بيدر",
      body: "لإكمال إنشاء حسابك، أكّد بريدك الإلكتروني خلال 24 ساعة.",
      cta: "تأكيد البريد",
      fallback: "إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:",
    },
    en: {
      subject: "Verify your Baydar email",
      heading: "Welcome to Baydar",
      body: "Confirm your email to finish setting up your account. This link expires in 24 hours.",
      cta: "Verify email",
      fallback: "If the button does not work, copy and paste this link into your browser:",
    },
  },
  "password-reset": {
    "ar-PS": {
      subject: "أعِد تعيين كلمة السر لحسابك في بيدر",
      heading: "طلب إعادة تعيين كلمة السر",
      body: "تلقّينا طلبًا لإعادة تعيين كلمة السر. الرابط صالح لمدة ساعة واحدة. إذا لم تطلب ذلك تجاهل هذه الرسالة.",
      cta: "تعيين كلمة سر جديدة",
      fallback: "إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:",
    },
    en: {
      subject: "Reset your Baydar password",
      heading: "Password reset requested",
      body: "We received a request to reset your password. This link expires in one hour. If you didn't request it, ignore this message.",
      cta: "Set a new password",
      fallback: "If the button does not work, copy and paste this link into your browser:",
    },
  },
};

const COLORS = {
  bg: tokens.color.surface.muted,
  surface: tokens.color.surface.DEFAULT,
  ink: tokens.color.ink.DEFAULT,
  muted: tokens.color.ink.muted,
  brand: tokens.color.brand[600],
  brandInk: tokens.color.ink.inverse,
  border: tokens.color.line.soft,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(
  locale: MailLocale,
  url: string,
  copy: { heading: string; body: string; cta: string; fallback: string },
): string {
  const dir = locale === "ar-PS" ? "rtl" : "ltr";
  const lang = locale === "ar-PS" ? "ar" : "en";
  const brandName = BRAND.name[locale];
  const tagline = BRAND.tagline[locale];
  const signoff = BRAND.signoff[locale];
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(copy.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,sans-serif;color:${COLORS.ink};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 0;text-align:${dir === "rtl" ? "right" : "left"};">
                <div style="font-size:13px;color:${COLORS.muted};letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(brandName)}</div>
                <div style="font-size:12px;color:${COLORS.muted};margin-top:4px;">${escapeHtml(tagline)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0;text-align:${dir === "rtl" ? "right" : "left"};">
                <h1 style="margin:0;font-size:22px;line-height:1.35;color:${COLORS.ink};">${escapeHtml(copy.heading)}</h1>
                <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:${COLORS.ink};">${escapeHtml(copy.body)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;text-align:${dir === "rtl" ? "right" : "left"};">
                <a href="${safeUrl}" style="display:inline-block;background:${COLORS.brand};color:${COLORS.brandInk};text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:15px;">${escapeHtml(copy.cta)}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;text-align:${dir === "rtl" ? "right" : "left"};">
                <p style="margin:0;font-size:13px;color:${COLORS.muted};line-height:1.55;">${escapeHtml(copy.fallback)}</p>
                <p style="margin:8px 0 0;font-size:12px;color:${COLORS.muted};word-break:break-all;direction:ltr;text-align:left;">${safeUrl}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px;text-align:${dir === "rtl" ? "right" : "left"};">
                <hr style="border:0;border-top:1px solid ${COLORS.border};margin:0 0 16px;" />
                <p style="margin:0;font-size:12px;color:${COLORS.muted};">${escapeHtml(signoff)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderText(
  locale: MailLocale,
  url: string,
  copy: { heading: string; body: string; cta: string; fallback: string },
): string {
  return [
    BRAND.name[locale],
    BRAND.tagline[locale],
    "",
    copy.heading,
    "",
    copy.body,
    "",
    `${copy.cta}: ${url}`,
    "",
    copy.fallback,
    url,
    "",
    BRAND.signoff[locale],
  ].join("\n");
}

export function renderMail(template: MailTemplate, data: MailData): RenderedMail {
  const locale: MailLocale = data.locale === "en" ? "en" : "ar-PS";
  const copy = COPY[template][locale];
  return {
    subject: copy.subject,
    html: renderHtml(locale, data.url, copy),
    text: renderText(locale, data.url, copy),
  };
}
