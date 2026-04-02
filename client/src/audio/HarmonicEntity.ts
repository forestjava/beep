/**
 * A harmonic sound source described for synthesis: output level and pitch.
 * A future “life” layer may mutate these fields and signal removal when the entity dies.
 */
export type HarmonicEntity = {
  /** Linear gain applied before the destination (typical range ~0–1). */
  gain: number;
  /** Fundamental frequency in hertz. */
  frequency: number;
  /** Stereo panning (-1: left, 0: center, 1: right). */
  pan: number;
};
