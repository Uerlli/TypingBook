import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { BookMeta, ClassifiedBlock, ExtractedDocument, SessionSettings } from "@/types";
import { DEFAULT_SESSION_SETTINGS } from "@/types";
import BlockReview from "@/components/BlockReview";
import { classifyBlocks, countWords, joinBlocks } from "@/utils/contentClassifier";
import { detectFormat, extractDocument } from "@/utils/extractDocument";
import { estimateBookMetadata } from "@/utils/metadata";
import { buildSentenceSessions, formatNumber } from "@/utils/sessions";

type Step = "select" | "extracting" | "review";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (input: {
    meta: BookMeta;
    rawContent: string;
    filteredContent: string;
  }) => Promise<void> | void;
}

const FORMAT_LABEL: Record<string, string> = { pdf: "PDF", epub: "EPUB", txt: "TXT" };

export default function UploadModal({ open, onClose, onConfirm }: UploadModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [fileName, setFileName] = useState("");
  const [doc, setDoc] = useState<ExtractedDocument | null>(null);
  const [blocks, setBlocks] = useState<ClassifiedBlock[]>([]);
  const [included, setIncluded] = useState<boolean[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 1, label: "Preparando…" });
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>(DEFAULT_SESSION_SETTINGS);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("select");
    setFileName("");
    setDoc(null);
    setBlocks([]);
    setIncluded([]);
    setProgress({ current: 0, total: 1, label: "Preparando…" });
    setError("");
    setDragActive(false);
    setSaving(false);
    setSessionSettings(DEFAULT_SESSION_SETTINGS);
  }, []);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const handleFile = useCallback(async (file: File) => {
    const format = detectFormat(file);
    if (!format) {
      setError("Formato não suportado. Use PDF, EPUB ou TXT.");
      return;
    }
    setError("");
    setFileName(file.name);
    setStep("extracting");
    setProgress({ current: 0, total: 1, label: "Preparando…" });

    try {
      const extracted = await extractDocument(file, (p) => setProgress(p));
      const classified = classifyBlocks(
        extracted.text,
        {},
        {
          blocks: extracted.blocks,
          structuralHints: extracted.structuralHints,
        }
      );
      setDoc(extracted);
      setBlocks(classified);
      setIncluded(classified.map((b) => b.type === "narrative"));
      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error
          ? `Não foi possível ler o arquivo: ${err.message}`
          : "Não foi possível ler o arquivo."
      );
      setStep("select");
    }
  }, []);

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const toggleBlock = (index: number) => {
    setIncluded((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const includedWords = useMemo(() => {
    let words = 0;
    blocks.forEach((b, i) => {
      if (included[i]) words += countWords(b.block);
    });
    return words;
  }, [blocks, included]);

  const includedCount = included.filter(Boolean).length;

  const handleConfirm = async () => {
    if (!doc) return;
    const kept = blocks.filter((_, i) => included[i]).map((b) => b.block);
    const filtered = joinBlocks(kept);
    if (!filtered.trim()) {
      setError("Inclua pelo menos um bloco de texto para criar o livro.");
      return;
    }
    setSaving(true);
    const meta = estimateBookMetadata({
      title: doc.title,
      author: doc.author,
      format: doc.format,
      text: filtered,
    });
    Object.assign(meta, sessionSettings, {
      totalSessions: sessionSettings.sessionMode === "time"
        ? 0
        : sessionSettings.sessionMode === "sentences"
          ? buildSentenceSessions(filtered, sessionSettings.sentencesPerSession).length
          : Math.max(1, Math.ceil(includedWords / sessionSettings.wordsPerSession)),
    });
    await onConfirm({ meta, rawContent: doc.text, filteredContent: filtered });
    setSaving(false);
    onClose();
  };

  if (!open) return null;

  const percent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={step === "extracting" ? undefined : onClose}
        className="absolute inset-0 cursor-default bg-[#05090d]/80 backdrop-blur-sm"
      />
      <div className="tb-anim-scale relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#111c28] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-6 sm:p-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-300/10 text-lime-300">
              <i className="ri-upload-cloud-2-line text-xl"></i>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                importar documento
              </div>
              <h2 className="font-serif text-xl text-white">
                {step === "review" ? "Revisar conteúdo" : "Novo livro de prática"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={step === "extracting"}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
            aria-label="Fechar"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 sm:p-7">
          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-400/[0.06] px-4 py-3 text-[13px] text-rose-100">
              <i className="ri-error-warning-line mt-0.5 text-base text-rose-300"></i>
              <span>{error}</span>
            </div>
          )}

          {step === "select" && (
            <div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={`flex flex-col items-center justify-center rounded-3xl border border-dashed px-6 py-14 text-center transition ${
                  dragActive
                    ? "border-lime-300/50 bg-lime-300/[0.05]"
                    : "border-white/12 bg-white/[0.015]"
                }`}
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
                  <i className="ri-file-add-line text-2xl"></i>
                </div>
                <h3 className="font-serif text-lg text-white">
                  Arraste seu documento aqui
                </h3>
                <p className="mt-2 max-w-sm text-[13px] leading-6 text-slate-400">
                  O texto é processado no seu navegador. Nada é enviado para servidores.
                </p>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-lime-200"
                >
                  <i className="ri-folder-open-line text-base"></i>
                  escolher arquivo
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.epub,.txt,application/pdf,application/epub+zip,text/plain"
                  onChange={onInputChange}
                  className="hidden"
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500">
                {["PDF", "EPUB", "TXT"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-semibold tracking-wide"
                  >
                    {label}
                  </span>
                ))}
                <span className="text-slate-600">grandes volumes suportados sem travar</span>
              </div>
            </div>
          )}

          {step === "extracting" && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300/10 text-lime-300">
                <i className="ri-loader-4-line animate-spin text-2xl"></i>
              </div>
              <h3 className="font-serif text-lg text-white">Extraindo o texto</h3>
              <p className="mt-2 text-[13px] text-slate-400">{progress.label}</p>
              <div className="mt-6 w-full max-w-md">
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-lime-300 transition-all duration-200"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-slate-500">
                  <span className="truncate pr-4">{fileName}</span>
                  <span className="tb-mono text-lime-200">{percent}%</span>
                </div>
              </div>
            </div>
          )}

          {step === "review" && doc && (
            <>
              <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-lime-300">modo das sessões</div>
                <div className="flex flex-wrap gap-3">
                  <select className="rounded-xl border border-white/10 bg-[#111c28] px-3 py-2 text-sm text-slate-200" value={sessionSettings.sessionMode} onChange={e => setSessionSettings(v => ({ ...v, sessionMode: e.target.value as SessionSettings["sessionMode"] }))}>
                    <option value="words">Por palavras</option><option value="sentences">Por frases</option><option value="time">Por tempo</option>
                  </select>
                  {sessionSettings.sessionMode === "words" && <select className="rounded-xl border border-white/10 bg-[#111c28] px-3 py-2 text-sm text-slate-200" value={sessionSettings.wordsPerSession} onChange={e => setSessionSettings(v => ({ ...v, wordsPerSession: Number(e.target.value) as SessionSettings["wordsPerSession"] }))}><option value={100}>100 palavras</option><option value={250}>250 palavras</option><option value={500}>500 palavras</option></select>}
                  {sessionSettings.sessionMode === "sentences" && <select className="rounded-xl border border-white/10 bg-[#111c28] px-3 py-2 text-sm text-slate-200" value={sessionSettings.sentencesPerSession} onChange={e => setSessionSettings(v => ({ ...v, sentencesPerSession: Number(e.target.value) as 1 | 2 }))}><option value={1}>1 frase</option><option value={2}>2 frases</option></select>}
                  {sessionSettings.sessionMode === "time" && <select className="rounded-xl border border-white/10 bg-[#111c28] px-3 py-2 text-sm text-slate-200" value={sessionSettings.durationMinutes ?? "free"} onChange={e => setSessionSettings(v => ({ ...v, durationMinutes: e.target.value === "free" ? null : Number(e.target.value) as SessionSettings["durationMinutes"] }))}><option value={1}>1 minuto</option><option value={2}>2 minutos</option><option value={3}>3 minutos</option><option value={4}>4 minutos</option><option value={5}>5 minutos</option><option value="free">Livre</option></select>}
                </div>
              </div>
              <BlockReview
                blocks={blocks}
                included={included}
                onToggle={toggleBlock}
                onSetAll={(value) => setIncluded(blocks.map(() => value))}
                onSetNarrativeOnly={() =>
                  setIncluded(blocks.map((b) => b.type === "narrative"))
                }
                title={doc.title}
                formatLabel={FORMAT_LABEL[doc.format] ?? doc.format.toUpperCase()}
              />

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-5">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    entrarão nas sessões
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="tb-mono text-2xl text-lime-200">
                      {formatNumber(includedWords)}
                    </span>
                    <span className="text-xs text-slate-500">
                      palavras · {includedCount} de {blocks.length} blocos
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                  >
                    cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={saving || includedWords === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <i className="ri-loader-4-line animate-spin text-base"></i>
                    ) : (
                      <i className="ri-bookmark-3-line text-base"></i>
                    )}
                    adicionar à estante
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
