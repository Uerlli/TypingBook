/**
 * Typing measurement model.
 *
 * The old implementation compared `typed[i]` against `target[i]` index by
 * index. That breaks as soon as the user inserts an extra character: every
 * following character is shifted by one, so a single mistake was reported as
 * a long artificial run of errors. It also counted an error forever, even
 * after the user pressed Backspace and fixed it.
 *
 * This module replaces that with a cursor-based alignment that:
 *  - walks `typed` and `target` together with a small look-ahead so it can tell
 *    a substitution apart from an inserted (extra) character or a skipped
 *    (missing) expected character — one insert no longer cascades;
 *  - produces a cell list for rendering (each target/t yped character with its
 *    own status) plus aggregate counts;
 *  - exposes the *current* error set, keyed by a stable identity, so the caller
 *    can keep two separate notions: the present state of the text and the
 *    history of errors that were committed (and possibly corrected).
 *
 * Nothing here is specific to a language or a document.
 */

export type CellStatus = "correct" | "incorrect" | "extra" | "missing" | "pending";

export interface TypingCell {
  /** Character to render (target char, or the typed char for an extra). */
  char: string;
  status: CellStatus;
  /** Index in the target text, when the cell refers to an expected character. */
  targetIndex: number | null;
  /** Index in the typed text, when the cell refers to a typed character. */
  typedIndex: number | null;
}

export type TypingErrorKind = "sub" | "missing" | "extra";

export interface TypingError {
  /** Stable identity across keystrokes (used to detect corrections). */
  key: string;
  kind: TypingErrorKind;
  expected: string;
  got: string;
  targetIndex: number;
}

export interface AlignmentCounts {
  /** Typed characters currently matching the expected text. */
  correct: number;
  /** Typed characters replacing a different expected character. */
  incorrect: number;
  /** Typed characters with no expected counterpart (insertions). */
  extra: number;
  /** Expected characters the user skipped over. */
  missing: number;
  /** Expected characters not reached yet. */
  pending: number;
}

export interface AlignmentResult {
  cells: TypingCell[];
  counts: AlignmentCounts;
  /** First expected character not yet consumed (cursor position). */
  cursorTargetIndex: number;
  /** Current errors, with stable keys, for history reconciliation. */
  errors: TypingError[];
  /** True once the cursor passed the whole text with enough keystrokes. */
  complete: boolean;
}

/** How far ahead we look to decide between substitution/extra/missing. */
const LOOKAHEAD = 6;

/**
 * Align the typed text against the target using a cursor + small look-ahead.
 *
 * At every mismatch we check whether the next expected character appears a
 * couple of typed characters later (=> the typed char was extra), or whether
 * the typed character matches an upcoming expected one (=> an expected char was
 * skipped). Otherwise it is a plain substitution. This keeps a single insert
 * from turning into a cascade of fake errors.
 */
export function alignTyping(typed: string, target: string): AlignmentResult {
  const n = typed.length;
  const m = target.length;

  const cells: TypingCell[] = [];
  const errors: TypingError[] = [];
  const counts: AlignmentCounts = {
    correct: 0,
    incorrect: 0,
    extra: 0,
    missing: 0,
    pending: 0,
  };

  let i = 0; // cursor in typed
  let j = 0; // cursor in target
  const extraOrdinal = new Map<number, number>();

  const pushExtra = (char: string, typedIndex: number) => {
    const ordinal = extraOrdinal.get(j) ?? 0;
    extraOrdinal.set(j, ordinal + 1);
    cells.push({ char, status: "extra", targetIndex: null, typedIndex });
    counts.extra += 1;
    errors.push({
      key: `x:${j}:${ordinal}`,
      kind: "extra",
      expected: "",
      got: char,
      targetIndex: j,
    });
  };

  while (i < n) {
    if (j < m && typed[i] === target[j]) {
      cells.push({ char: target[j], status: "correct", targetIndex: j, typedIndex: i });
      counts.correct += 1;
      i += 1;
      j += 1;
      continue;
    }

    // Everything left in `typed` has no expected counterpart.
    if (j >= m) {
      pushExtra(typed[i], i);
      i += 1;
      continue;
    }

    // Extra char: the expected char shows up a bit later in `typed`.
    let extraK = 0;
    for (let k = 1; k <= LOOKAHEAD; k += 1) {
      if (i + k < n && typed[i + k] === target[j]) {
        extraK = k;
        break;
      }
    }

    // Missing char: the typed char matches an upcoming expected char.
    let skipK = 0;
    for (let k = 1; k <= LOOKAHEAD; k += 1) {
      if (j + k < m && typed[i] === target[j + k]) {
        skipK = k;
        break;
      }
    }

    if (extraK > 0 && (skipK === 0 || extraK < skipK)) {
      pushExtra(typed[i], i);
      i += 1;
    } else if (skipK > 0 && (extraK === 0 || skipK < extraK)) {
      cells.push({ char: target[j], status: "missing", targetIndex: j, typedIndex: null });
      counts.missing += 1;
      errors.push({
        key: `t:${j}`,
        kind: "missing",
        expected: target[j],
        got: "",
        targetIndex: j,
      });
      j += 1;
    } else {
      cells.push({ char: target[j], status: "incorrect", targetIndex: j, typedIndex: i });
      counts.incorrect += 1;
      errors.push({
        key: `t:${j}`,
        kind: "sub",
        expected: target[j],
        got: typed[i],
        targetIndex: j,
      });
      i += 1;
      j += 1;
    }
  }

  for (let k = j; k < m; k += 1) {
    cells.push({ char: target[k], status: "pending", targetIndex: k, typedIndex: null });
    counts.pending += 1;
  }

  const complete = m > 0 && n >= m && j >= m;

  return { cells, counts, cursorTargetIndex: j, errors, complete };
}

/** Total "slots" counted for accuracy: correct + every kind of mistake. */
export function countErrorSlots(counts: AlignmentCounts): number {
  return counts.correct + counts.incorrect + counts.extra + counts.missing;
}