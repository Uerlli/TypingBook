export type CellStatus = "correct" | "incorrect" | "pending";
export interface TypingCell { char: string; status: CellStatus; targetIndex: number; typedIndex: number | null; }
export interface TypingError { key: string; kind: "sub"; expected: string; got: string; targetIndex: number; }
export interface AlignmentCounts { correct: number; incorrect: number; extra: number; missing: number; pending: number; }
export interface AlignmentResult { cells: TypingCell[]; counts: AlignmentCounts; cursorTargetIndex: number; errors: TypingError[]; complete: boolean; }

/** Compares the base letter, so á/à/ã/â count as a, and ç counts as c. */
export function comparableCharacter(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function alignTyping(typed: string, target: string): AlignmentResult {
  typed = typed.normalize("NFC"); target = target.normalize("NFC");
  const counts: AlignmentCounts = { correct: 0, incorrect: 0, extra: 0, missing: 0, pending: 0 };
  const errors: TypingError[] = [];
  const cells = Array.from(target, (char, i) => {
    const status: CellStatus = i >= typed.length ? "pending" : comparableCharacter(typed[i]) === comparableCharacter(char) ? "correct" : "incorrect";
    counts[status] += 1;
    if (status === "incorrect") errors.push({ key: `t:${i}`, kind: "sub", expected: char, got: typed[i], targetIndex: i });
    return { char, status, targetIndex: i, typedIndex: status === "pending" ? null : i };
  });
  return { cells, counts, cursorTargetIndex: Math.min(typed.length, target.length), errors, complete: target.length > 0 && typed.length === target.length };
}

export function countErrorSlots(counts: AlignmentCounts): number { return counts.correct + counts.incorrect; }
