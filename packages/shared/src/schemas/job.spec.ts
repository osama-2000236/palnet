import { ApplicationStatus, RejectionReason } from "../enums";
import { UpdateApplicationStatusBody } from "./job";

describe("UpdateApplicationStatusBody", () => {
  it("refuses a rejection with no reason", () => {
    const parsed = UpdateApplicationStatusBody.safeParse({
      status: ApplicationStatus.REJECTED,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("REJECTION_REASON_REQUIRED");
  });

  it("accepts a rejection with a reason", () => {
    expect(
      UpdateApplicationStatusBody.safeParse({
        status: ApplicationStatus.REJECTED,
        rejectionReason: RejectionReason.POSITION_FILLED,
      }).success,
    ).toBe(true);
  });

  it("refuses OTHER with no note — 'other' on its own tells the applicant nothing", () => {
    const parsed = UpdateApplicationStatusBody.safeParse({
      status: ApplicationStatus.REJECTED,
      rejectionReason: RejectionReason.OTHER,
    });
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe("REJECTION_NOTE_REQUIRED");
  });

  it("accepts OTHER with a note", () => {
    expect(
      UpdateApplicationStatusBody.safeParse({
        status: ApplicationStatus.REJECTED,
        rejectionReason: RejectionReason.OTHER,
        rejectionNote: "الوظيفة تحوّلت إلى دوام جزئي",
      }).success,
    ).toBe(true);
  });

  it("refuses a whitespace-only note", () => {
    expect(
      UpdateApplicationStatusBody.safeParse({
        status: ApplicationStatus.REJECTED,
        rejectionReason: RejectionReason.OTHER,
        rejectionNote: "   ",
      }).success,
    ).toBe(false);
  });

  it("leaves every other transition alone", () => {
    for (const status of [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.REVIEWING,
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.HIRED,
      ApplicationStatus.WITHDRAWN,
    ]) {
      expect(UpdateApplicationStatusBody.safeParse({ status }).success).toBe(true);
    }
  });
});
