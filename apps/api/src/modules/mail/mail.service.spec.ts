import { Test } from "@nestjs/testing";

import { MailService } from "./mail.service";
import { MAIL_TRANSPORT } from "./mail.tokens";

describe("MailService", () => {
  it("delegates to the injected MailTransport without transforming arguments", async () => {
    const transport = { send: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [MailService, { provide: MAIL_TRANSPORT, useValue: transport }],
    }).compile();
    const service = moduleRef.get(MailService);

    await service.send("verify-email", "user@example.com", {
      url: "https://baydar.ps/verify?t=x",
      locale: "ar-PS",
    });

    expect(transport.send).toHaveBeenCalledWith("verify-email", "user@example.com", {
      url: "https://baydar.ps/verify?t=x",
      locale: "ar-PS",
    });
  });

  it("propagates errors from the underlying transport", async () => {
    const transport = { send: jest.fn().mockRejectedValue(new Error("relay down")) };
    const moduleRef = await Test.createTestingModule({
      providers: [MailService, { provide: MAIL_TRANSPORT, useValue: transport }],
    }).compile();
    const service = moduleRef.get(MailService);

    await expect(
      service.send("password-reset", "user@example.com", {
        url: "https://baydar.ps/reset?t=x",
        locale: "en",
      }),
    ).rejects.toThrow("relay down");
  });
});
