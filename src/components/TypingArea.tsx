import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import type { ErrorPatternStat, SessionResult } from "@/types";
import StatsBar from "@/components/StatsBar";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import { alignTyping, countErrorSlots, type TypingError } from "@/utils/typingMetrics";
import { computeAccuracy, computeWpm } from "@/utils/sessions";

interface TypingAreaProps {
  text: string;
  onComplete: (result: SessionResult) => void;
}

interface HistoryEntry {
  kind: TypingError["kind"];
  expected: string;
  got: string;
  corrected: boolean;
}

const EMPTY_MARK = "∅";

export default function TypingArea({ text, onComplete }: TypingAreaProps) {
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentRef = useRef<HTMLSpanElement>(null);
  const typedRef = useRef("");
  const startedRef = useRef<number | null>(null);
  const grossRef = useRef(0);
  const backspacesRef = useRef(0);
  const historyRef = useRef<Map<string, HistoryEntry>>(new Map());
  const reportedRef = useRef(false);
  const completedRef = useRef(false);

  // Current state of the text, recomputed whenever `typed` changes.
  const alignment = useMemo(() => alignTyping(typed, text), [typed, text]);
  const { cells, counts, cursorTargetIndex, errors, complete } = alignment;
  const targetLength = text.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, [text]);

  useEffect(() => {
    if (!startedAt || done) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 400);
    return () => window.clearInterval(id);
  }, [startedAt, done]);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [typed.length]);

  // Keep the error history in sync: present errors become "committed", and
  // errors that disappeared (fixed with backspace) are marked as corrected.
  useEffect(() => {
    const current = new Set(errors.map((e) => e.key));
    errors.forEach((e) => {
      const previous = historyRef.current.get(e.key);
      if (previous) {
        previous.kind = e.kind;
        previous.expected = e.expected;
        previous.got = e.got;
        previous.corrected = false;
      } else {
        historyRef.current.set(e.key, {
          kind: e.kind,
          expected: e.expected,
          got: e.got,
          corrected: false,
        });
      }
    });
    historyRef.current.forEach((entry, key) => {
      if (!current.has(key)) entry.corrected = true;
    });
  }, [errors]);

  const reset = useCallback(() => {
    typedRef.current = "";
    startedRef.current = null;
    grossRef.current = 0;
    backspacesRef.current = 0;
    historyRef.current = new Map();
    reportedRef.current = false;
    completedRef.current = false;
    setTyped("");
    setStartedAt(null);
    setNow(Date.now());
    setDone(false);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    reset();
  }, [text, reset]);

  // The session ends once the cursor has passed the whole text.
  useEffect(() => {
    if (complete && !completedRef.current) {
      completedRef.current = true;
      setDone(true);
    }
  }, [complete]);

  // Build and report the final result once, after history reconciliation.
  useEffect(() => {
    if (!done || reportedRef.current) return;
    reportedRef.current = true;

    const start = startedRef.current ?? Date.now();
    const ms = Math.max(Date.now() - start, 1);

    const entries = Array.from(historyRef.current.values());
    const totalErrors = entries.length;
    const correctedErrors = entries.filter((e) => e.corrected).length;

    const patternMap = new Map<string, ErrorPatternStat>();
    entries.forEach((e) => {
      const expected = e.expected || EMPTY_MARK;
      const got = e.got || EMPTY_MARK;
      const key = `${expected}\u0000${got}`;
      const found = patternMap.get(key);
      if (found) found.count += 1;
      else patternMap.set(key, { expected, got, count: 1 });
    });
    const patterns = Array.from(patternMap.values()).sort((a, b) => b.count - a.count);

    const slots = countErrorSlots(counts);

    onComplete({
      wpm: computeWpm(counts.correct, ms),
      rawWpm: computeWpm(grossRef.current, ms),
      accuracy: slots > 0 ? computeAccuracy(counts.correct, slots) : 100,
      seconds: Math.round(ms / 1000),
      charactersTyped: grossRef.current,
      correctCharacters: counts.correct,
      totalErrors,
      correctedErrors,
      uncorrectedErrors: totalErrors - correctedErrors,
      substitutions: entries.filter((e) => e.kind === "sub").length,
      extraCharacters: entries.filter((e) => e.kind === "extra").length,
      missingCharacters: entries.filter((e) => e.kind === "missing").length,
      backspaces: backspacesRef.current,
      patterns,
    });
  }, [done, counts, onComplete]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (done) return;
    const value = event.target.value;
    const previous = typedRef.current;

    if (startedRef.current === null && value.length > 0) {
      startedRef.current = Date.now();
      setStartedAt(startedRef.current);
      setNow(startedRef.current);
    }

    if (value.length > previous.length) {
      grossRef.current += value.length - previous.length;
    } else if (value.length < previous.length) {
      backspacesRef.current += 1;
    }

    typedRef.current = value;
    setTyped(value);
  };

  const elapsedMs = startedAt ? Math.max(now - startedAt, 1) : 0;
  const liveNetWpm = elapsedMs ? computeWpm(counts.correct, elapsedMs) : 0;
  const liveRawWpm = elapsedMs ? computeWpm(grossRef.current, elapsedMs) : 0;
  const liveSlots = countErrorSlots(counts);
  const liveAccuracy = liveSlots > 0 ? computeAccuracy(counts.correct, liveSlots) : 100;
  const progress = targetLength
    ? Math.min(100, (cursorTargetIndex / targetLength) * 100)
    : 0;
  const seconds = Math.round(elapsedMs / 1000);
  const nextChar = done ? "" : text[cursorTargetIndex] ?? "";
  const caretIndex = done ? -1 : cells.findIndex((cell) => cell.status === "pending");

  const renderCell = (status: string): string => {
    switch (status) {
      case "correct":
        return "text-slate-100";
      case "incorrect":
        return "rounded bg-rose-500/15 text-rose-300";
      case "extra":
        return "rounded bg-rose-500/20 text-rose-200 underline decoration-rose-400/60 decoration-dashed";
      case "missing":
        return "rounded bg-amber-400/10 text-amber-200/80 underline decoration-amber-300/50 decoration-dotted";
      default:
        return "text-slate-600";
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <StatsBar
        wpm={liveNetWpm}
        rawWpm={liveRawWpm}
        accuracy={liveAccuracy}
        seconds={seconds}
        progress={progress}
      />

      <div
        className="relative rounded-[28px] border border-white/[0.08] bg-[#111c28] p-6 sm:p-8"
        onClick={() => inputRef.current?.focus()}
        role="presentation"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            digite o trecho
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <i className="ri-restart-line text-sm"></i>
            reiniciar
          </button>
        </div>

        <div className="max-h-[340px] overflow-y-auto pr-2 font-serif text-[19px] leading-[2.1] tracking-[0.01em] whitespace-pre-wrap break-words">
          {cells.map((cell, index) => {
            if (index === caretIndex) {
              return (
                <span key={index} ref={currentRef} className="text-white">
                  <span className="tb-caret text-white">{cell.char}</span>
                </span>
              );
            }
            let inner: ReactNode = cell.char;
            if (cell.status === "extra") {
              inner = cell.char === " " ? "␣" : cell.char;
            }
            return (
              <span key={index} className={renderCell(cell.status)}>
                {inner}
              </span>
            );
          })}
          {caretIndex === -1 && !done && (
            <span ref={currentRef} className="tb-caret text-white">
              {" "}
            </span>
          )}
        </div>

        <input
          ref={inputRef}
          value={typed}
          onChange={handleChange}
          disabled={done}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Digite o texto"
          className="pointer-events-none absolute left-4 top-4 h-px w-px opacity-0"
        />

        {done && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-lime-300/30 bg-lime-300/[0.08] px-4 py-3 text-[13px] text-lime-100">
            <i className="ri-checkbox-circle-line text-base text-lime-300"></i>
            Sessão concluída. Confira o resultado abaixo.
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <p className="text-[13px] leading-6 text-slate-500">
          Clique na área acima e digite o texto. Caracteres a mais ficam em vermelho, trechos
          pulados em âmbar — corrigir com backspace registra o erro como resolvido, sem
          bagunçar a precisão.
        </p>
      </div>

      <VirtualKeyboard nextChar={nextChar} />
    </div>
  );
}