import type { ExtractedDocument, ExtractProgress } from "@/types";

export async function extractTxt(
  file: File,
  onProgress?: (p: ExtractProgress) => void
): Promise<ExtractedDocument> {
  onProgress?.({ current: 1, total: 1, label: "Lendo arquivo de texto…" });
  const text = (await file.text()).normalize("NFC");
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const fileName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  let title = fileName || "Documento de texto";
  let author = "";

  const firstLines = normalized
    .split("\n")
    .slice(0, 8)
    .map((l) => l.trim())
    .filter(Boolean);
  if (
    firstLines[0] &&
    firstLines[0].length <= 80 &&
    !/[.!?…]$/.test(firstLines[0]) &&
    firstLines[0].split(/\s+/).length <= 10
  ) {
    title = firstLines[0];
    if (
      firstLines[1] &&
      firstLines[1].length <= 60 &&
      !/[.!?…]$/.test(firstLines[1]) &&
      firstLines[1].split(/\s+/).length <= 6
    ) {
      author = firstLines[1];
    }
  }

  return {
    title,
    author,
    format: "txt",
    text: normalized,
  };
}
