import {
  type CareerBreakBody,
  type Certificate,
  type CertificateBody,
  ErrorCode,
  type Honor,
  type HonorBody,
  type ProfileLanguage,
  type ProfileLanguageBody,
  type ProfileTranslation,
  type ProfileTranslationBody,
  type Publication,
  type PublicationBody,
  type VolunteerRole,
  type VolunteerRoleBody,
} from "@baydar/shared";
import { Injectable } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { PrismaService } from "../prisma/prisma.service";

import { assertTouched, createOwned, removeOwned, updateOwned } from "./owned-rows";
import {
  toCertificateDto,
  toHonorDto,
  toPublicationDto,
  toTranslationDto,
  toVolunteerRoleDto,
} from "./profile-sections.mapper";

/** Optional ISO strings arrive as `string | null | undefined`; Prisma wants `Date | null`. */
const date = (iso: string | null | undefined): Date | null => (iso ? new Date(iso) : null);

const certificateData = (b: CertificateBody) => ({
  name: b.name,
  issuerName: b.issuerName,
  issuerKey: b.issuerKey ?? null,
  credentialId: b.credentialId ?? null,
  credentialUrl: b.credentialUrl ?? null,
  issuedAt: date(b.issuedAt),
  expiresAt: date(b.expiresAt),
});

const volunteerData = (b: VolunteerRoleBody) => ({
  role: b.role,
  organisation: b.organisation,
  causeKey: b.causeKey ?? null,
  startDate: new Date(b.startDate),
  endDate: date(b.endDate),
  description: b.description ?? null,
});

const honorData = (b: HonorBody) => ({
  title: b.title,
  issuerName: b.issuerName,
  awardedAt: date(b.awardedAt),
  description: b.description ?? null,
});

const publicationData = (b: PublicationBody) => ({
  title: b.title,
  venue: b.venue ?? null,
  url: b.url ?? null,
  publishedAt: date(b.publishedAt),
});

@Injectable()
export class ProfileSectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The owning profile, or a 400 telling them to finish onboarding.
   *
   * Every write below is scoped through this rather than trusting the id in the
   * path: `PUT /profiles/me/honors/:id` with somebody else's id is the first
   * thing anybody tries, and one lookup here closes it for all of them.
   */
  private async profileId(userId: string): Promise<string> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) {
      throw new DomainException(
        ErrorCode.PROFILE_ONBOARDING_REQUIRED,
        "Complete your profile first.",
        400,
      );
    }
    return profile.id;
  }

  // ──────────────── Certificates ────────────────

  async addCertificate(userId: string, body: CertificateBody): Promise<Certificate> {
    const profileId = await this.profileId(userId);
    return createOwned(this.prisma.certificate, profileId, certificateData(body), toCertificateDto);
  }

  async updateCertificate(userId: string, id: string, body: CertificateBody): Promise<Certificate> {
    const profileId = await this.profileId(userId);
    return updateOwned(
      this.prisma.certificate,
      profileId,
      id,
      certificateData(body),
      toCertificateDto,
    );
  }

  async removeCertificate(userId: string, id: string): Promise<void> {
    await removeOwned(this.prisma.certificate, await this.profileId(userId), id);
  }

  // ──────────────── Volunteering ────────────────

  async addVolunteerRole(userId: string, body: VolunteerRoleBody): Promise<VolunteerRole> {
    const profileId = await this.profileId(userId);
    return createOwned(
      this.prisma.volunteerRole,
      profileId,
      volunteerData(body),
      toVolunteerRoleDto,
    );
  }

  async updateVolunteerRole(
    userId: string,
    id: string,
    body: VolunteerRoleBody,
  ): Promise<VolunteerRole> {
    const profileId = await this.profileId(userId);
    return updateOwned(
      this.prisma.volunteerRole,
      profileId,
      id,
      volunteerData(body),
      toVolunteerRoleDto,
    );
  }

  async removeVolunteerRole(userId: string, id: string): Promise<void> {
    await removeOwned(this.prisma.volunteerRole, await this.profileId(userId), id);
  }

  // ──────────────── Honors ────────────────

  async addHonor(userId: string, body: HonorBody): Promise<Honor> {
    return createOwned(
      this.prisma.honor,
      await this.profileId(userId),
      honorData(body),
      toHonorDto,
    );
  }

  async updateHonor(userId: string, id: string, body: HonorBody): Promise<Honor> {
    const profileId = await this.profileId(userId);
    return updateOwned(this.prisma.honor, profileId, id, honorData(body), toHonorDto);
  }

  async removeHonor(userId: string, id: string): Promise<void> {
    await removeOwned(this.prisma.honor, await this.profileId(userId), id);
  }

  // ──────────────── Publications ────────────────

  async addPublication(userId: string, body: PublicationBody): Promise<Publication> {
    const profileId = await this.profileId(userId);
    return createOwned(this.prisma.publication, profileId, publicationData(body), toPublicationDto);
  }

  async updatePublication(userId: string, id: string, body: PublicationBody): Promise<Publication> {
    const profileId = await this.profileId(userId);
    return updateOwned(
      this.prisma.publication,
      profileId,
      id,
      publicationData(body),
      toPublicationDto,
    );
  }

  async removePublication(userId: string, id: string): Promise<void> {
    await removeOwned(this.prisma.publication, await this.profileId(userId), id);
  }

  // ──────────────── Languages ────────────────

  /**
   * Upsert by key: re-adding a language changes the level rather than producing
   * a second row somebody has to notice and delete. This is why the table is
   * keyed on (profile, language) and has no id of its own.
   */
  async setLanguage(userId: string, body: ProfileLanguageBody): Promise<ProfileLanguage> {
    const profileId = await this.profileId(userId);
    const row = await this.prisma.profileLanguage.upsert({
      where: { profileId_languageKey: { profileId, languageKey: body.languageKey } },
      create: { profileId, languageKey: body.languageKey, proficiency: body.proficiency },
      update: { proficiency: body.proficiency },
    });
    return { languageKey: row.languageKey, proficiency: row.proficiency };
  }

  async removeLanguage(userId: string, languageKey: string): Promise<void> {
    const profileId = await this.profileId(userId);
    const { count } = await this.prisma.profileLanguage.deleteMany({
      where: { profileId, languageKey },
    });
    assertTouched(count);
  }

  // ──────────────── Translation, career break ────────────────

  async setTranslation(
    userId: string,
    locale: string,
    body: ProfileTranslationBody,
  ): Promise<ProfileTranslation> {
    // Only English, and only for now. A second Arabic "translation" would be a
    // second profile, which is a moderation problem rather than a feature.
    if (locale !== "en") {
      throw new DomainException(ErrorCode.VALIDATION_FAILED, "Unsupported locale.", 400);
    }
    const profileId = await this.profileId(userId);
    const data = {
      firstName: body.firstName,
      lastName: body.lastName,
      headline: body.headline ?? null,
      about: body.about ?? null,
    };
    const row = await this.prisma.profileTranslation.upsert({
      where: { profileId_locale: { profileId, locale } },
      create: { profileId, locale, ...data },
      update: data,
    });
    return toTranslationDto(row);
  }

  async removeTranslation(userId: string, locale: string): Promise<void> {
    const profileId = await this.profileId(userId);
    await this.prisma.profileTranslation.deleteMany({ where: { profileId, locale } });
  }

  /**
   * Name the gap, or clear it.
   *
   * `null` clears every field at once — somebody returning to work should not
   * have to remember which of three columns made the section appear.
   */
  async setCareerBreak(userId: string, body: CareerBreakBody | null): Promise<void> {
    await this.prisma.profile.update({
      where: { userId },
      data: body
        ? {
            careerBreakFrom: new Date(body.from),
            careerBreakTo: date(body.to),
            careerBreakReason: body.reason,
          }
        : { careerBreakFrom: null, careerBreakTo: null, careerBreakReason: null },
    });
  }
}
