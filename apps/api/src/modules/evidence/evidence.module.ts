import { Module } from "@nestjs/common";

import { SmsModule } from "../sms/sms.module";
import { VerificationsModule } from "../verifications/verifications.module";

import { CredentialsController } from "./credentials.controller";
import { CredentialsService } from "./credentials.service";
import { StandingService } from "./standing.service";
import { WorkProofsController } from "./work-proofs.controller";
import { WorkProofsService } from "./work-proofs.service";

@Module({
  imports: [SmsModule, VerificationsModule],
  controllers: [WorkProofsController, CredentialsController],
  providers: [StandingService, WorkProofsService, CredentialsService],
  // Recommendations and verifications both move the evidence score, and the
  // hiring surfaces read a standing. One service owns both numbers.
  exports: [StandingService],
})
export class EvidenceModule {}
