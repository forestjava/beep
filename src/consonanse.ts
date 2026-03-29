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
 * Tenney по «ступенчатой» цепочке: Σ log₂(nᵢ·dᵢ) для jiFromMidi(mᵢ, mᵢ₊₁),
 * как stacked + productAllStacked + tenneyStacked в ji_chord_intervals.js (порядок нот — как в аккорде сверху вверх).
 */
function tenneyProductStacked(midis: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < midis.length - 1; i++) {
    sum += tenney(jiFromMidi(midis[i]!, midis[i + 1]!));
  }
  return sum;
}

/**
 * JI / Tenney-метрика для двух и более MIDI.
 * Эксперимент: stacked-интервалы между соседними аргументами (см. ji_chord_intervals.js).
 */
export function getEntropy(...midis: number[]): number {
  const n = midis.length;
  if (n < 2) {
    throw new Error(`getEntropy: expected at least 2 MIDI values, got ${n}`);
  }

  // return tenneyProductStacked(midis);

  // Корень — первый аргумент; сумма Tenney от корня к остальным (ji_matrix_midi_21_108.js).
  const root = midis[0]!;
  return tenneyProductFromRoot(root, midis.slice(1));
}
