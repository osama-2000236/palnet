import { Injectable, Logger } from "@nestjs/common";

import { renderMail, type MailData, type MailTemplate } from "./mail-templates";
import type { MailTransport } from "./console-mail.transport";

export interface ResendTransportConfig {
  apiKey: string;
  from: string;
  replyTo?: string;
  endpoint?: string;
}

interface ResendErrorBody {
  message?: string;
  name?: string;
}

@Injectable()
export class ResendTransport implements MailTransport {
  private readonly logger = new Logger(ResendTransport.name);

  constructor(private readonly config: ResendTransportConfig) {}

  async send(template: MailTemplate, to: string, data: MailData): Promise<void> {
    const { subject, html, text } = renderMail(template, data);
    const endpoint = this.config.endpoint ?? "https://api.resend.com/emails";

    const payload: Record<string, unknown> = {
      from: this.config.from,
      to,
      subject,
      html,
      text,
      tags: [
        { name: "template", value: template },
        { name: "locale", value: data.locale ?? "ar-PS" },
      ],
    };
    if (this.config.replyTo) payload.reply_to = this.config.replyTo;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await this.readError(response);
      this.logger.error(
        `Resend send failed: template=${template} status=${response.status} name=${body.name ?? "unknown"} message=${body.message ?? "n/a"}`,
      );
      throw new Error(`Resend send failed with status ${response.status}`);
    }

    this.logger.log(`Sent ${template} email to ${to} via Resend (locale=${data.locale ?? "ar-PS"}).`);
  }

  private async readError(response: Response): Promise<ResendErrorBody> {
    try {
      return (await response.json()) as ResendErrorBody;
    } catch {
      return {};
    }
  }
}
