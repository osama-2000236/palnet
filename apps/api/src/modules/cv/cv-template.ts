import { tokens } from "@baydar/ui-tokens";

// The CV document itself: one self-contained HTML file, print-sized.
//
// Self-contained is the requirement, not a preference. The platform renderers
// that turn this into a PDF -- `window.print()` on web, `expo-print` on mobile
// -- do not reliably wait for an external stylesheet or a webfont, and a CV
// that prints in Times New Roman with the Arabic unshaped is a CV nobody sends.
// So: inline CSS, system font stack, no images, no script.
//
// Arabic shaping and bidi come from the renderer, which is the whole reason the
// server stops at HTML. See GAP-09.

export interface CvEntry {
  title: string;
  organisation: string;
  startDate: Date | null;
  endDate: Date | null;
  description: string | null;
}

export interface CvAward {
  name: string;
  issuerName: string;
  issuedAt: Date | null;
}

export interface CvDocument {
  locale: "ar" | "en";
  firstName: string;
  lastName: string;
  headline: string | null;
  about: string | null;
  location: string | null;
  website: string | null;
  occupations: string[];
  experiences: CvEntry[];
  educations: CvEntry[];
  volunteerRoles: CvEntry[];
  certificates: CvAward[];
  honors: CvAward[];
  publications: CvAward[];
  languages: Array<{ languageKey: string; proficiency: string }>;
  skills: string[];
  careerBreak: { from: Date; to: Date | null; reason: string | null } | null;
}

const COPY = {
  ar: {
    experience: "الخبرة العملية",
    education: "التعليم",
    volunteer: "العمل التطوعي",
    certificates: "الشهادات",
    honors: "الجوائز والتكريم",
    publications: "المنشورات",
    languages: "اللغات",
    skills: "المهارات",
    careerBreak: "انقطاع مهني",
    present: "حتى الآن",
  },
  en: {
    experience: "Experience",
    education: "Education",
    volunteer: "Volunteering",
    certificates: "Certificates",
    honors: "Honours",
    publications: "Publications",
    languages: "Languages",
    skills: "Skills",
    careerBreak: "Career break",
    present: "Present",
  },
} as const;

/** Everything that reaches the document is member-authored text. */
function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Year and month only.
 *
 * A CV does not need a day, and Latin digits are used in both locales here on
 * purpose: a PDF is read by employers abroad and by ATS software, and
 * Arabic-Indic digits in a date field are the single most common reason a
 * parser drops a row.
 */
function period(start: Date | null, end: Date | null, present: string): string {
  const fmt = (d: Date) => `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  if (!start) return end ? fmt(end) : "";
  return `${fmt(start)} — ${end ? fmt(end) : present}`;
}

function entrySection(title: string, entries: CvEntry[], present: string): string {
  if (entries.length === 0) return "";
  const rows = entries
    .map(
      (e) => `<article class="entry">
      <h3>${escape(e.title)}</h3>
      <p class="org">${escape(e.organisation)}</p>
      <p class="period">${escape(period(e.startDate, e.endDate, present))}</p>
      ${e.description ? `<p class="desc">${escape(e.description)}</p>` : ""}
    </article>`,
    )
    .join("");
  return `<section><h2>${escape(title)}</h2>${rows}</section>`;
}

function awardSection(title: string, awards: CvAward[]): string {
  if (awards.length === 0) return "";
  const rows = awards
    .map((a) => {
      const year = a.issuedAt ? ` · ${a.issuedAt.getUTCFullYear()}` : "";
      const issuer = a.issuerName ? ` — ${a.issuerName}` : "";
      return `<li>${escape(a.name)}${escape(issuer)}${escape(year)}</li>`;
    })
    .join("");
  return `<section><h2>${escape(title)}</h2><ul class="plain">${rows}</ul></section>`;
}

function chipSection(title: string, items: string[]): string {
  if (items.length === 0) return "";
  const chips = items.map((item) => `<li>${escape(item)}</li>`).join("");
  return `<section><h2>${escape(title)}</h2><ul class="chips">${chips}</ul></section>`;
}

// Logical properties throughout, so one stylesheet prints correctly in both
// directions. `dir` on <html> is the only thing that changes between locales.
//
// Colours are interpolated from the token bundle rather than written as hex.
// The document has to be self-contained -- the platform PDF renderers do not
// wait for an external stylesheet -- so `var(--ink)` is not available here, but
// "self-contained" means inlining the token VALUE, not inventing a new one.
//
// The light palette on purpose: a CV is printed on white paper, and the dark
// theme's ink would come out as a pale grey nobody can read.
const STYLE = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ${tokens.type.family.body};
    font-size: 11pt;
    line-height: ${tokens.type.scale.body.line};
    color: ${tokens.color.ink.DEFAULT};
  }
  header {
    border-block-end: 2px solid ${tokens.color.ink.muted};
    padding-block-end: 10px;
    margin-block-end: 18px;
  }
  h1 { font-size: 20pt; margin: 0 0 4px; }
  .headline { margin: 0; font-size: 12pt; color: ${tokens.color.ink.muted}; }
  .meta { margin: 6px 0 0; font-size: 10pt; color: ${tokens.color.ink.muted}; }
  h2 { font-size: 12pt; margin: 18px 0 8px; }
  .entry { margin-block-end: 12px; break-inside: avoid; }
  .entry h3 { font-size: 11.5pt; margin: 0; }
  .org { margin: 0; color: ${tokens.color.ink.muted}; }
  .period { margin: 0; font-size: 10pt; color: ${tokens.color.ink.subtle}; }
  .desc { margin: 4px 0 0; }
  ul.plain { margin: 0; padding-inline-start: 18px; }
  ul.chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
  ul.chips li {
    border: 1px solid ${tokens.color.line.hard};
    border-radius: ${tokens.radius.sm}px;
    padding: 2px 8px;
    font-size: 10pt;
  }
  .break { margin: 0; }
`;

export function renderCvHtml(doc: CvDocument): string {
  const t = COPY[doc.locale];
  const dir = doc.locale === "ar" ? "rtl" : "ltr";
  const name = `${doc.firstName} ${doc.lastName}`.trim();
  const meta = [doc.location, doc.website].filter(Boolean).join(" · ");

  const careerBreak = doc.careerBreak
    ? `<section><h2>${escape(t.careerBreak)}</h2><p class="break">${escape(
        period(doc.careerBreak.from, doc.careerBreak.to, t.present),
      )}</p></section>`
    : "";

  return `<!doctype html>
<html lang="${doc.locale}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(name)}</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>${escape(name)}</h1>
  ${doc.headline ? `<p class="headline">${escape(doc.headline)}</p>` : ""}
  ${meta ? `<p class="meta">${escape(meta)}</p>` : ""}
</header>
${doc.about ? `<section><p>${escape(doc.about)}</p></section>` : ""}
${entrySection(t.experience, doc.experiences, t.present)}
${entrySection(t.education, doc.educations, t.present)}
${careerBreak}
${entrySection(t.volunteer, doc.volunteerRoles, t.present)}
${awardSection(t.certificates, doc.certificates)}
${awardSection(t.honors, doc.honors)}
${awardSection(t.publications, doc.publications)}
${chipSection(
  t.languages,
  doc.languages.map((l) => `${l.languageKey} — ${l.proficiency}`),
)}
${chipSection(t.skills, doc.skills)}
</body>
</html>`;
}
