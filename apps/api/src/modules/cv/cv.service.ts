import { ErrorCode, localeTag } from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { renderCvHtml, type CvDocument } from "./cv-template";

// One CV document, assembled on the server.
//
// It replaces a client-side page that fetched the profile, laid it out in
// React, and relied on the browser's print dialog. Two problems with that: the
// mobile app has no print dialog, and a CV assembled from six client fetches on
// a 2G connection is a CV that renders half-finished.
//
// What the server does NOT do is produce the PDF bytes. See GAP-09 — the only
// two ways to do that are a headless browser on the API host or a PDF library
// that cannot shape Arabic, and unshaped Arabic in a CV is worse than no CV.
// The platform renderer does the shaping: `window.print()` on web,
// `expo-print` on mobile, both fed this exact document.

@Injectable()
export class CvService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Only the member's own CV.
   *
   * A CV is the most complete thing on the platform — every job, every date,
   * every school in one downloadable file — and a route that would render
   * anybody's on demand is a scraper's favourite endpoint.
   */
  async render(handle: string, viewerId: string, locale: string): Promise<string> {
    const profile = await this.prisma.profile.findUnique({
      where: { handle },
      include: {
        experiences: { orderBy: { startDate: "desc" } },
        educations: { orderBy: { startDate: "desc" } },
        skills: { include: { skill: true } },
        certificates: { orderBy: { issuedAt: "desc" } },
        languages: true,
        volunteerRoles: { orderBy: { startDate: "desc" } },
        honors: { orderBy: { awardedAt: "desc" } },
        publications: { orderBy: { publishedAt: "desc" } },
        translations: true,
        claims: { orderBy: { isPrimary: "desc" } },
      },
    });
    if (!profile) throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    if (profile.userId !== viewerId) {
      // 404, not 403: whether a handle exists is not worth confirming to
      // somebody enumerating them.
      throw new DomainException(ErrorCode.NOT_FOUND, "Not found.", 404);
    }

    const tag = localeTag(locale);
    const english = tag.startsWith("en");
    // The member wrote the English version themselves. A machine translation of
    // a headline in a hiring context is worse than having none.
    const translation = english ? profile.translations.find((t) => t.locale === "en") : undefined;

    const document: CvDocument = {
      locale: english ? "en" : "ar",
      firstName: translation?.firstName ?? profile.firstName,
      lastName: translation?.lastName ?? profile.lastName,
      headline: translation?.headline ?? profile.headline,
      about: translation?.about ?? profile.about,
      location: profile.location,
      website: profile.website,
      occupations: profile.claims.map((c) => c.occupationKey),
      experiences: profile.experiences.map((e) => ({
        title: e.title,
        organisation: e.companyName,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description,
      })),
      educations: profile.educations.map((e) => ({
        title: [e.degree, e.fieldOfStudy].filter(Boolean).join(" — ") || e.school,
        organisation: e.school,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description,
      })),
      volunteerRoles: profile.volunteerRoles.map((v) => ({
        title: v.role,
        organisation: v.organisation,
        startDate: v.startDate,
        endDate: v.endDate,
        description: v.description,
      })),
      certificates: profile.certificates.map((c) => ({
        name: c.name,
        issuerName: c.issuerName,
        issuedAt: c.issuedAt,
      })),
      honors: profile.honors.map((h) => ({
        name: h.title,
        issuerName: h.issuerName,
        issuedAt: h.awardedAt,
      })),
      publications: profile.publications.map((p) => ({
        name: p.title,
        issuerName: p.venue ?? "",
        issuedAt: p.publishedAt,
      })),
      languages: profile.languages.map((l) => ({
        languageKey: l.languageKey,
        proficiency: l.proficiency,
      })),
      skills: profile.skills.map((s) => s.skill.name),
      careerBreak: profile.careerBreakFrom
        ? {
            from: profile.careerBreakFrom,
            to: profile.careerBreakTo,
            reason: profile.careerBreakReason,
          }
        : null,
    };

    return renderCvHtml(document);
  }
}
