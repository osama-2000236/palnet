import { Logger, Module, type Provider } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import type { Env } from "../../config/env";

import { ConsoleSmsTransport, HttpSmsTransport, SMS_TRANSPORT } from "./sms.transport";
import type { SmsTransport } from "./sms.transport";

const transportProvider: Provider = {
  provide: SMS_TRANSPORT,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): SmsTransport => {
    const logger = new Logger("SmsModule");
    const url = config.get<string>("SMS_GATEWAY_URL");
    const token = config.get<string>("SMS_GATEWAY_TOKEN");
    const senderId = config.get<string>("SMS_SENDER_ID");

    if (url && token) {
      logger.log("Using HTTP SMS gateway.");
      return new HttpSmsTransport({ url, token, senderId });
    }

    // Same rule the mail module follows: a production boot without a real
    // transport fails now, rather than silently swallowing every verification
    // code until somebody notices nobody can verify a phone.
    if (config.get<string>("NODE_ENV") === "production") {
      logger.error("Production SMS transport unavailable: missing SMS_GATEWAY_URL or _TOKEN.");
      throw new Error("Production requires SMS_GATEWAY_URL and SMS_GATEWAY_TOKEN.");
    }

    logger.log("Using console SMS transport (dev/test).");
    return new ConsoleSmsTransport();
  },
};

@Module({
  imports: [ConfigModule],
  providers: [transportProvider],
  exports: [SMS_TRANSPORT],
})
export class SmsModule {}
