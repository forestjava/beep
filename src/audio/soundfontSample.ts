/** Gleitz FluidR3_GM *-mp3 sets use flats (Db, Eb, …), not Cs/Ds. */
const NOTE_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

/** Gleitz / midi-js soundfont naming: `{name}{octave}.{ext}` (e.g. A0.mp3, Db4.mp3). */
export function midiToSoundfontFilename(midi: number, fileExt: string): string {
  const name = NOTE_NAMES[midi % 12]!;
  const octave = Math.floor(midi / 12) - 1;
  return `${name}${octave}.${fileExt}`;
}

export async function loadSampleBuffer(
  context: BaseAudioContext,
  url: string,
): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`sample fetch failed ${res.status}: ${url}`);
  }
  const data = await res.arrayBuffer();
  return context.decodeAudioData(data.slice(0));
}
