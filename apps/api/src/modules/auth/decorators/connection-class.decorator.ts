import { CONNECTION_HEADER, connectionClassFromHeader, type ConnectionClass } from "@baydar/shared";
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/**
 * The client's `X-Baydar-Connection` hint.
 *
 * A hint, never a security boundary: it picks an image variant and a default
 * page size and nothing else, so a forged value costs the forger bandwidth and
 * costs Baydar nothing. Anything unparseable falls to `moderate` rather than
 * throwing — turning a payload optimisation into a 400 would be a
 * self-inflicted outage on the connections least able to retry.
 */
export const Connection = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ConnectionClass => {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const raw = request.headers[CONNECTION_HEADER.toLowerCase()];
    return connectionClassFromHeader(Array.isArray(raw) ? raw[0] : raw);
  },
);
