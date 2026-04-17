import { SetMetadata } from "@nestjs/common";

// Routes marked @OptionalAuth still skip the mandatory JWT guard, but when a
// valid bearer token *is* present the guard populates req.user so handlers can
// render viewer-scoped data. Use together with @OptionalUser().
export const IS_OPTIONAL_AUTH_KEY = "isOptionalAuth";
export const OptionalAuth = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
