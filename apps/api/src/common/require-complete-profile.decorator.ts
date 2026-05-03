import { SetMetadata } from "@nestjs/common";

export const REQUIRE_COMPLETE_PROFILE_KEY = "requireCompleteProfile";

export const RequireCompleteProfile = (): ClassDecorator & MethodDecorator =>
  SetMetadata(REQUIRE_COMPLETE_PROFILE_KEY, true);
