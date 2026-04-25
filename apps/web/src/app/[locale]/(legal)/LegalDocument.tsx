import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { Surface } from "@palnet/ui-web";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n";

export type LegalSlug = "terms" | "privacy" | "community";

const fileBySlug: Record<LegalSlug, string> = {
  terms: "terms",
  privacy: "privacy",
  community: "community",
};

// Tiny Markdown → JSX renderer for legal docs. Supports `## headings` and
// blank-line-separated paragraphs only. We avoid next-mdx-remote because its
// RSC bundle ships a React Element identity that mismatches Next 15's React
// runtime, causing "React Element from an older version" prerender errors.
// Legal copy is plain prose; we don't need MDX.
function renderLegalMarkdown(source: string): JSX.Element[] {
  // Strip MDX-style comments {/* ... */} and HTML comments <!-- ... -->.
  const stripped = source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();

  const blocks = stripped.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} className="text-ink mt-6 text-xl font-semibold first:mt-0">
          {trimmed.slice(3).trim()}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={i} className="text-ink mt-6 text-2xl font-bold first:mt-0">
          {trimmed.slice(2).trim()}
        </h1>
      );
    }
    return (
      <p key={i} className="text-ink mt-3 text-sm leading-relaxed first:mt-0">
        {trimmed}
      </p>
    );
  });
}

export async function LegalDocument({
  locale,
  slug,
}: {
  locale: Locale;
  slug: LegalSlug;
}): Promise<JSX.Element> {
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const source = await readFile(
    join(process.cwd(), "src", "content", "legal", `${fileBySlug[slug]}.${locale}.mdx`),
    "utf8",
  );

  return (
    <main className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-6 py-10">
      <Surface variant="hero" padding="8" as="header">
        <p className="text-ink-muted text-sm font-semibold">{t("eyebrow")}</p>
        <h1 className="text-ink mt-2 text-4xl font-bold">{t(`${slug}.title`)}</h1>
        <p className="text-ink-muted mt-3 text-sm">{t("lastUpdated")}</p>
      </Surface>
      <Surface variant="flat" padding="8" className="legal-copy">
        {renderLegalMarkdown(source)}
      </Surface>
    </main>
  );
}
