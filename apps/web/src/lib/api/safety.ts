"use client";

import { createSafetyApi } from "@baydar/shared/react";

import { apiClient } from "@/lib/api";

export {
  safetyQueryKeys,
  type ReportInput,
  // `ReportSubject` upstream: `ReportTarget` is already taken in @baydar/shared
  // by the wire shape this union serialises into.
  type ReportSubject as ReportTarget,
} from "@baydar/shared/react";

export const { useReport, useBlock, useUnblock, useBlockedUsers } = createSafetyApi(apiClient);
