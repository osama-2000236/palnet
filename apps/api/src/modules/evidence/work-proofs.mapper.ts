import type { WorkProof, WorkProofCounterparty } from "@baydar/shared";

// Rows as Prisma returns them, hand-rolled — the api package does not compile
// against the generated client types.

export interface WorkProofRow {
  id: string;
  workerId: string;
  clientUserId: string | null;
  clientCompanyId: string | null;
  clientPhoneHash: string | null;
  occupationKey: string;
  jobId: string | null;
  applicationId: string | null;
  city: string | null;
  summary: string | null;
  status: WorkProof["status"];
  completedAt: Date | null;
  confirmExpiresAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
  clientUser: {
    id: string;
    profile: { firstName: string; lastName: string; avatarUrl: string | null } | null;
  } | null;
  clientCompany: { id: string; name: string; logoUrl: string | null } | null;
}

export const workProofInclude = {
  clientUser: {
    select: {
      id: true,
      profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
    },
  },
  clientCompany: { select: { id: true, name: true, logoUrl: true } },
} as const;

/**
 * Who confirmed, in a shape the UI can render.
 *
 * The PHONE case is deliberately anonymous. The number is stored as a hash and
 * never comes back out — a client who is not on Baydar did not agree to appear
 * on it, and «عميل خارج المنصّة» is the honest label for what is known.
 */
function toCounterparty(row: WorkProofRow): WorkProofCounterparty {
  if (row.clientUser) {
    const name = row.clientUser.profile
      ? `${row.clientUser.profile.firstName} ${row.clientUser.profile.lastName}`.trim()
      : null;
    return {
      kind: "USER",
      id: row.clientUser.id,
      name,
      avatarUrl: row.clientUser.profile?.avatarUrl ?? null,
    };
  }
  if (row.clientCompany) {
    return {
      kind: "COMPANY",
      id: row.clientCompany.id,
      name: row.clientCompany.name,
      avatarUrl: row.clientCompany.logoUrl,
    };
  }
  return { kind: "PHONE", id: null, name: null, avatarUrl: null };
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function toWorkProofDto(row: WorkProofRow): WorkProof {
  return {
    id: row.id,
    workerId: row.workerId,
    counterparty: toCounterparty(row),
    occupationKey: row.occupationKey,
    jobId: row.jobId,
    applicationId: row.applicationId,
    city: row.city,
    summary: row.summary,
    status: row.status,
    completedAt: iso(row.completedAt),
    confirmExpiresAt: iso(row.confirmExpiresAt),
    confirmedAt: iso(row.confirmedAt),
    createdAt: row.createdAt.toISOString(),
  };
}
