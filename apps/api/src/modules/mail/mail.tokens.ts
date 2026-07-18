// Injection token for the MailTransport implementation (Resend in prod,
// console in dev/test — see MailModule's factory). Consumers @Inject this
// token and call transport.send() directly.
export const MAIL_TRANSPORT = Symbol("MAIL_TRANSPORT");
