export type SessionMode = "words" | "sentences" | "time";
export interface SessionSettings { sessionMode: SessionMode; wordsPerSession: 100 | 250 | 500; sentencesPerSession: 1 | 2; durationMinutes: 1 | 2 | 3 | 4 | 5 | null; }
export const DEFAULT_SESSION_SETTINGS: SessionSettings = { sessionMode: "words", wordsPerSession: 250, sentencesPerSession: 1, durationMinutes: 1 };
export type BookFormat = "pdf" | "epub" | "txt";

/** Light metadata persisted in localStorage (never the full text). */
export interface BookMeta {
  sessionMode?: SessionMode;
  wordsPerSession?: 100 | 250 | 500;
  sentencesPerSession?: 1 | 2;
  durationMinutes?: 1 | 2 | 3 | 4 | 5 | null;
  readingOffset?: number;
  contentLength?: number;
  id: string;
  title: string;
  author: string;
  format: BookFormat;
  wordCount: number;
  progress: number;
  currentSession: number;
  totalSessions: number;
  avgWpm: number;
  completedSessions: number;
  coverColor: string;
  lastRead: string | null;
  createdAt: string;
  /** Indexes of sessions already completed (repeats don't grow this set). */
  completedSessionIndexes?: number[];
  /** Total attempts (including repeats), used for the running average. */
  attempts?: number;
}

/** Full book: metadata + the (already filtered) practice text. */
export interface Book extends BookMeta {
  content: string;
}

export type BlockType = "narrative" | "structural";

export interface ClassifiedBlock {
  block: string;
  type: BlockType;
  confidence: number;
}

export interface ClassifyOptions<T = unknown> {
  /** Raw text index of the block, used for pre/post-textual heuristics. */
  blockIndex?: number;
  blockCount?: number;
  meta?: T;
}

export interface ExtractedBlock extends ClassifiedBlock {
  meta?: unknown;
}

/** Progress callback for long extraction jobs. */
export interface ExtractProgress {
  current: number;
  total: number;
  label: string;
}

export interface SessionResult {
  consumedCharacters?: number;
  cursorCharacters?: number;
  correctedWords?: number;
  skippedWords?: number;
  /** Net words per minute — based on correctly typed characters only. */
  wpm: number;
  /** Gross words per minute — every keystroke counts, errors included. */
  rawWpm: number;
  accuracy: number;
  seconds: number;
  /** Total characters typed (gross, backspaces excluded). */
  charactersTyped: number;
  /** Characters currently matching the expected text. */
  correctCharacters: number;
  totalErrors: number;
  correctedErrors: number;
  uncorrectedErrors: number;
  substitutions: number;
  extraCharacters: number;
  missingCharacters: number;
  backspaces: number;
  /** Most frequent mistakes, e.g. expected "R" typed as "T". */
  patterns: ErrorPatternStat[];
}

export interface ErrorPatternStat {
  expected: string;
  got: string;
  count: number;
}

export interface ExtractedDocument {
  title: string;
  author: string;
  format: BookFormat;
  /** Raw text (headers/footers already stripped for pdf/epub when possible). */
  text: string;
  /** Optional pre-segmented blocks (used by epub/pdf structural signals). */
  blocks?: string[];
  /** Structural hints keyed by the same index as blocks. */
  structuralHints?: boolean[];
}

export interface PendingImport {
  doc: ExtractedDocument;
  blocks: ClassifiedBlock[];
}
