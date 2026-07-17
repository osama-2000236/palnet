import { Logger, Module, type Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

import { ConsoleMailTransport, type MailTransport } from "./console-mail.transport";
import { MAIL_TRANSPORT } from "./mail.tokens";
import { ResendTransport } from "./resend.transport";

const transportProvider: Provider = {
  provide: MAIL_TRANSPORT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): MailTransport => {
    const logger = new Logger("MailModule");
    const apiKey = config.get<string>("RESEND_API_KEY");
    const from = config.get<string>("MAIL_FROM");
    const replyTo = config.get<string>("MAIL_REPLY_TO");
    const nodeEnv = config.get<string>("NODE_ENV");

    if (apiKey && from) {
      logger.log(`Using Resend mail transport (from=${from}).`);
      return new ResendTransport({ apiKey, from, replyTo });
    }

    if (nodeEnv === "production") {
      logger.error("Production mail transport unavailable: missing RESEND_API_KEY or MAIL_FROM.");
      throw new Error("Production requires RESEND_API_KEY and MAIL_FROM.");
    }

    logger.log("Using console mail transport (dev/test).");
    return new ConsoleMailTransport();
  },
};

@Module({
  imports: [ConfigModule],
  providers: [transportProvider],
  exports: [MAIL_TRANSPORT],
})
export class MailModule {}
