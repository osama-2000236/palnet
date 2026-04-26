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

// Tiny Markdown → JSX renderer for legal docs. Supports headings,
// blank-line-separated paragraphs, grouped lists, and safe links. We avoid next-mdx-remote because its
// RSC bundle ships a React Element identity that mismatches Next 15's React
// runtime, causing "React Element from an older version" prerender errors.
// Legal copy is plain prose; we don't need MDX.
function renderLegalMarkdown(source: string): JSX.Element[] {
  const stripped = source.replace(/<!--[\s\S]*?-->/g, "").trim();

  const blocks = stripped.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    const lines = trimmed.split("\n").map((line) => line.trim());
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={i} className="text-ink mt-6 text-xl font-semibold first:mt-0">
          {renderInlineMarkdown(trimmed.slice(3).trim(), `h2-${i}`)}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={i} className="text-ink mt-6 text-2xl font-bold first:mt-0">
          {renderInlineMarkdown(trimmed.slice(2).trim(), `h1-${i}`)}
        </h1>
      );
    }
    if (lines.every((line) => line.startsWith("- "))) {
      return (
        <ul
          key={i}
          className="text-ink mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed first:mt-0"
        >
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>
              {renderInlineMarkdown(line.slice(2).trim(), `ul-${i}-${lineIndex}`)}
            </li>
          ))}
        </ul>
      );
    }
    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      return (
        <ol
          key={i}
          className="text-ink mt-3 list-decimal space-y-2 ps-5 text-sm leading-relaxed first:mt-0"
        >
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>
              {renderInlineMarkdown(line.replace(/^\d+\.\s+/, ""), `ol-${i}-${lineIndex}`)}
            </li>
          ))}
        </ol>
      );
    }
    return (
      <p key={i} className="text-ink mt-3 text-sm leading-relaxed first:mt-0">
        {renderInlineMarkdown(lines.join(" "), `p-${i}`)}
      </p>
    );
  });
}

function renderInlineMarkdown(text: string, keyPrefix: string): Array<string | JSX.Element> {
  const nodes: Array<string | JSX.Element> = [];
  const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const label = match[1] ?? "";
    const href = sanitizeLegalHref(match[2] ?? "");
    nodes.push(
      href ? (
        <a
          key={`${keyPrefix}-${match.index}`}
          href={href}
          className="text-brand-700 underline underline-offset-2"
        >
          {label}
        </a>
      ) : (
        match[0]
      ),
    );
    lastIndex = linkPattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function sanitizeLegalHref(rawHref: string): string | null {
  try {
    const url = new URL(rawHref, "https://baydar.local");
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.origin === "https://baydar.local") return `${url.pathname}${url.search}${url.hash}`;
    return url.href;
  } catch {
    return null;
  }
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
    join(process.cwd(), "src", "content", "legal", `${fileBySlug[slug]}.${locale}.md`),
    "utf8",
  );

  return (
    <main className="max-w-legal mx-auto flex w-full flex-col gap-6 px-6 py-10">
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
