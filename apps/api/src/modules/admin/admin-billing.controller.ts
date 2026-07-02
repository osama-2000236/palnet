import {
  AdminInvoiceActionBody,
  ErrorCode,
  Invoice,
  type Invoice as InvoiceDto,
} from "@baydar/shared";
import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { z } from "zod";

import { DomainException } from "../../common/domain-exception";
import { ZodValidationPipe } from "../../common/zod-pipe";
import { CurrentUser, type AuthUser } from "../auth/decorators/current-user.decorator";
import { BillingService } from "../billing/billing.service";

const AdminInvoiceListQuery = z.object({
  status: z.enum(["NEEDS_REVIEW", "OPEN", "PAID", "VOID", "ALL"]).default("NEEDS_REVIEW"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
type AdminInvoiceListQuery = z.infer<typeof AdminInvoiceListQuery>;

@ApiTags("admin")
@ApiBearerAuth()
@Controller("admin/billing")
export class AdminBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("invoices")
  async listInvoices(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(AdminInvoiceListQuery)) query: AdminInvoiceListQuery,
  ): Promise<InvoiceDto[]> {
    requireAdmin(user);
    return z.array(Invoice).parse(await this.billing.adminListInvoices(query.status, query.limit));
  }

  @Post("invoices/:invoiceId/action")
  async act(
    @CurrentUser() user: AuthUser,
    @Param("invoiceId") invoiceId: string,
    @Body(new ZodValidationPipe(AdminInvoiceActionBody)) body: AdminInvoiceActionBody,
  ): Promise<InvoiceDto> {
    requireAdmin(user);
    return Invoice.parse(await this.billing.adminInvoiceAction(invoiceId, user.id, body));
  }
}

function requireAdmin(user: AuthUser): void {
  if (user.role === "ADMIN") return;
  throw new DomainException(ErrorCode.AUTH_FORBIDDEN, "Admin role required.", 403);
}
