import EventSource, { type EventSourceListener } from "react-native-sse";
import type { z } from "zod";

import { API_BASE } from "./api";

const CUSTOM_EVENT_TYPES = [
  "message.new",
  "message.edited",
  "message.deleted",
  "message.read",
  "typing",
  "notification.new",
  "notification.read",
  "notification.unread-count",
] as const;
type CustomEventType = (typeof CUSTOM_EVENT_TYPES)[number];
type DataEvent = { data?: string | null };

interface SubscribeArgs<T extends z.ZodTypeAny> {
  path: string;
  token: string;
  schema: T;
  onEvent: (event: z.infer<T>) => void;
  onError?: (error: Error) => void;
}

export function subscribeSse<T extends z.ZodTypeAny>({
  path,
  token,
  schema,
  onEvent,
  onError,
}: SubscribeArgs<T>): () => void {
  const url = `${API_BASE}${path}?access_token=${encodeURIComponent(token)}`;
  const source = new EventSource<CustomEventType>(url, { pollingInterval: 0 });

  const onMessage = (event: DataEvent) => {
    if (!event.data) return;
    try {
      const payload = JSON.parse(event.data) as unknown;
      onEvent(schema.parse(payload));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Invalid SSE payload"));
    }
  };

  const onFailure: EventSourceListener<CustomEventType> = () => {
    onError?.(new Error(`SSE disconnected: ${path}`));
  };

  source.addEventListener("message", onMessage as EventSourceListener<CustomEventType>);
  source.addEventListener("error", onFailure);
  for (const type of CUSTOM_EVENT_TYPES) {
    source.addEventListener(type, onMessage as EventSourceListener<CustomEventType>);
  }

  return () => {
    source.removeEventListener("message", onMessage as EventSourceListener<CustomEventType>);
    source.removeEventListener("error", onFailure);
    for (const type of CUSTOM_EVENT_TYPES) {
      source.removeEventListener(type, onMessage as EventSourceListener<CustomEventType>);
    }
    source.close();
  };
}
