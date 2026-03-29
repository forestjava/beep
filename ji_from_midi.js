// ji_from_midi.js

// JI-кандидаты для интервалов внутри октавы (0..11 полутонов)
const semitoneToJI = {
    0: [1, 1],     // прима
    1: [16, 15],   // малая секунда
    2: [9, 8],     // большая секунда
    3: [6, 5],     // малая терция
    4: [5, 4],     // большая терция
    5: [4, 3],     // кварта
    6: [7, 5],     // тритон
    7: [3, 2],     // квинта
    8: [8, 5],     // малая секста
    9: [5, 3],     // большая секста
    10: [7, 4],     // малая септима
    11: [15, 8],    // большая септима
};

function gcd(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return Math.abs(a);
}

function normalizeRatio(n, d) {
    const g = gcd(n, d);
    return [n / g, d / g];
}

// Главная функция: JI(midi1, midi2) → [n, d]
export function jiFromMidi(midi1, midi2) {
    const semitones = midi2 - midi1;
    const absSemi = Math.abs(semitones);

    const octaves = Math.floor(absSemi / 12);
    const k = absSemi % 12;

    let [nBase, dBase] = semitoneToJI[k];

    if (octaves > 0) {
        const factor = 2 ** octaves;
        if (semitones >= 0) {
            nBase *= factor;   // вверх: умножаем числитель
        } else {
            dBase *= factor;   // вниз: умножаем знаменатель
        }
    }

    return normalizeRatio(nBase, dBase);
}

// Примеры использования:
console.log('A4–A4:', jiFromMidi(69, 69)); // [1,1]
console.log('A4–E5:', jiFromMidi(69, 76)); // квинта вверх → [3,2]
console.log('A4–A5:', jiFromMidi(69, 81)); // октава вверх → [2,1]
console.log('A3–A5:', jiFromMidi(57, 81)); // 24 полутонов → [4,1]

console.log(jiFromMidi(20, 20));
console.log(jiFromMidi(20, 32));
console.log(jiFromMidi(20, 31));
console.log(jiFromMidi(20, 33));

console.log(jiFromMidi(32, 34));
console.log(jiFromMidi(32, 38));