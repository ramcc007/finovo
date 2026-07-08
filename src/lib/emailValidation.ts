// Common disposable/temp-mail domains used for spam signups. Not exhaustive —
// paired with Turnstile CAPTCHA as the primary anti-spam layer, this just
// blocks the obvious throwaway-inbox services.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info', 'tempmail.com',
  'temp-mail.org', 'throwawaymail.com', '10minutemail.com', '10minutemail.net',
  'yopmail.com', 'trashmail.com', 'getnada.com', 'fakeinbox.com',
  'sharklasers.com', 'dispostable.com', 'mailnesia.com', 'maildrop.cc',
  'mintemail.com', 'moakt.com', 'mytemp.email', 'tempinbox.com',
  'emailondeck.com', 'spamgourmet.com', 'mohmal.com', 'discard.email',
]);

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) return 'Enter a valid email address.';

  const domain = trimmed.split('@')[1] ?? '';
  if (DISPOSABLE_DOMAINS.has(domain)) return 'Disposable email addresses are not allowed. Please use a permanent address.';

  // Repeated dots, leading/trailing dots in local part — common spam-bot pattern
  const local = trimmed.split('@')[0] ?? '';
  if (/\.\.|^\.|\.$/.test(local)) return 'Enter a valid email address.';

  return null;
}
