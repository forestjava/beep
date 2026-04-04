import type { LifeCell } from "./LifeCell";
import { getEntropy } from "./consonanse";

export type FindGroupGreedyResult = {
  team: LifeCell[];
  /** Энтропия аккорда для {@link team}, если в команде ≥ 2 клеток; иначе 0. */
  teamEntropy: number;
};

/**
 * Жадно наращивает группу: обход кандидатов по убыванию {@link LifeCell.power},
 * на каждом шаге пробует `candidate = [...current, x]`. Корень для `getEntropy` —
 * первая клетка в `candidate` (первый MIDI).
 */
export function findGroupGreedy(candidates: LifeCell[], maxEntropy: number): FindGroupGreedyResult {
  const order = [...candidates].sort((a, b) => {
    if (b.power !== a.power) return b.power - a.power;
    return b.midi - a.midi;
  });

  let current: LifeCell[] = [];
  let best: LifeCell[] = [];
  let bestEntropy = 0;

  for (const x of order) {
    const candidate = [...current, x];

    if (candidate.length < 2) {
      current = candidate;
      if (current.length > best.length) {
        best = [...current];
      }
      continue;
    }

    const e = getEntropy(...candidate.map((c) => c.midi));
    if (e < maxEntropy) {
      current = candidate;
      if (current.length > best.length) {
        best = [...current];
        bestEntropy = e;
      }
    }
  }

  return { team: best, teamEntropy: bestEntropy };
}
