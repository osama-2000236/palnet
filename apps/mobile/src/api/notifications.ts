import { createNotificationsApi } from "@baydar/shared/react";

import { apiClient } from "@/lib/api";

export { notificationQueryKeys } from "@baydar/shared/react";

export const { useDismissNotification } = createNotificationsApi(apiClient);
