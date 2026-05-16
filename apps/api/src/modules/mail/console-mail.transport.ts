import { Injectable, Logger } from "@nestjs/common";

import { renderMail, type MailData, type MailTemplate } from "./mail-templates";

export type { MailData, MailTemplate } from "./mail-templates";

export interface MailTransport {
  send(template: MailTemplate, to: string, data: MailData): Promise<void>;
}

@Injectable()
export class ConsoleMailTransport implements MailTransport {
  private readonly logger = new Logger(ConsoleMailTransport.name);

  async send(template: MailTemplate, to: string, data: MailData): Promise<void> {
    const { subject } = renderMail(template, data);
    if (process.env.NODE_ENV === "production") {
      this.logger.log(`Queued ${template} email to ${to} with subject "${subject}".`);
      return;
    }

    this.logger.log(`Queued ${template} email to ${to} with subject "${subject}": ${data.url}`);
  }
}
