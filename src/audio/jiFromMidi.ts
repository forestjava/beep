export type JI = readonly [n: number, d: number];

// Логика как в ji_matrix_midi_21_108.js: 12-TET шаги → JI [n, d] с октавами.
const semitoneToJI: Record<number, JI> = {
  0: [1, 1],
  1: [16, 15],
  2: [9, 8],
  3: [6, 5],
  4: [5, 4],
  5: [4, 3],
  6: [45, 32],
  7: [3, 2],
  8: [8, 5],
  9: [5, 3],
  10: [9, 5],
  11: [15, 8],
};

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

function normalizeRatio(n: number, d: number): JI {
  const g = gcd(n, d);
  return [n / g, d / g];
}

/** JI-интервал между двумя MIDI-нотами (как в ji_matrix_midi_21_108.js). */
export function jiFromMidi(midi1: number, midi2: number): JI {
  const semitones = midi2 - midi1;
  const absSemi = Math.abs(semitones);
  const octaves = Math.floor(absSemi / 12);
  const k = absSemi % 12;
  const pair = semitoneToJI[k];
  if (pair === undefined) throw new Error(`jiFromMidi: invalid semitone class ${k}`);
  let [nBase, dBase] = pair;
  if (octaves > 0) {
    const factor = 2 ** octaves;
    if (semitones >= 0) nBase *= factor;
    else dBase *= factor;
  }
  return normalizeRatio(nBase, dBase);
}
