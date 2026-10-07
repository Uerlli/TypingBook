import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode, type KeyboardEvent } from "react";
import type { ErrorPatternStat, SessionResult } from "@/types";
import StatsBar from "@/components/StatsBar";
import VirtualKeyboard from "@/components/VirtualKeyboard";
import { alignTyping, countErrorSlots, type TypingError } from "@/utils/typingMetrics";
import { computeAccuracy, computeWpm } from "@/utils/sessions";

interface TypingAreaProps {
  text: string;
  onComplete: (result: SessionResult) => void;
  timed?: boolean;
  durationMinutes?: number | null;
}

interface HistoryEntry {
  kind: TypingError["kind"];
  expected: string;
  got: string;
  corrected: boolean;
}

const EMPTY_MARK = "∅";

export default function TypingArea({ text, onComplete, timed = false, durationMinutes = null }: TypingAreaProps) {
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
  const correctingWordRef = useRef(false);
  const wordMarksRef = useRef<Map<number, "corrected" | "skipped">>(new Map());
  const [wordMarks, setWordMarks] = useState<Map<number, "corrected" | "skipped">>(new Map());
  const skippedCharsRef = useRef(0);
  const skippedWordsRef = useRef(0);
  const correctedWordsRef = useRef(0);

  // Current state of the text, recomputed whenever `typed` changes.
  const alignment = useMemo(() => alignTyping(typed, text), [typed, text]);
  const { cells, counts, cursorTargetIndex, errors, complete } = alignment;
  const targetLength = text.length;

  useEffect(() => {
    inputRef.current?.focus();
  }, [text]);

  useEffect(() => {
    if (!startedAt || done) return undefined;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (timed && durationMinutes !== null && current - startedAt >= durationMinutes * 60000) setDone(true);
    }, 400);
    return () => window.clearInterval(id);
  }, [startedAt, done, timed, durationMinutes]);

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
    correctingWordRef.current = false;
    wordMarksRef.current = new Map();
    setWordMarks(new Map());
    skippedCharsRef.current = 0;
    skippedWordsRef.current = 0;
    correctedWordsRef.current = 0;
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
    const skippedCharacters = skippedCharsRef.current;

    onComplete({
      wpm: computeWpm(counts.correct, ms),
      rawWpm: computeWpm(grossRef.current, ms),
      accuracy: slots > 0 ? computeAccuracy(counts.correct, slots) : 100,
      seconds: Math.round(ms / 1000),
      charactersTyped: grossRef.current,
      correctCharacters: Math.max(0, counts.correct - skippedCharacters),
      totalErrors,
      correctedErrors: correctedErrors + correctedWordsRef.current,
      correctedWords: correctedWordsRef.current,
      skippedWords: skippedWordsRef.current,
      uncorrectedErrors: Math.max(0, totalErrors - correctedErrors),
      substitutions: entries.filter((e) => e.kind === "sub").length,
      extraCharacters: 0,
      missingCharacters: skippedCharacters,
      backspaces: backspacesRef.current,
      patterns,
      consumedCharacters: typed.length,
      cursorCharacters: typed.length,
    });
  }, [done, counts, onComplete]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (done) return;
    const value = event.target.value.normalize("NFC");
    const previous = typedRef.current;

    if (value.length > targetLength) {
      event.target.value = previous;
      return;
    }

    if (startedRef.current === null && value.length > 0) {
      startedRef.current = Date.now();
      setStartedAt(startedRef.current);
      setNow(startedRef.current);
    }

    if (value.length > previous.length) {
      grossRef.current += value.length - previous.length;
    } else if (value.length < previous.length) {
      backspacesRef.current += 1;
      grossRef.current += 1;
      correctingWordRef.current = true;
    }

    typedRef.current = value;
    setTyped(value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (!correctingWordRef.current) return;
    const value = typedRef.current;
    const wordStart = Math.max(0, text.slice(0, value.length).search(/\S+$/));
    const wordEndMatch = text.slice(wordStart).match(/^\S+/);
    if (!wordEndMatch) return;
    const wordEnd = wordStart + wordEndMatch[0].length;
    const next = text[wordEnd] === " " ? wordEnd + 1 : wordEnd;
    const current = value.slice(wordStart, Math.min(value.length, wordEnd));
    const expected = text.slice(wordStart, wordEnd);
    if (current === expected) {
      correctedWordsRef.current += 1;
      wordMarksRef.current.set(wordStart, "corrected");
    } else {
      skippedWordsRef.current += 1;
      skippedCharsRef.current += Math.max(0, wordEnd - value.length);
      wordMarksRef.current.set(wordStart, "skipped");
    }
    setWordMarks(new Map(wordMarksRef.current));
    const advanced = value + text.slice(value.length, next);
    typedRef.current = advanced;
    setTyped(advanced);
    correctingWordRef.current = false;
    if (advanced.length === targetLength) setDone(true);
  };

  const elapsedMs = startedAt ? Math.max(now - startedAt, 1) : 0;
  const liveNetWpm = elapsedMs ? computeWpm(counts.correct, elapsedMs) : 0;
  const liveRawWpm = elapsedMs ? computeWpm(grossRef.current, elapsedMs) : 0;
  const liveSlots = countErrorSlots(counts);
  const liveAccuracy = liveSlots > 0 ? computeAccuracy(counts.correct, liveSlots) : 100;
  const progress = targetLength
    ? Math.min(100, (cursorTargetIndex / targetLength) * 100)
    : 0;
  const seconds = timed && durationMinutes !== null ? Math.max(0, Math.ceil(durationMinutes * 60 - elapsedMs / 1000)) : Math.round(elapsedMs / 1000);
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
        countdown={timed && durationMinutes !== null}
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
            const wordStart = text.slice(0, index).search(/\S+$/);
            const mark = wordMarks.get(Math.max(0, wordStart));
            return (
              <span key={index} className={`${renderCell(cell.status)} ${mark === "corrected" ? "underline decoration-lime-300 decoration-1 underline-offset-4" : mark === "skipped" ? "underline decoration-amber-300 decoration-1 underline-offset-4" : ""}`}>
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
          onKeyDown={handleKeyDown}
          disabled={done}
          maxLength={targetLength}
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
        {timed && durationMinutes === null && <button type="button" disabled={!startedAt || done} onClick={() => setDone(true)} className="rounded-xl border border-lime-300/30 bg-lime-300/10 px-4 py-3 text-[13px] font-semibold text-lime-200 disabled:opacity-40">encerrar sessão</button>}
      </div>

      <VirtualKeyboard nextChar={nextChar} />
    </div>
  );
}
