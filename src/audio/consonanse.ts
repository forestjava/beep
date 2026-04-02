import type { JI } from "./jiFromMidi";
import { jiFromMidi } from "./jiFromMidi";

/*
 * --- Tenney (предыдущий эксперимент): log2 от произведения JI ---
 *
 * function tenney([n, d]: JI): number {
 *   return Math.log2(n * d);
 * }
 *
 * function tenneyProductFromRoot(rootMidi: number, otherMidis: readonly number[]): number {
 *   let sum = 0;
 *   for (const m of otherMidis) {
 *     sum += tenney(jiFromMidi(rootMidi, m));
 *   }
 *   return sum;
 * }
 *
 * function tenneyProductStacked(midis: readonly number[]): number {
 *   let sum = 0;
 *   for (let i = 0; i < midis.length - 1; i++) {
 *     sum += tenney(jiFromMidi(midis[i]!, midis[i + 1]!));
 *   }
 *   return sum;
 * }
 */

/** Benedetti: произведение n·d для одного JI-интервала (как в ji_matrix_midi_21_108.js). */
function benedetti([n, d]: JI): number {
  return n * d;
}

/**
 * Benedetti от корня: Π (nᵢ·dᵢ) для интервалов jiFromMidi(root, mᵢ).
 * Связь с Tenney: tenneyProductFromRoot = log₂(этого произведения).
 */
function benedettiProductFromRoot(rootMidi: number, otherMidis: readonly number[]): number {
  let prod = 1;
  for (const m of otherMidis) {
    prod *= benedetti(jiFromMidi(rootMidi, m));
  }
  return prod;
}

/**
 * Benedetti по «ступенчатой» цепочке: Π (nᵢ·dᵢ) для jiFromMidi(mᵢ, mᵢ₊₁).
 * Связь с Tenney: tenneyProductStacked = log₂(этого произведения).
 */
export function benedettiProductStacked(midis: readonly number[]): number {
  let prod = 1;
  for (let i = 0; i < midis.length - 1; i++) {
    prod *= benedetti(jiFromMidi(midis[i]!, midis[i + 1]!));
  }
  return prod;
}

/**
 * JI-метрика для двух и более MIDI (эксперимент: Benedetti — произведение n·d).
 * Корень — первый аргумент; произведение Benedetti от корня к остальным (как ji_matrix_midi_21_108.js / аналог product от корня).
 *
 * Предыдущая ветка (Tenney):
 *   const root = midis[0]!;
 *   return tenneyProductFromRoot(root, midis.slice(1));
 *   // или: return tenneyProductStacked(midis);
 */
export function getEntropy(...midis: number[]): number {
  const n = midis.length;
  if (n < 2) {
    throw new Error(`getEntropy: expected at least 2 MIDI values, got ${n}`);
  }

  //const root = midis[0]!;
  // return tenneyProductStacked(midis);
  // return tenneyProductFromRoot(root, midis.slice(1));
  // return benedettiProductFromRoot(root, midis.slice(1));
  return benedettiProductStacked(midis);
}
