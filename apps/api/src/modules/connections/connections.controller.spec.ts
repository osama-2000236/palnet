import { Reflector } from "@nestjs/core";

import { REQUIRE_COMPLETE_PROFILE_KEY } from "../../common/require-complete-profile.decorator";

import { ConnectionsController } from "./connections.controller";

describe("ConnectionsController profile completion", () => {
  const reflector = new Reflector();

  it("allows authenticated onboarding users to load connection suggestions", () => {
    const required = reflector.getAllAndOverride<boolean>(REQUIRE_COMPLETE_PROFILE_KEY, [
      ConnectionsController.prototype.suggestions,
      ConnectionsController,
    ]);

    expect(required).toBe(false);
  });

  it("keeps other connection routes protected", () => {
    const required = reflector.getAllAndOverride<boolean>(REQUIRE_COMPLETE_PROFILE_KEY, [
      ConnectionsController.prototype.list,
      ConnectionsController,
    ]);

    expect(required).toBe(true);
  });
});
