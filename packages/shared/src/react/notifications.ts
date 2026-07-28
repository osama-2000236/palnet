import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClient } from "../api-client";

/**
 * Notification mutations, for both apps. Web and mobile carried this twice,
 * 27 identical lines out of 32.
 */

export const notificationQueryKeys = {
  list: ["notifications", "list"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

export function createNotificationsApi(client: ApiClient) {
  function useDismissNotification() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (notificationId: string) => {
        const token = await client.getValidAccessToken();
        if (!token) throw new Error("AUTH_UNAUTHORIZED");
        return client.apiCall(`/notifications/${notificationId}`, { method: "DELETE", token });
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [...notificationQueryKeys.list] });
        void queryClient.invalidateQueries({ queryKey: [...notificationQueryKeys.unreadCount] });
      },
    });
  }

  return { useDismissNotification };
}
