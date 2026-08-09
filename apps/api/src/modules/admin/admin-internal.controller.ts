import {
  AdminInvoiceActionBody,
  Invoice,
  MediaScanRequest,
  MediaScanResult,
  type Invoice as InvoiceDto,
  type MediaScanResult as MediaScanResultDto,
} from "@baydar/shared";
import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";

import { InternalTokenGuard } from "../../common/internal-token.guard";
import { ZodValidationPipe } from "../../common/zod-pipe";
import {
  AccountRetentionService,
  type RetentionReport,
} from "../account/account-retention.service";
import { SecondDegreeService, type SecondDegreeReport } from "../discovery/second-degree.service";
import { Public } from "../auth/decorators/public.decorator";
import { BillingService } from "../billing/billing.service";
import { KaramaService, type KaramaDecayReport } from "../karama/karama.service";
import { MediaScanService } from "../media/media-scan.service";

const InternalDryRunBody = z
  .object({
    dryRun: z.boolean().default(false),
  })
  .default({ dryRun: false });
type InternalDryRunBody = z.infer<typeof InternalDryRunBody>;

@Controller("admin/internal")
@UseGuards(InternalTokenGuard)
@Public()
export class AdminInternalController {
  constructor(
    private readonly retention: AccountRetentionService,
    private readonly karama: KaramaService,
    private readonly billing: BillingService,
    private readonly mediaScan: MediaScanService,
    private readonly secondDegree: SecondDegreeService,
  ) {}

  @Post("account-retention/run")
  @HttpCode(HttpStatus.OK)
  async runAccountRetention(
    @Body(new ZodValidationPipe(InternalDryRunBody)) body: InternalDryRunBody,
  ): Promise<RetentionReport> {
    return this.retention.runRetention({ dryRun: body.dryRun });
  }

  /**
   * Rebuild the second-degree table. Nightly.
   *
   * Whole-table replace rather than incremental: a member who disconnected has
   * to disappear, and there is no delete event to hang that on.
   */
  @Post("second-degree/refresh")
  @HttpCode(HttpStatus.OK)
  async refreshSecondDegree(
    @Body(new ZodValidationPipe(InternalDryRunBody)) body: InternalDryRunBody,
  ): Promise<SecondDegreeReport> {
    return this.secondDegree.refresh({ dryRun: body.dryRun });
  }

  @Post("karama-decay/run")
  @HttpCode(HttpStatus.OK)
  async runKaramaDecay(
    @Body(new ZodValidationPipe(InternalDryRunBody)) body: InternalDryRunBody,
  ): Promise<KaramaDecayReport> {
    return this.karama.runMonthlyDecay({ dryRun: body.dryRun });
  }

  @Post("billing/invoices/:invoiceId/action")
  @HttpCode(HttpStatus.OK)
  async runInvoiceAction(
    @Param("invoiceId") invoiceId: string,
    @Body(new ZodValidationPipe(AdminInvoiceActionBody)) body: AdminInvoiceActionBody,
  ): Promise<InvoiceDto> {
    // Token-authenticated automation path — no operator identity available.
    return Invoice.parse(await this.billing.adminInvoiceAction(invoiceId, "system:internal", body));
  }

  @Post("media/scan")
  @HttpCode(HttpStatus.OK)
  async runMediaScan(
    @Body(new ZodValidationPipe(MediaScanRequest)) body: MediaScanRequest,
  ): Promise<MediaScanResultDto> {
    return MediaScanResult.parse(await this.mediaScan.scanObject(body));
  }
}
