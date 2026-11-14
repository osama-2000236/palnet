/** "First Last", or the handle when a profile has no name yet. */
export function personName(
  person: { handle: string; firstName: string; lastName: string } | null | undefined,
): string {
  if (!person) return "";
  return `${person.firstName} ${person.lastName}`.trim() || person.handle;
}
