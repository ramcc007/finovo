export const MIN_PASSWORD_LENGTH = 10;

/** Shared minimum bar for any password set in the app — signup, and admin-set
 * resets. Length alone (the old 8-char rule) is too weak; require a mix so a
 * short dictionary word isn't accepted outright. */
export function validatePassword(pw: string): string | null {
  if (pw.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    return 'Password must include both letters and numbers.';
  }
  return null;
}
