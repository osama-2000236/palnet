import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { ErrorCode } from "@palnet/shared";
import type { ZodTypeAny } from "zod";

// Apply with @UsePipes(new ZodValidationPipe(MySchema)) or per-param via a decorator factory.
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: {
          code: ErrorCode.VALIDATION_FAILED,
          message: "Request validation failed.",
          details: result.error.flatten(),
        },
      });
    }
    return result.data;
  }
}
