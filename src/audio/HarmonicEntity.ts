/**
 * A harmonic sound source described for synthesis: output level and pitch.
 * A future “life” layer may mutate these fields and signal removal when the entity dies.
 */
export type HarmonicEntity = {
  /** Linear gain applied before the destination (typical range ~0–1). */
  gain: number;
  /** MIDI note number (pitch is fixed for the voice after registration). */
  midi: number;
  /** Stereo panning (-1: left, 0: center, 1: right). */
  pan: number;
  /**
   * Expected wall-clock lifetime in ms (e.g. ticks × tick interval). Used only when choosing
   * FluidR3_GM `{instrument}-mp3` at {@link HarmonicEntityPlayer.push}; ignored by the oscillator.
   */
  sampleLifetimeMs: number;
};
