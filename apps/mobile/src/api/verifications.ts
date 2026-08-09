import { createVerificationsApi } from "@baydar/shared/react";

import { apiClient } from "@/lib/api";

export { verificationQueryKeys } from "@baydar/shared/react";

export const {
  useMyVerifications,
  useStartPhoneVerification,
  useConfirmPhoneVerification,
  useStartEmailDomainVerification,
  useConfirmEmailDomainVerification,
  useRequestBodyVerification,
} = createVerificationsApi(apiClient);
