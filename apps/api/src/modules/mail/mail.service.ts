import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

import type { Env } from "../../config/env";

// Thin Resend wrapper with a local dev fallback. In development without a
// RESEND_API_KEY the service logs the would-be email to stdout so the auth
// flows remain testable without a real provider.
@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly client: Resend | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService<Env, true>) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    this.client = apiKey ? new Resend(apiKey) : null;
    this.from = this.config.getOrThrow<string>("EMAIL_FROM");
  }

  async sendVerifyEmail(to: string, link: string, mobileLink?: string | null): Promise<void> {
    const subject = "Verify your Baydar email";
    const html = buildHtml(
      "Verify your email",
      `<p>Confirm your email to finish setting up your Baydar account:</p>
       <p><a href="${escapeAttr(link)}" style="display:inline-block;padding:10px 18px;background:#6B7A3A;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Verify email</a></p>
       ${mobileLinkBlock(mobileLink, "Open in the Baydar app")}
       <p style="color:#6B6B6B;font-size:13px">Or paste this link into your browser:<br>${escape(link)}</p>
       <p style="color:#6B6B6B;font-size:13px">If you didn't create an account, you can ignore this email.</p>`,
    );
    await this.send(to, subject, html);
  }

  async sendNotificationEmail(
    to: string,
    opts: { subject: string; body: string; ctaLabel: string; ctaLink: string },
  ): Promise<void> {
    const html = buildHtml(
      opts.subject,
      `<p>${escape(opts.body)}</p>
       <p><a href="${escapeAttr(opts.ctaLink)}" style="display:inline-block;padding:10px 18px;background:#6B7A3A;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">${escape(opts.ctaLabel)}</a></p>
       <p style="color:#6B6B6B;font-size:13px">Change what you receive in your <a href="${escapeAttr(opts.ctaLink.replace(/\/notifications.*$/, "/settings/notifications"))}">notification preferences</a>.</p>`,
    );
    await this.send(to, opts.subject, html);
  }

  async sendPasswordResetEmail(
    to: string,
    link: string,
    mobileLink?: string | null,
  ): Promise<void> {
    const subject = "Reset your Baydar password";
    const html = buildHtml(
      "Reset your password",
      `<p>We got a request to reset the password for your Baydar account.</p>
       <p><a href="${escapeAttr(link)}" style="display:inline-block;padding:10px 18px;background:#6B7A3A;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">Reset password</a></p>
       ${mobileLinkBlock(mobileLink, "Open in the Baydar app")}
       <p style="color:#6B6B6B;font-size:13px">Or paste this link into your browser:<br>${escape(link)}</p>
       <p style="color:#6B6B6B;font-size:13px">The link expires in 1 hour. If you didn't ask for this, ignore this email — your password stays the same.</p>`,
    );
    await this.send(to, subject, html);
  }

  async sendAccountExportEmail(to: string, json: string): Promise<void> {
    const subject = "Your Baydar account export";
    const html = buildHtml(
      "Your account export",
      `<p>Here is the JSON export for your Baydar account.</p>
       <pre style="white-space:pre-wrap;word-break:break-word;background:#F6F6F0;border:1px solid #E5E5E5;border-radius:6px;padding:12px;font-size:12px;line-height:1.5">${escape(json)}</pre>`,
    );
    await this.send(to, subject, html);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.client) {
      this.log.warn(
        `[mail:dev] to=${to} subject=${subject} (no RESEND_API_KEY; set one to actually send)`,
      );
      this.log.debug(html);
      return;
    }
    const { error } = await this.client.emails.send({
      from: this.from,
      to,
      subject,
      html,
    });
    if (error) {
      this.log.error(`Resend failure: ${error.message}`);
      // Swallow — auth flows must not leak provider state to the client.
    }
  }
}

function buildHtml(heading: string, body: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">
  <div style="max-width:540px;margin:0 auto">
    <h1 style="font-size:20px;margin:0 0 16px 0;color:#3D4A22">${escape(heading)}</h1>
    ${body}
    <hr style="border:0;border-top:1px solid #E5E5E5;margin:24px 0">
    <p style="color:#9A9A9A;font-size:12px">Baydar · The professional network for the Arab world.</p>
  </div>
</body></html>`;
}

// Renders the secondary "open in mobile app" line. Kept visually subdued so
// web-centric users aren't distracted, but discoverable for the mobile cohort.
// Omitted entirely when the MOBILE_APP_SCHEME env var is unset, so email
// copy stays clean during web-only deploys.
function mobileLinkBlock(link: string | null | undefined, label: string): string {
  if (!link) return "";
  return `<p style="margin-top:-4px"><a href="${escapeAttr(link)}" style="color:#6B7A3A;text-decoration:underline;font-size:13px">${escape(label)}</a></p>`;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escape(s).replace(/"/g, "&quot;");
}
