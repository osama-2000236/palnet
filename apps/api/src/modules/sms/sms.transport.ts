import { Injectable, Logger } from "@nestjs/common";

// Sending one short message to one phone number.
//
// A generic HTTP gateway rather than a named vendor. The operators that
// reliably reach Palestinian numbers are regional, several of them are
// aggregators sitting behind the same shape of POST, and one of them going dark
// should be an environment change rather than a deploy.

export interface SmsTransport {
  send(toE164: string, body: string): Promise<void>;
}

export const SMS_TRANSPORT = Symbol("SMS_TRANSPORT");

/**
 * Dev and test. Prints the message so a developer can read the code.
 *
 * Refuses to pretend in production: if this class is ever constructed there, it
 * says so loudly rather than logging "sent" for a message nobody received. The
 * module's factory throws first, so this branch is a second line of defence
 * against a future refactor moving the check.
 */
@Injectable()
export class ConsoleSmsTransport implements SmsTransport {
  private readonly logger = new Logger(ConsoleSmsTransport.name);

  async send(toE164: string, body: string): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      this.logger.error(`No SMS gateway configured; ${toE164} received nothing.`);
      throw new Error("SMS transport not configured.");
    }
    this.logger.log(`SMS to ${toE164}: ${body}`);
  }
}

export interface HttpSmsOptions {
  url: string;
  token: string;
  senderId?: string;
}

/**
 * The production transport.
 *
 * Deliberately small: one POST, a bearer token, and an error if the gateway
 * says no. Retries do not belong here — an OTP that arrives four minutes late
 * has already expired, and the member has a resend button that does the right
 * thing with a fresh code.
 */
@Injectable()
export class HttpSmsTransport implements SmsTransport {
  private readonly logger = new Logger(HttpSmsTransport.name);

  constructor(private readonly options: HttpSmsOptions) {}

  async send(toE164: string, body: string): Promise<void> {
    const response = await fetch(this.options.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.options.token}`,
      },
      body: JSON.stringify({ to: toE164, message: body, sender: this.options.senderId }),
    });

    if (!response.ok) {
      // The number is logged, the message never is: it contains the code.
      this.logger.error(`SMS gateway rejected ${toE164}: ${response.status}`);
      throw new Error(`SMS gateway responded ${response.status}`);
    }
  }
}
