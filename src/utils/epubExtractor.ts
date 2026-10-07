/**
 * EPUB extraction.
 *
 * Unzips the EPUB, reads the OPF (metadata + spine order) and walks the spine
 * documents. Consumes each XHTML file's structure:
 *  - files that are mostly a list (<ul>/<ol>/<nav>) or a <table> are flagged
 *    as structural by default;
 *  - <h1>-<h3> headings are treated as narrative chapter starts.
 */

import JSZip from "jszip";
import type { ExtractedDocument, ExtractProgress } from "@/types";

function cleanText(text: string | null): string {
  return (text || "").replace(/\s+/g, " ").trim();
}

function resolvePath(baseDir: string, rel: string): string {
  if (/^https?:/i.test(rel)) return rel;
  const parts = baseDir ? baseDir.split("/").filter(Boolean) : [];
  const relParts = decodeURIComponent(rel).split("/");
  for (const seg of relParts) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

export async function extractEpub(
  file: File,
  onProgress?: (p: ExtractProgress) => void
): Promise<ExtractedDocument> {
  const zip = await JSZip.loadAsync(file);

  // ---- container.xml -> OPF path ----------------------------------------
  const containerFile = zip.file("META-INF/container.xml");
  let opfPath = "";
  if (containerFile) {
    const xml = await containerFile.async("string");
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const rootfile = doc.querySelector("rootfile");
    opfPath = rootfile?.getAttribute("full-path") || "";
  }
  if (!opfPath) {
    const guess = Object.keys(zip.files).find((f) => f.toLowerCase().endsWith(".opf"));
    opfPath = guess || "";
  }

  const opfDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/")) : "";
  let title = "";
  let author = "";
  const spineHrefs: string[] = [];

  if (opfPath) {
    const opfFile = zip.file(opfPath);
    if (opfFile) {
      const xml = await opfFile.async("string");
      const opf = new DOMParser().parseFromString(xml, "application/xml");
      title = cleanText(opf.querySelector("title")?.textContent ?? "");
      author = cleanText(opf.querySelector("creator")?.textContent ?? "");

      const manifest = new Map<string, string>();
      opf.querySelectorAll("manifest > item").forEach((item) => {
        const id = item.getAttribute("id");
        const href = item.getAttribute("href");
        if (id && href) manifest.set(id, resolvePath(opfDir, href));
      });

      opf.querySelectorAll("spine > itemref").forEach((ref) => {
        const idref = ref.getAttribute("idref");
        if (idref && manifest.has(idref)) spineHrefs.push(manifest.get(idref)!);
      });
    }
  }

  const total = spineHrefs.length || 1;
  const blocks: string[] = [];
  const structuralHints: boolean[] = [];

  for (let i = 0; i < spineHrefs.length; i += 1) {
    const href = spineHrefs[i];
    onProgress?.({
      current: i + 1,
      total,
      label: `Lendo seção ${i + 1} de ${total}…`,
    });

    const entry = zip.file(href);
    if (!entry) continue;
    const html = await entry.async("string");
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, head").forEach((el) => el.remove());

    const body = doc.body;
    if (!body) continue;

    const liCount = body.querySelectorAll("li").length;
    const ulCount = body.querySelectorAll("ul, ol").length;
    const tableCount = body.querySelectorAll("table").length;
    const navCount = body.querySelectorAll("nav").length;
    const paraCount = body.querySelectorAll("p").length;

    const isListDoc =
      navCount > 0 ||
      tableCount > 0 ||
      (liCount >= 4 && liCount >= paraCount * 1.5) ||
      (ulCount > 0 && liCount >= 6);

    // collect meaningful text nodes in document order
    const nodes = body.querySelectorAll("h1, h2, h3, h4, p, blockquote, li");
    const collected: { text: string; structural: boolean }[] = [];
    nodes.forEach((node) => {
      const text = cleanText(node.textContent);
      if (!text || text.length < 2) return;
      const tag = node.tagName.toLowerCase();
      collected.push({ text, structural: isListDoc || tag === "li" });
    });

    if (collected.length === 0) {
      const fallback = cleanText(body.textContent);
      if (fallback) collected.push({ text: fallback, structural: isListDoc });
    }

    for (const item of collected) {
      if (item.text.length > 4000) {
        // keep blocks a sane size
        item.text
          .split(/(?<=[.!?…])\s+/)
          .reduce<string[]>((acc, sentence) => {
            const last = acc[acc.length - 1];
            if (last && (last + " " + sentence).length <= 1200) {
              acc[acc.length - 1] = last + " " + sentence;
            } else {
              acc.push(sentence);
            }
            return acc;
          }, [])
          .forEach((chunk) => {
            blocks.push(chunk);
            structuralHints.push(item.structural);
          });
      } else {
        blocks.push(item.text);
        structuralHints.push(item.structural);
      }
    }
  }

  const fileName = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

  return {
    title: title || fileName || "Documento EPUB",
    author,
    format: "epub",
    text: blocks.join("\n\n").normalize("NFC"),
    blocks,
    structuralHints,
  };
}
