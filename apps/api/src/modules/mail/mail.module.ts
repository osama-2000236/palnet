import { Module } from "@nestjs/common";

import { ConsoleMailTransport } from "./console-mail.transport";
import { MailService } from "./mail.service";

@Module({
  providers: [ConsoleMailTransport, MailService],
  exports: [MailService],
})
export class MailModule {}
