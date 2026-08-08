// The Palestinian statutory minimum wage, and the one check that reads it.
//
// Council of Ministers Resolution No. 4 of 2021, in force since the start of
// 2022, sets three figures and no others. There is no statutory floor for
// per-job, per-piece or commission work, so those bases cannot be checked and
// are never flagged.
//
// Deliberately a pure function over fields the job already carries, with no
// stored column behind it: the floor is a number in a resolution that will be
// amended, and a flag written at post time would then be wrong for every row
// posted before the amendment. Computing it at render time cannot drift.

import { JobType, PayBasis } from "./enums";
import { formatCurrency } from "./format";

export const MINIMUM_WAGE_ILS: Partial<Record<PayBasis, number>> = {
  [PayBasis.MONTHLY]: 1880,
  [PayBasis.DAILY]: 85,
  [PayBasis.HOURLY]: 10.5,
};

/**
 * The floor that binds this job, or `null` when none does.
 *
 * The monthly figure assumes a full working month, so it binds on full-time
 * work only — a part-time monthly wage under 1,880 is lawful and flagging it
 * would be a false accusation. The daily and hourly figures are unit rates and
 * bind on any engagement paid that way, which is what makes them the ones that
 * matter for day labour.
 */
export function minimumWageFloor(type: JobType, payBasis: PayBasis): number | null {
  const floor = MINIMUM_WAGE_ILS[payBasis];
  if (floor === undefined) return null;
  if (payBasis === PayBasis.MONTHLY && type !== JobType.FULL_TIME) return null;
  return floor;
}

export interface MinimumWageCheck {
  type: JobType;
  payBasis: PayBasis;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
}

/**
 * Whether an advertised pay range falls below the statutory floor.
 *
 * Compares the TOP of the range: if the most the employer will pay is under
 * the floor then nobody hired can be paid lawfully, whereas a range whose
 * bottom is under it but whose top clears it can still be filled legally.
 *
 * Undisclosed pay is never flagged. Hiding the number is a separate problem
 * and this is not the check that solves it.
 */
export function belowMinimumWage(job: MinimumWageCheck): boolean {
  // ponytail: ILS only. Converting JOD/USD/EUR needs the PMA reference rate,
  // and the FX service is server-side while this runs on the client against
  // the job DTO. If non-ILS postings ever matter, convert at write time in
  // companies.service and put the result on the DTO.
  if ((job.salaryCurrency ?? "ILS") !== "ILS") return false;
  const floor = minimumWageFloor(job.type, job.payBasis);
  if (floor === null) return false;
  const top = job.salaryMax ?? job.salaryMin;
  return typeof top === "number" && top < floor;
}

/**
 * The floor as money for display. Keeps the hourly rate's half-shekel — the
 * shared currency formatter rounds to whole units by default, which would
 * state the legal minimum as 11 ILS.
 */
export function formatMinimumWage(floor: number, locale: string): string {
  return formatCurrency(floor, "ILS", locale, {
    maximumFractionDigits: Number.isInteger(floor) ? 0 : 1,
  });
}
