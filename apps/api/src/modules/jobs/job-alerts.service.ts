import {
  type CreateJobAlertBody,
  ErrorCode,
  foldArabic,
  JOB_ALERTS_MAX_PER_USER,
  type JobAlert as JobAlertDto,
  NotificationType,
} from "@baydar/shared";
import { Injectable, Logger } from "@nestjs/common";

import { DomainException } from "../../common/domain-exception";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

interface JobAlertRow {
  id: string;
  userId: string;
  q: string | null;
  city: string | null;
  type: JobAlertDto["type"];
  locationMode: JobAlertDto["locationMode"];
  industry: string | null;
  createdAt: Date;
}

export interface AlertableJob {
  id: string;
  title: string;
  description: string;
  city: string | null;
  type: string;
  locationMode: string;
  // Null when an individual posted the work rather than a business.
  companyId: string | null;
  postedById: string;
}

@Injectable()
export class JobAlertsService {
  private readonly log = new Logger(JobAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(userId: string): Promise<JobAlertDto[]> {
    const rows = (await this.prisma.jobAlert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })) as JobAlertRow[];
    return rows.map(toDto);
  }

  async create(userId: string, body: CreateJobAlertBody): Promise<JobAlertDto> {
    const count = await this.prisma.jobAlert.count({ where: { userId } });
    if (count >= JOB_ALERTS_MAX_PER_USER) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        `At most ${JOB_ALERTS_MAX_PER_USER} job alerts per user.`,
        400,
      );
    }
    const row = (await this.prisma.jobAlert.create({
      data: {
        userId,
        q: body.q ?? null,
        city: body.city ?? null,
        type: body.type ?? null,
        locationMode: body.locationMode ?? null,
        industry: body.industry ?? null,
      },
    })) as JobAlertRow;
    return toDto(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    const res = await this.prisma.jobAlert.deleteMany({ where: { id, userId } });
    if (res.count === 0) {
      throw new DomainException(ErrorCode.NOT_FOUND, "Job alert not found.", 404);
    }
  }

  /**
   * Fan out JOB_ALERT notifications for a freshly published job. Called
   * fire-and-forget from job creation — a fanout failure must never fail the
   * employer's request.
   *
   * ponytail: full in-code scan of the alert table per new job; fine at beta
   * scale, move the matching into SQL when alerts reach thousands.
   */
  async notifyMatches(job: AlertableJob): Promise<void> {
    try {
      const [alerts, company] = await Promise.all([
        this.prisma.jobAlert.findMany({
          where: { userId: { not: job.postedById } },
        }) as Promise<JobAlertRow[]>,
        // An individual-posted job has no company, so it has no industry to
        // match an `industry` alert against — and that is the correct outcome:
        // such an alert should not fire on it rather than fire on everything.
        job.companyId
          ? this.prisma.company.findUnique({
              where: { id: job.companyId },
              select: { industry: true },
            })
          : Promise.resolve(null),
      ]);
      if (alerts.length === 0) return;

      const industry = fold(company?.industry ?? "");
      const haystack = fold(`${job.title} ${job.description}`);
      const city = fold(job.city ?? "");

      // One notification per user even if several of their alerts match.
      const matched = new Set<string>();
      for (const alert of alerts) {
        if (matched.has(alert.userId)) continue;
        if (alertMatches(alert, job, { haystack, city, industry })) {
          matched.add(alert.userId);
        }
      }

      await Promise.all(
        [...matched].map((recipientId) =>
          this.notifications.notify({
            type: NotificationType.JOB_ALERT,
            recipientId,
            jobId: job.id,
            data: { jobTitle: job.title },
            dedupe: true,
          }),
        ),
      );
    } catch (err) {
      this.log.warn(`Job alert fanout failed for job=${job.id}: ${(err as Error).message}`);
    }
  }
}

function fold(value: string): string {
  return foldArabic(value.toLowerCase());
}

export function alertMatches(
  alert: Pick<JobAlertRow, "q" | "city" | "type" | "locationMode" | "industry">,
  job: Pick<AlertableJob, "type" | "locationMode">,
  folded: { haystack: string; city: string; industry: string },
): boolean {
  if (alert.type && alert.type !== job.type) return false;
  if (alert.locationMode && alert.locationMode !== job.locationMode) return false;
  if (alert.city && !folded.city.includes(fold(alert.city))) return false;
  if (alert.industry && !folded.industry.includes(fold(alert.industry))) return false;
  if (alert.q && !folded.haystack.includes(fold(alert.q))) return false;
  return true;
}

function toDto(row: JobAlertRow): JobAlertDto {
  return {
    id: row.id,
    q: row.q,
    city: row.city,
    type: row.type,
    locationMode: row.locationMode,
    industry: row.industry,
    createdAt: row.createdAt.toISOString(),
  };
}
