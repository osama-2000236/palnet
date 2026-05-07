"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiCall } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

export const notificationQueryKeys = {
  list: ["notifications", "list"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
};

function token(): string {
  const value = getAccessToken();
  if (!value) throw new Error("AUTH_UNAUTHORIZED");
  return value;
}

export function useDismissNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string) =>
      apiCall(`/notifications/${notificationId}`, {
        method: "DELETE",
        token: token(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...notificationQueryKeys.list] });
      void queryClient.invalidateQueries({ queryKey: [...notificationQueryKeys.unreadCount] });
    },
  });
}
