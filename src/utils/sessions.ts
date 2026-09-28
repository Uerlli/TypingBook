import { WORDS_PER_SESSION } from "@/utils/metadata";

/** Split a book's text into practice sessions of ~WORDS_PER_SESSION words. */
export function buildSessions(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const words = normalized.split(" ");
  const sessions: string[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_SESSION) {
    const chunk = words.slice(i, i + WORDS_PER_SESSION).join(" ").trim();
    if (chunk) sessions.push(chunk);
  }
  return sessions.length ? sessions : [normalized];
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(Math.round(value));
}

/** Words-per-minute from typed characters & elapsed time. */
export function computeWpm(characters: number, milliseconds: number): number {
  if (milliseconds <= 0) return 0;
  const minutes = milliseconds / 60000;
  return Math.round(characters / 5 / minutes);
}

export function computeAccuracy(correct: number, typed: number): number {
  if (typed <= 0) return 100;
  return Math.max(0, Math.round((correct / typed) * 100));
}