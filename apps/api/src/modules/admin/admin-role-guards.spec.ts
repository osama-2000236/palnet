import { ErrorCode } from "@baydar/shared";

import type { AuthUser } from "../auth/decorators/current-user.decorator";
import type { BillingService } from "../billing/billing.service";

import { AdminBillingController } from "./admin-billing.controller";
import { AdminModerationController } from "./admin-moderation.controller";
import type { AdminModerationService } from "./admin-moderation.service";

// Operator role matrix: every admin endpoint must reject callers below the
// required role before touching the service layer.

function user(role: AuthUser["role"]): AuthUser {
  return {
    id: `u_${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@baydar.ps`,
    role,
    locale: "ar-PS",
  };
}

describe("admin role guards", () => {
  describe("AdminModerationController (ADMIN or MODERATOR)", () => {
    const moderation = {
      listReports: jest.fn().mockResolvedValue([]),
      getReport: jest.fn().mockResolvedValue({ id: "r_1" }),
      act: jest.fn().mockResolvedValue({ id: "r_1" }),
    };
    const controller = new AdminModerationController(
      moderation as unknown as AdminModerationService,
    );

    beforeEach(() => jest.clearAllMocks());

    it.each(["USER", "COMPANY_ADMIN"] as const)("rejects %s on every endpoint", async (role) => {
      const caller = user(role);
      await expect(
        controller.listReports(caller, { status: "open", limit: 50 }),
      ).rejects.toMatchObject({ code: ErrorCode.AUTH_FORBIDDEN });
      await expect(controller.getReport(caller, "r_1")).rejects.toMatchObject({
        code: ErrorCode.AUTH_FORBIDDEN,
      });
      await expect(controller.act(caller, "r_1", { action: "DISMISS" })).rejects.toMatchObject({
        code: ErrorCode.AUTH_FORBIDDEN,
      });
      expect(moderation.listReports).not.toHaveBeenCalled();
      expect(moderation.getReport).not.toHaveBeenCalled();
      expect(moderation.act).not.toHaveBeenCalled();
    });

    it.each(["MODERATOR", "ADMIN"] as const)("admits %s", async (role) => {
      const caller = user(role);
      await controller.listReports(caller, { status: "open", limit: 50 });
      await controller.act(caller, "r_1", { action: "DISMISS" });
      expect(moderation.listReports).toHaveBeenCalled();
      expect(moderation.act).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: caller.id, reportId: "r_1", action: "DISMISS" }),
      );
    });
  });

  describe("AdminBillingController (ADMIN only)", () => {
    const billing = {
      adminListInvoices: jest.fn().mockResolvedValue([]),
      adminInvoiceAction: jest.fn(),
    };
    const controller = new AdminBillingController(billing as unknown as BillingService);

    beforeEach(() => jest.clearAllMocks());

    it.each(["USER", "COMPANY_ADMIN", "MODERATOR"] as const)(
      "rejects %s on every endpoint",
      async (role) => {
        const caller = user(role);
        await expect(
          controller.listInvoices(caller, { status: "NEEDS_REVIEW", limit: 50 }),
        ).rejects.toMatchObject({ code: ErrorCode.AUTH_FORBIDDEN });
        await expect(
          controller.act(caller, "inv-1", { action: "MARK_PAID" }),
        ).rejects.toMatchObject({ code: ErrorCode.AUTH_FORBIDDEN });
        expect(billing.adminListInvoices).not.toHaveBeenCalled();
        expect(billing.adminInvoiceAction).not.toHaveBeenCalled();
      },
    );

    it("admits ADMIN and forwards the acting operator id", async () => {
      const caller = user("ADMIN");
      const invoiceDto = {
        id: "clzzzzzzzzzzzzzzzzzzzzzzz",
        subscriptionId: null,
        planId: null,
        userId: null,
        companyId: null,
        amountCents: 500,
        currency: "USD",
        status: "VOID",
        method: "BANK_TRANSFER",
        providerInvoiceId: null,
        bankReceiptUrl: null,
        dueAt: null,
        paidAt: null,
        pdfUrl: null,
        reviewedAt: "2026-07-02T00:00:00.000Z",
        reviewNote: "receipt unreadable",
        createdAt: "2026-07-01T00:00:00.000Z",
      };
      billing.adminInvoiceAction.mockResolvedValue(invoiceDto);

      const result = await controller.act(caller, "inv-1", {
        action: "VOID",
        note: "receipt unreadable",
      });

      expect(billing.adminInvoiceAction).toHaveBeenCalledWith("inv-1", caller.id, {
        action: "VOID",
        note: "receipt unreadable",
      });
      expect(result.reviewNote).toBe("receipt unreadable");
    });
  });
});
