/** Display helpers for people identified only by email. */

function titleCase(word: string): string {
  return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

function nameParts(email: string): string[] {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._\-+]+/)
    .map((p) => p.replace(/\d+/g, ""))
    .filter(Boolean);
}

/** "ana.reyes@acme.com" -> "Ana R." */
export function reporterName(email: string | null | undefined): string {
  if (!email) return "Unknown";
  const parts = nameParts(email);
  const first = parts[0];
  if (!first) return email;
  const last = parts[1];
  return last
    ? `${titleCase(first)} ${last.charAt(0).toUpperCase()}.`
    : titleCase(first);
}

export function reporterFirstName(email: string | null | undefined): string {
  const first = email ? nameParts(email)[0] : undefined;
  return first ? titleCase(first) : (email ?? "Unknown");
}

export function reporterInitials(email: string | null | undefined): string {
  if (!email) return "?";
  const parts = nameParts(email);
  const a = parts[0]?.charAt(0) ?? email.charAt(0);
  const b = parts[1]?.charAt(0) ?? "";
  return (a + b).toUpperCase();
}
