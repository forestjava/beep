import type { LifeCell } from "./LifeCell";
import type { JI } from "./jiFromMidi";
import { jiFromMidi } from "./jiFromMidi";

function tenney([n, d]: JI): number {
  return Math.log2(n * d);
}

/**
 * Tenney от корня: Σ log₂(nᵢ·dᵢ) для интервалов jiFromMidi(root, mᵢ).
 * Эквивалентно log₂(Π (nᵢ·dᵢ)) — как productAllFromRoot + tenneyFromRoot в ji_chord_intervals.js.
 */
function tenneyProductFromRoot(rootMidi: number, otherMidis: readonly number[]): number {
  let sum = 0;
  for (const m of otherMidis) {
    sum += tenney(jiFromMidi(rootMidi, m));
  }
  return sum;
}

/**
 * JI / Tenney-метрика для двух и более клеток: аккордная последовательность —
 * клетки по возрастанию MIDI; корень — sequence[0], сумма Tenney по интервалам
 * от корня к остальным (карта как в ji_matrix_midi_21_108.js).
 */
export function getEntropy(...cells: LifeCell[]): number {
  const n = cells.length;
  if (n < 2) {
    throw new Error(`getEntropy: expected at least 2 cells, got ${n}`);
  }
  const sequence = [...cells]; //.sort((a, b) => a.midi - b.midi);
  const root = sequence[0]!.midi;
  const otherMidis = sequence.slice(1).map((c) => c.midi);
  return tenneyProductFromRoot(root, otherMidis);
}
