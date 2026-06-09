export function buildGreeting(): string | null {
  const h = new Date().getHours();
  if (h < 5) return null;
  if (h < 12) return 'Guten Morgen';
  if (h < 17) return 'Guten Tag';
  if (h < 22) return 'Guten Abend';
  return null;
}
