import type { BookFormat, BookMeta, SessionSettings } from "@/types";
import { DEFAULT_SESSION_SETTINGS } from "@/types";
import { countWords } from "@/utils/contentClassifier";

export const WORDS_PER_SESSION = 320;

export const COVER_COLORS = [
  "#bef264",
  "#fcd34d",
  "#fca5a5",
  "#7dd3fc",
  "#6ee7b7",
  "#fdba74",
  "#f0abfc",
  "#c4b5fd",
];

export function createBookId(): string {
  return `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function pickCoverColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length];
}

export interface EstimateInput {
  title: string;
  author: string;
  format: BookFormat;
  text: string;
  id?: string;
}

export function estimateBookMetadata(input: EstimateInput): BookMeta {
  const words = countWords(input.text);
  const totalSessions = Math.max(1, Math.ceil(words / WORDS_PER_SESSION));
  return {
    ...DEFAULT_SESSION_SETTINGS,
    contentLength: input.text.normalize("NFC").length,
    readingOffset: 0,
    id: input.id ?? createBookId(),
    title: input.title.trim() || "Documento sem título",
    author: input.author.trim() || "Autor desconhecido",
    format: input.format,
    wordCount: words,
    progress: 0,
    currentSession: 0,
    totalSessions,
    avgWpm: 0,
    completedSessions: 0,
    coverColor: pickCoverColor(input.title || input.format),
    lastRead: null,
    createdAt: new Date().toISOString(),
  };
}
