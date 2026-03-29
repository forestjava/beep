import type { LifeCell } from "./LifeCell";
import { jiFromMidi } from "./jiFromMidi";

/** Сокращённая JI-доля: взаимно простые положительные целые [числитель, знаменатель]. */
type JiNd = readonly [n: number, d: number];

function benedetti([n, d]: JiNd): number {
    return n * d;
}

function tenney([n, d]: JiNd): number {
    return Math.log2(n * d);
}

/**
 * Harmonic entropy для JI-интервала между двумя MIDI клеток (карта как в ji_matrix_midi_21_108.js).
 * Считает entropy.ofFraction(n / d), где [n, d] = jiFromMidi(midi1, midi2).
 */
export function getConsonance(cell1: LifeCell, cell2: LifeCell): number {
    const [n, d] = jiFromMidi(cell1.midi, cell2.midi);
    const th = tenney([n, d]);
    return th;
}
