import { Injectable, Logger } from "@nestjs/common";

export type MailTemplate = "verify-email" | "password-reset";

export interface MailData {
  url: string;
}

export interface MailTransport {
  send(template: MailTemplate, to: string, data: MailData): Promise<void>;
}

const subjects: Record<MailTemplate, string> = {
  "verify-email": "Verify your Baydar email",
  "password-reset": "Reset your Baydar password",
};

@Injectable()
export class ConsoleMailTransport implements MailTransport {
  private readonly logger = new Logger(ConsoleMailTransport.name);

  async send(template: MailTemplate, to: string, data: MailData): Promise<void> {
    const subject = subjects[template];
    if (process.env.NODE_ENV === "production") {
      this.logger.log(`Queued ${template} email to ${to} with subject "${subject}".`);
      return;
    }

    this.logger.log(`Queued ${template} email to ${to} with subject "${subject}": ${data.url}`);
  }
}
