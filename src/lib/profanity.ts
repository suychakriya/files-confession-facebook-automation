// Basic blocklist — extend as needed
const BLOCKED_WORDS = [
  "nigger", "nigga", "faggot", "chink", "spic", "kike", "tranny",
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_WORDS.some((word) => lower.includes(word));
}
