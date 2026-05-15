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
import { AccountRetentionService, type RetentionReport } from "../account/account-retention.service";
import { Public } from "../auth/decorators/public.decorator";
import { BillingService } from "../billing/billing.service";
import { KaramaService, type KaramaDecayReport } from "../karama/karama.service";
import { MediaScanService } from "../media/media-scan.service";

const KaramaDecayRunBody = z
  .object({
    dryRun: z.boolean().default(false),
  })
  .default({ dryRun: false });
type KaramaDecayRunBody = z.infer<typeof KaramaDecayRunBody>;

@Controller("admin/internal")
@UseGuards(InternalTokenGuard)
@Public()
export class AdminInternalController {
  constructor(
    private readonly retention: AccountRetentionService,
    private readonly karama: KaramaService,
    private readonly billing: BillingService,
    private readonly mediaScan: MediaScanService,
  ) {}

  @Post("account-retention/run")
  @HttpCode(HttpStatus.OK)
  async runAccountRetention(): Promise<RetentionReport> {
    return this.retention.runRetention();
  }

  @Post("karama-decay/run")
  @HttpCode(HttpStatus.OK)
  async runKaramaDecay(
    @Body(new ZodValidationPipe(KaramaDecayRunBody)) body: KaramaDecayRunBody,
  ): Promise<KaramaDecayReport> {
    return this.karama.runMonthlyDecay({ dryRun: body.dryRun });
  }

  @Post("billing/invoices/:invoiceId/action")
  @HttpCode(HttpStatus.OK)
  async runInvoiceAction(
    @Param("invoiceId") invoiceId: string,
    @Body(new ZodValidationPipe(AdminInvoiceActionBody)) body: AdminInvoiceActionBody,
  ): Promise<InvoiceDto> {
    return Invoice.parse(await this.billing.adminInvoiceAction(invoiceId, body));
  }

  @Post("media/scan")
  @HttpCode(HttpStatus.OK)
  async runMediaScan(
    @Body(new ZodValidationPipe(MediaScanRequest)) body: MediaScanRequest,
  ): Promise<MediaScanResultDto> {
    return MediaScanResult.parse(await this.mediaScan.scanObject(body));
  }
}
