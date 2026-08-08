import { JobType, PayBasis } from "./enums";
import { belowMinimumWage, formatMinimumWage, minimumWageFloor } from "./minimum-wage";

const fullTimeMonthly = {
  type: JobType.FULL_TIME,
  payBasis: PayBasis.MONTHLY,
  salaryCurrency: "ILS",
};

describe("minimumWageFloor", () => {
  it("binds the monthly floor to full-time work only", () => {
    expect(minimumWageFloor(JobType.FULL_TIME, PayBasis.MONTHLY)).toBe(1880);
    expect(minimumWageFloor(JobType.PART_TIME, PayBasis.MONTHLY)).toBeNull();
    expect(minimumWageFloor(JobType.INTERNSHIP, PayBasis.MONTHLY)).toBeNull();
  });

  it("binds the unit rates regardless of time commitment", () => {
    expect(minimumWageFloor(JobType.DAY_LABOR, PayBasis.DAILY)).toBe(85);
    expect(minimumWageFloor(JobType.PART_TIME, PayBasis.HOURLY)).toBe(10.5);
  });

  it("has no floor for bases the resolution does not set", () => {
    expect(minimumWageFloor(JobType.PIECE_WORK, PayBasis.PER_PIECE)).toBeNull();
    expect(minimumWageFloor(JobType.CONTRACT, PayBasis.PER_JOB)).toBeNull();
    expect(minimumWageFloor(JobType.FREELANCE, PayBasis.COMMISSION)).toBeNull();
  });
});

describe("belowMinimumWage", () => {
  it("flags a range whose top is under the floor", () => {
    expect(belowMinimumWage({ ...fullTimeMonthly, salaryMin: 1200, salaryMax: 1500 })).toBe(true);
  });

  it("does not flag a range whose top clears the floor", () => {
    // 1,500 is unlawful pay, but this offer can still be filled lawfully at
    // the top of its range, so it is not the platform's call to badge it.
    expect(belowMinimumWage({ ...fullTimeMonthly, salaryMin: 1500, salaryMax: 2400 })).toBe(false);
  });

  it("falls back to the single disclosed bound", () => {
    expect(belowMinimumWage({ ...fullTimeMonthly, salaryMax: 1000 })).toBe(true);
    expect(belowMinimumWage({ ...fullTimeMonthly, salaryMin: 1000 })).toBe(true);
    expect(belowMinimumWage({ ...fullTimeMonthly, salaryMin: 4000 })).toBe(false);
  });

  it("never flags undisclosed pay", () => {
    expect(belowMinimumWage(fullTimeMonthly)).toBe(false);
    expect(belowMinimumWage({ ...fullTimeMonthly, salaryMin: null, salaryMax: null })).toBe(false);
  });

  it("flags day labour under 85 a day and by-the-hour work under 10.5", () => {
    expect(
      belowMinimumWage({
        type: JobType.DAY_LABOR,
        payBasis: PayBasis.DAILY,
        salaryMax: 70,
        salaryCurrency: "ILS",
      }),
    ).toBe(true);
    expect(
      belowMinimumWage({
        type: JobType.PART_TIME,
        payBasis: PayBasis.HOURLY,
        salaryMax: 10,
        salaryCurrency: "ILS",
      }),
    ).toBe(true);
  });

  it("does not flag a part-time monthly wage under the full-time floor", () => {
    expect(
      belowMinimumWage({
        type: JobType.PART_TIME,
        payBasis: PayBasis.MONTHLY,
        salaryMax: 1000,
        salaryCurrency: "ILS",
      }),
    ).toBe(false);
  });

  it("does not flag a currency it cannot convert", () => {
    expect(belowMinimumWage({ ...fullTimeMonthly, salaryCurrency: "USD", salaryMax: 300 })).toBe(
      false,
    );
  });

  it("defaults a missing currency to ILS", () => {
    expect(belowMinimumWage({ ...fullTimeMonthly, salaryCurrency: null, salaryMax: 900 })).toBe(
      true,
    );
  });
});

describe("formatMinimumWage", () => {
  it("keeps the hourly half-shekel and drops the others' fraction", () => {
    expect(formatMinimumWage(10.5, "en")).toContain("10.5");
    expect(formatMinimumWage(1880, "en")).toContain("1,880");
  });
});
