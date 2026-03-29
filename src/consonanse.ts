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
 * JI / Tenney-метрика для двух и более MIDI: корень — первый аргумент,
 * сумма Tenney по интервалам от корня к остальным (карта как в ji_matrix_midi_21_108.js).
 */
export function getEntropy(...midis: number[]): number {
  const n = midis.length;
  if (n < 2) {
    throw new Error(`getEntropy: expected at least 2 MIDI values, got ${n}`);
  }
  const root = midis[0]!;
  return tenneyProductFromRoot(root, midis.slice(1));
}
