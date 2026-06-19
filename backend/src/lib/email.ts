/** Canonical email form for login lookup and new user rows. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
