import { z } from "zod";

import { ErrorCode } from "./enums";

export const ApiError = z.object({
  error: z.object({
    code: z.nativeEnum(ErrorCode),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

export const ApiOk = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    data,
    meta: z.record(z.unknown()).optional(),
  });
