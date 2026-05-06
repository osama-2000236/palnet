import { Injectable } from "@nestjs/common";

import { ConsoleMailTransport, type MailData, type MailTemplate } from "./console-mail.transport";

@Injectable()
export class MailService {
  constructor(private readonly transport: ConsoleMailTransport) {}

  async send(template: MailTemplate, to: string, data: MailData): Promise<void> {
    await this.transport.send(template, to, data);
  }
}
