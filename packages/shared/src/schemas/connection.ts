import { z } from "zod";
import { ConnectionStatus } from "../enums";

export const SendConnectionBody = z.object({
  receiverId: z.string().cuid(),
  message: z.string().max(300).optional(),
});
export type SendConnectionBody = z.infer<typeof SendConnectionBody>;

export const RespondConnectionBody = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
});
export type RespondConnectionBody = z.infer<typeof RespondConnectionBody>;

export const Connection = z.object({
  id: z.string().cuid(),
  requesterId: z.string().cuid(),
  receiverId: z.string().cuid(),
  status: z.nativeEnum(ConnectionStatus),
  message: z.string().nullable(),
  createdAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
});
export type Connection = z.infer<typeof Connection>;
