/**
 * PDF extraction.
 *
 * Uses pdf.js text items (with their `transform` position and font size) to:
 *  - report real per-page progress ("Lendo página X de Y…");
 *  - detect repeated headers/footers (same vertical band, repeated across
 *    pages) and remove them before splitting into blocks;
 *  - flag lines with a visibly larger font as chapter/section headings, used
 *    as an extra narrative-start signal (never as a hard filter).
 */

import * as pdfjs from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { ExtractedDocument, ExtractProgress } from "@/types";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface PdfLine {
  text: string;
  y: number;
  size: number;
  pageIndex: number;
}

const TOP_ZONE = 0.9;
const BOTTOM_ZONE = 0.1;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function normalizeLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function buildLines(items: PdfTextItem[], pageIndex: number): PdfLine[] {
  const raw = items
    .filter((it) => typeof it.str === "string" && it.str.length > 0)
    .map((it) => {
      const size = Math.abs(it.transform[3]) || it.height || 10;
      return {
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        width: it.width || 0,
        size,
      };
    })
    .sort((a, b) => (Math.abs(b.y - a.y) > 1 ? b.y - a.y : a.x - b.x));

  const lines: PdfLine[] = [];
  let current: { parts: string[]; y: number; size: number; endX: number } | null = null;

  for (const item of raw) {
    const size = item.size || 10;
    if (!current || Math.abs(item.y - current.y) > size * 0.6) {
      if (current) {
        const text = normalizeLine(current.parts.join(""));
        if (text) lines.push({ text, y: current.y, size: current.size, pageIndex });
      }
      current = { parts: [item.str], y: item.y, size, endX: item.x + item.width };
    } else {
      const gap = item.x - current.endX;
      let piece = item.str;
      if (gap > size * 0.18 && !/\s$/.test(current.parts.join("")) && !/^\s/.test(piece)) {
        piece = " " + piece;
      }
      current.parts.push(piece);
      current.endX = Math.max(current.endX, item.x + item.width);
    }
  }
  if (current) {
    const text = normalizeLine(current.parts.join(""));
    if (text) lines.push({ text, y: current.y, size: current.size, pageIndex });
  }
  return lines;
}

function isPurePageNumber(text: string): boolean {
  return /^[\s\-–—|.]*\d{1,4}[\s\-–—|.]*$/.test(text);
}

export async function extractPdf(
  file: File,
  onProgress?: (p: ExtractProgress) => void
): Promise<ExtractedDocument> {
  const data = new Uint8Array(await file.arrayBuffer());
  // The loading task (not the document proxy) owns the worker/resources, so it
  // is the object responsible for cleanup. Keeping it in scope lets us destroy
  // it even when extraction throws halfway through.
  const loadingTask = pdfjs.getDocument({ data, isEvalSupported: false });
  try {
    const doc = await loadingTask.promise;
    const total = doc.numPages;

    let infoTitle = "";
    let infoAuthor = "";
    try {
      const meta = await doc.getMetadata();
      const info = (meta?.info ?? {}) as Record<string, unknown>;
      infoTitle = typeof info.Title === "string" ? info.Title.trim() : "";
      infoAuthor = typeof info.Author === "string" ? info.Author.trim() : "";
    } catch {
      /* metadata optional */
    }

    const pagesLines: PdfLine[][] = [];
    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items as unknown as PdfTextItem[];
      const lines = buildLines(items, pageNumber - 1).filter(
        (line) => line.y <= viewport.height * 2 && line.y >= -viewport.height
      );
      // mark zone by page height for header/footer detection
      (lines as Array<PdfLine & { pageHeight: number }>).forEach((line) => {
        line.pageHeight = viewport.height;
      });
      pagesLines.push(lines);
      onProgress?.({
        current: pageNumber,
        total,
        label: `Lendo página ${pageNumber} de ${total}…`,
      });
    }

    // ---- repeated header/footer detection ---------------------------------
    const zoneCounts = new Map<string, number>();
    for (const lines of pagesLines) {
      const seenThisPage = new Set<string>();
      for (const line of lines as Array<PdfLine & { pageHeight?: number }>) {
        const height = line.pageHeight ?? 0;
        if (!height) continue;
        const ratio = line.y / height;
        const inZone = ratio > TOP_ZONE || ratio < BOTTOM_ZONE;
        if (!inZone) continue;
        if (isPurePageNumber(line.text)) continue;
        const key = normalizeLine(line.text).toLowerCase();
        if (key.length < 3 || key.length > 90) continue;
        if (seenThisPage.has(key)) continue;
        seenThisPage.add(key);
        zoneCounts.set(key, (zoneCounts.get(key) || 0) + 1);
      }
    }
    const minRepeat = Math.max(3, Math.ceil(total * 0.3));
    const repeatedHeaders = new Set<string>();
    zoneCounts.forEach((count, key) => {
      if (count >= minRepeat) repeatedHeaders.add(key);
    });

    // ---- body font size ----------------------------------------------------
    const allSizes = pagesLines.flat().map((l) => l.size).filter((s) => s > 0);
    const bodySize = median(allSizes) || 11;

    // ---- paragraphs / blocks ----------------------------------------------
    const blocks: string[] = [];
    let buffer: string[] = [];
    let prevY: number | null = null;
    let prevPage = -1;

    const flush = () => {
      if (buffer.length) {
        const text = normalizeLine(buffer.join(" "));
        if (text) blocks.push(text);
        buffer = [];
      }
    };

    pagesLines.forEach((lines, pageIndex) => {
      for (const line of lines as Array<PdfLine & { pageHeight?: number }>) {
        const key = normalizeLine(line.text).toLowerCase();
        if (isPurePageNumber(line.text)) continue;
        if (repeatedHeaders.has(key)) continue;

        const isHeading = line.size >= bodySize * 1.25 && line.text.length <= 70;
        const gap = prevY !== null ? prevY - line.y : Number.POSITIVE_INFINITY;
        const breakBefore =
          prevPage !== pageIndex ||
          isHeading ||
          (prevY !== null && gap > line.size * 1.9);

        if (breakBefore) flush();
        buffer.push(line.text);
        if (isHeading) flush();

        prevY = line.y;
        prevPage = pageIndex;
      }
      flush();
    });

    const text = blocks.join("\n\n");
    const fileName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

    return {
      title: infoTitle || fileName || "Documento PDF",
      author: infoAuthor,
      format: "pdf",
      text,
      blocks,
    };
  } finally {
    // Always release the PDF resources through the loading task — success or
    // failure — so a broken import never leaks the reader.
    try {
      await loadingTask.destroy();
    } catch {
      /* cleanup is best-effort */
    }
  }
}