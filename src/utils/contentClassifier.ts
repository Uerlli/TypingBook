/**
 * contentClassifier
 *
 * Splits a document's raw text into blocks (paragraphs / sections) and labels
 * each one as "narrative" (worth practising) or "structural" (TOC, name lists,
 * headers/footers, pre/post-textual material, adverts...).
 *
 * Design goals:
 *  - Language agnostic & document agnostic: relies on *structure* (line length,
 *    repetition, punctuation, function-word density), plus a small generic
 *    pt+en vocabulary of pre/post-textual terms used only as one signal.
 *  - Every heuristic is an isolated, composable sub-function returning a 0..1
 *    score, combined with weighted points — never one giant regex.
 *  - Pure & testable: no DOM / no I/O.
 */

import type { BlockType, ClassifiedBlock, ClassifyOptions } from "@/types";

/* -------------------------------------------------------------------------- */
/* Tunable weights & vocab                                                     */
/* -------------------------------------------------------------------------- */

export const CLASSIFIER_CONFIG = {
  /** structuralScore >= threshold => "structural". */
  threshold: 0.5,
  weights: {
    shortLines: 0.9,
    dottedToc: 1.0,
    uppercaseList: 0.7,
    lowFunctionDensity: 1.1,
    prePostTerms: 1.2,
    repetition: 1.0,
    // narrative signals subtract from the structural score
    dialogue: 0.7,
    punctuationVariety: 0.5,
    proseLength: 0.6,
  },
} as const;

const FUNCTION_WORDS = new Set<string>(
  (
    // Portuguese
    "a o e de do da dos das em no na nos nas um uma uns umas que com para por se ao aos aà à às é são foi eram era ser está estão como mas ou não sim já " +
    "seu sua seus suas este esta esse essa isso isto aquele aquela ele ela eles elas eu você nós vos mais menos muito muita muitos muitas também quando onde porque " +
    "entre sobre depois antes então assim tudo todo toda todos todas qual quais quem cujo " +
    // English
    "the a an and or but of to in on at for with is are was were be been being this that these those he she it they we you i as by from not no so if then " +
    "when where which who whom will would can could should has have had do does did there their them his her its our your my me us them than that's it's"
  )
    .split(/\s+/)
    .filter(Boolean)
);

/** Generic pre/post-textual vocabulary (categories, not specific titles). */
const PRE_POST_TERMS = [
  // pt
  "sumário",
  "indice",
  "índice",
  "ficha catalografica",
  "ficha catalográfica",
  "isbn",
  "direitos autorais",
  "todos os direitos reservados",
  "copyright",
  "agradecimentos",
  "dedicatoria",
  "dedicatória",
  "prefacio",
  "prefácio",
  "apresentacao",
  "apresentação",
  "glossario",
  "glossário",
  "apendice",
  "apêndice",
  "anexo",
  "anexos",
  "bibliografia",
  "referencias",
  "referências",
  "sobre o autor",
  "sobre a autora",
  "notas do autor",
  "creditos",
  "créditos",
  "expediente",
  "colofao",
  "colofão",
  "errata",
  "orelha",
  "contracapa",
  "sinopse",
  "publicacao",
  "publicação",
  "editora",
  "impresso",
  "tiragem",
  "traducao",
  "tradução",
  "revisao",
  "revisão",
  "diagramacao",
  "diagramação",
  "catalogo",
  "catálogo",
  "lista de personagens",
  "personagens",
  "capitulos",
  "capítulos",
  "sumario",
  "oferta",
  "assine",
  "assinatura",
  "adquira",
  "compre",
  "clique",
  "acesse",
  "baixe",
  "teste grátis",
  "teste gratis",
  "aproveite",
  "desconto",
  "promoção",
  "promocao",
  "grátis",
  "gratis",
  "site",
  "www",
  "http",
  // en
  "table of contents",
  "contents",
  "chapter list",
  "all rights reserved",
  "acknowledgments",
  "acknowledgements",
  "dedication",
  "foreword",
  "preface",
  "glossary",
  "appendix",
  "bibliography",
  "references",
  "about the author",
  "credits",
  "colophon",
  "back cover",
  "blurb",
  "publisher",
  "printed in",
  "edition",
  "cataloging",
  "subscribe",
  "offer",
  "buy",
  "purchase",
  "click",
  "download",
  "free trial",
  "discount",
  "get it now",
  "available now",
  "visit",
];

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

function normalizeLine(line: string): string {
  return line.toLowerCase().replace(/\s+/g, " ").trim();
}

function getInnerLines(block: string): string[] {
  return block
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function tokenize(block: string): string[] {
  return block
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Structural (penalty) sub-functions — each returns 0..1                      */
/* -------------------------------------------------------------------------- */

/** Many short lines stacked => TOC / chapter list / name list. */
export function scoreShortLines(block: string): number {
  const lines = getInnerLines(block);
  if (lines.length < 2) return 0;
  const shortLines = lines.filter((l) => l.length <= 42).length;
  const shortRatio = shortLines / lines.length;
  const avgLen = lines.reduce((s, l) => s + l.length, 0) / lines.length;
  const lengthPressure = clamp01((70 - avgLen) / 70);
  const lineCountPressure = clamp01((lines.length - 2) / 10);
  return clamp01(shortRatio * 0.6 + lengthPressure * 0.25 + lineCountPressure * 0.15);
}

/** Dotted leaders or trailing page numbers => TOC / index. */
export function scoreDottedToc(block: string): number {
  const lines = getInnerLines(block);
  if (lines.length === 0) return 0;
  let hits = 0;
  for (const line of lines) {
    const dotted = /\.{2,}\s*\d+\s*$/.test(line);
    const spacedNumber = /\s{2,}\d{1,4}\s*$/.test(line) || /^\s*\d{1,4}\s+\S/.test(line);
    const trailingNumber = /\d{1,4}\s*$/.test(line) && line.length < 80;
    if (dotted) hits += 1.4;
    else if (spacedNumber) hits += 1;
    else if (trailingNumber) hits += 0.6;
  }
  return clamp01(hits / lines.length);
}

/** Mostly UPPERCASE text with few function words => name/house lists, headings. */
export function scoreUppercaseListing(block: string): number {
  const letters = block.replace(/[^\p{L}]/gu, "");
  if (letters.length < 6) return 0;
  const upper = (block.match(/\p{Lu}/gu) || []).length;
  const upperRatio = upper / letters.length;
  const lines = getInnerLines(block);
  const upperLines = lines.filter((l) => {
    const l2 = l.replace(/[^\p{L}]/gu, "");
    return l2.length > 2 && l2 === l2.toUpperCase();
  }).length;
  const upperLineRatio = lines.length ? upperLines / lines.length : 0;
  const tokens = tokenize(block);
  const functionRatio = tokens.length
    ? tokens.filter((t) => FUNCTION_WORDS.has(t)).length / tokens.length
    : 0;
  const lowFunction = clamp01((0.06 - functionRatio) / 0.06);
  return clamp01(upperRatio * 0.55 + upperLineRatio * 0.25 + lowFunction * 0.2);
}

/** Real prose keeps a stable function-word density; lists/tables barely have any. */
export function scoreLowFunctionDensity(block: string): number {
  const tokens = tokenize(block);
  if (tokens.length < 8) return 0.2;
  const functionRatio = tokens.filter((t) => FUNCTION_WORDS.has(t)).length / tokens.length;
  // ~0.35 typical for prose, <0.15 suspicious.
  return clamp01((0.28 - functionRatio) / 0.28);
}

/** Pre/post-textual material near document edges (generic pt+en categories). */
export function scorePrePostTerms(
  block: string,
  options: ClassifyOptions = {}
): number {
  const lower = " " + normalizeLine(block) + " ";
  let hits = 0;
  for (const term of PRE_POST_TERMS) {
    if (lower.includes(" " + term + " ") || lower.includes(term)) {
      if (lower.includes(term)) hits += 1;
    }
  }
  if (hits === 0) return 0;
  const { blockIndex = 0, blockCount = 1 } = options;
  const pos = blockCount > 1 ? blockIndex / (blockCount - 1) : 0;
  // Stronger near the beginning or the end of the document.
  const edgeBoost = pos < 0.18 || pos > 0.82 ? 1 : 0.55;
  // A block saturated with these terms is clearly structural.
  const density = clamp01(hits * 0.35);
  return clamp01(density * edgeBoost + (hits >= 2 ? 0.2 : 0));
}

/** How much of the block is made of lines that repeat across the document. */
export function scoreRepetition(block: string, repeated: Set<string>): number {
  const lines = getInnerLines(block);
  if (lines.length === 0 || repeated.size === 0) return 0;
  const repeatedLines = lines.filter((l) => repeated.has(normalizeLine(l))).length;
  return clamp01(repeatedLines / lines.length);
}

/* -------------------------------------------------------------------------- */
/* Narrative (bonus) sub-functions — each returns 0..1                         */
/* -------------------------------------------------------------------------- */

/** Direct speech (quotes / em-dash dialogue) is a strong prose marker. */
export function scoreDialogue(block: string): number {
  const quotes =
    (block.match(/[“"«»„”]/g) || []).length + (block.match(/\s[–—-]\s/g) || []).length;
  const sentences = (block.match(/[.!?…]+/g) || []).length || 1;
  return clamp01((quotes / sentences) * 1.6);
}

/** Varied punctuation (commas, dashes, semicolons) around periods. */
export function scorePunctuationVariety(block: string): number {
  const commas = (block.match(/[,;:]/g) || []).length;
  const periods = (block.match(/[.!?…]/g) || []).length;
  const dashes = (block.match(/[—–]/g) || []).length;
  if (periods === 0) return 0;
  const perSentence = (commas + dashes) / periods;
  return clamp01(perSentence / 2.2);
}

/** Long paragraph of complete sentences => prose. */
export function scoreProseLength(block: string): number {
  const chars = block.replace(/\s+/g, " ").length;
  const sentences = (block.match(/[.!?…]/g) || []).length;
  const lengthScore = clamp01((chars - 120) / 480);
  const sentenceScore = clamp01(sentences / 4);
  return clamp01(lengthScore * 0.6 + sentenceScore * 0.4);
}

/* -------------------------------------------------------------------------- */
/* Repeated line detection (headers / footers / watermarks)                    */
/* -------------------------------------------------------------------------- */

/**
 * Find lines that appear verbatim (or almost) many times across the whole
 * document. These are page headers, footers, watermarks or the running
 * book/chapter title — removed before block splitting.
 */
export function detectRepeatedLines(rawText: string): Set<string> {
  const counts = new Map<string, number>();
  const display = new Map<string, string>();

  for (const raw of rawText.split(/\n/)) {
    const key = normalizeLine(raw);
    if (key.length < 4 || key.length > 80) continue;
    if (/^\d+$/.test(key)) continue; // pure page numbers handled separately
    const words = key.split(" ").length;
    if (words > 12) continue; // prose sentences can legitimately repeat — skip
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!display.has(key)) display.set(key, raw.trim());
  }

  const repeated = new Set<string>();
  counts.forEach((count, key) => {
    if (count >= 3) repeated.add(key);
  });
  return repeated;
}

export function stripRepeatedLines(rawText: string, repeated: Set<string>): string {
  if (repeated.size === 0) return rawText;
  return rawText
    .split(/\n/)
    .filter((line) => {
      const key = normalizeLine(line);
      if (!key) return true;
      return !repeated.has(key);
    })
    .join("\n");
}

/* -------------------------------------------------------------------------- */
/* Block splitting                                                             */
/* -------------------------------------------------------------------------- */

const MAX_BLOCK_CHARS = 1600;

function splitOversized(block: string): string[] {
  if (block.length <= MAX_BLOCK_CHARS) return [block];
  const sentences = block.split(/(?<=[.!?…])\s+/);
  const out: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if ((buffer + " " + sentence).trim().length > MAX_BLOCK_CHARS && buffer) {
      out.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
    }
  }
  if (buffer.trim()) out.push(buffer.trim());
  return out;
}

export function splitIntoBlocks(rawText: string): string[] {
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Prefer explicit form-feed / page breaks, then blank lines.
  const pages = normalized.split(/\f/);
  const raw: string[] = [];
  for (const page of pages) {
    const parts = page.split(/\n\s*\n+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) raw.push(trimmed);
    }
  }
  const blocks = raw.flatMap((b) => splitOversized(b));
  return blocks.filter((b) => tokenize(b).length > 0);
}

/* -------------------------------------------------------------------------- */
/* Main classifier                                                             */
/* -------------------------------------------------------------------------- */

export interface ClassifyExtra {
  /** Pre-segmented blocks from the extractor (pdf/epub). */
  blocks?: string[];
  /** Structural hints aligned with `blocks` (e.g. epub list/table files). */
  structuralHints?: boolean[];
  /** Disable the repeated-line pass (already done by the extractor). */
  skipRepeatedDetection?: boolean;
  extraStructuralByIndex?: Record<number, number>;
}

export function classifyBlocks(
  rawText: string,
  options: ClassifyOptions = {},
  extra: ClassifyExtra = {}
): ClassifiedBlock[] {
  const repeated = extra.skipRepeatedDetection
    ? new Set<string>()
    : detectRepeatedLines(rawText);
  const cleaned = extra.skipRepeatedDetection
    ? rawText
    : stripRepeatedLines(rawText, repeated);

  const blocks = extra.blocks && extra.blocks.length ? extra.blocks : splitIntoBlocks(cleaned);
  const w = CLASSIFIER_CONFIG.weights;

  const scored = blocks.map((block, index) => {
    const ctx: ClassifyOptions = { blockIndex: index, blockCount: blocks.length };

    const structural =
      scoreShortLines(block) * w.shortLines +
      scoreDottedToc(block) * w.dottedToc +
      scoreUppercaseListing(block) * w.uppercaseList +
      scoreLowFunctionDensity(block) * w.lowFunctionDensity +
      scorePrePostTerms(block, ctx) * w.prePostTerms +
      scoreRepetition(block, repeated) * w.repetition;

    const narrative =
      scoreDialogue(block) * w.dialogue +
      scorePunctuationVariety(block) * w.punctuationVariety +
      scoreProseLength(block) * w.proseLength;

    let score = structural - narrative;
    if (extra.structuralHints?.[index]) score += 1.4; // epub list/table file
    if (extra.extraStructuralByIndex?.[index]) {
      score += Math.min(1, extra.extraStructuralByIndex[index]);
    }

    return { block, score };
  });

  // Continuity pass: nudge ambiguous blocks toward their neighbours.
  const MAX_SCORE = 2.6;

  const withNeighbors = scored.map((item, i) => {
    let s = item.score;
    const prev = scored[i - 1];
    const next = scored[i + 1];
    const near = Math.abs(s) <= 0.35;
    if (near && prev && next) {
      const prevNarr = prev.score < 0;
      const nextNarr = next.score < 0;
      if (prevNarr && nextNarr) s -= 0.25;
      const prevStruct = prev.score > CLASSIFIER_CONFIG.threshold;
      const nextStruct = next.score > CLASSIFIER_CONFIG.threshold;
      if (prevStruct && nextStruct) s += 0.25;
    }
    return { block: item.block, score: s };
  });

  return withNeighbors.map(({ block, score }) => {
    const normalizedScore = clamp01(score / MAX_SCORE);
    const type: BlockType = score >= CLASSIFIER_CONFIG.threshold ? "structural" : "narrative";
    const distance = Math.abs(normalizedScore - 0.5) * 2;
    return {
      block,
      type,
      confidence: Number(clamp01(0.5 + distance / 2).toFixed(3)),
    };
  });
}

/** Convenience: concatenate only the included blocks, preserving order. */
export function joinBlocks(blocks: string[]): string {
  return blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function countWords(text: string): number {
  return tokenize(text).length;
}