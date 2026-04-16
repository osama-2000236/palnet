import { Test } from "@nestjs/testing";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = mod.get(HealthController);
  });

  it("returns status=ok", () => {
    const res = controller.check();
    expect(res.data.status).toBe("ok");
    expect(typeof res.data.uptimeMs).toBe("number");
    expect(res.data.uptimeMs).toBeGreaterThanOrEqual(0);
  });
});
