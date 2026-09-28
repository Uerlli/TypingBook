import type { ExtractedDocument, ExtractProgress } from "@/types";
import { extractPdf } from "@/utils/pdfExtractor";
import { extractEpub } from "@/utils/epubExtractor";
import { extractTxt } from "@/utils/txtExtractor";

export type SupportedFormat = "pdf" | "epub" | "txt";

export function detectFormat(file: File): SupportedFormat | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (name.endsWith(".pdf") || type === "application/pdf") return "pdf";
  if (name.endsWith(".epub") || type === "application/epub+zip") return "epub";
  if (name.endsWith(".txt") || type.startsWith("text/plain")) return "txt";
  return null;
}

/** Dispatch to the right extractor based on file type. */
export async function extractDocument(
  file: File,
  onProgress?: (p: ExtractProgress) => void
): Promise<ExtractedDocument> {
  const format = detectFormat(file);
  if (format === "pdf") return extractPdf(file, onProgress);
  if (format === "epub") return extractEpub(file, onProgress);
  if (format === "txt") return extractTxt(file, onProgress);
  throw new Error("Formato não suportado. Use PDF, EPUB ou TXT.");
}