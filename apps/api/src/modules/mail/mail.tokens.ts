// Injection token for the MailTransport implementation. Kept in its own file so
// MailService can @Inject it without a circular import on MailModule.
export const MAIL_TRANSPORT = Symbol("MAIL_TRANSPORT");
