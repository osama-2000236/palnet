import { Module } from "@nestjs/common";

import { MailService } from "./mail.service";

// Global-ish mail module: any module that imports MailModule gets MailService.
// Kept small so it can swap providers without touching consumers.
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
