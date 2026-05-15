import { Inject, Injectable } from "@nestjs/common";

import type { MailData, MailTemplate, MailTransport } from "./console-mail.transport";
import { MAIL_TRANSPORT } from "./mail.tokens";

@Injectable()
export class MailService {
  constructor(@Inject(MAIL_TRANSPORT) private readonly transport: MailTransport) {}

  async send(template: MailTemplate, to: string, data: MailData): Promise<void> {
    await this.transport.send(template, to, data);
  }
}
