import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { MailModule } from "../mail/mail.module";
import { SmsModule } from "../sms/sms.module";

import { OtpService } from "./otp.service";
import { VerificationsController } from "./verifications.controller";
import { VerificationsService } from "./verifications.service";

@Module({
  imports: [ConfigModule, MailModule, SmsModule],
  controllers: [VerificationsController],
  providers: [OtpService, VerificationsService],
  // The work-proof loop mints its own codes for off-platform counterparties, so
  // it needs the OTP service rather than a second copy of the burn rules.
  exports: [OtpService, VerificationsService],
})
export class VerificationsModule {}
