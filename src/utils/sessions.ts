import { WORDS_PER_SESSION } from "@/utils/metadata";
import type { SessionSettings } from "@/types";

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

export function normalizeContent(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function buildSentenceSessions(content: string, sentencesPerChunk: 1 | 2 = 1): string[] {
  const text = normalizeContent(content);
  if (!text) return [];
  const abbreviations = /\b(?:sr|sra|srta|dr|dra|prof|profa|etc|pág|págs|cap|caps|ex|vol|av)\.$/i;
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (!/[.!?…]/.test(text[i])) continue;
    const before = text.slice(start, i + 1);
    if (text[i] === "." && abbreviations.test(before.trim().split(/\s+/).pop() ?? "")) continue;
    if (i + 1 < text.length && !/\s/.test(text[i + 1])) continue;
    sentences.push(text.slice(start, i + 1).trim());
    start = i + 1;
  }
  if (start < text.length) sentences.push(text.slice(start).trim());
  const result: string[] = [];
  for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
    result.push(sentences.slice(i, i + sentencesPerChunk).join(" "));
  }
  return result;
}

export function buildSessionsForSettings(text: string, settings: SessionSettings): string[] {
  if (settings.sessionMode === "sentences") return buildSentenceSessions(text, settings.sentencesPerSession);
  const words = normalizeContent(text).split(" ");
  const result: string[] = [];
  for (let i = 0; i < words.length; i += settings.wordsPerSession) result.push(words.slice(i, i + settings.wordsPerSession).join(" "));
  return result;
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
