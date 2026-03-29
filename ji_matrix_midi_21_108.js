// ji_matrix_midi_21_108.js

// --- 1. Базовая карта: 12-TET → JI внутри октавы ---

const semitoneToJI = {
    0: [1, 1],     // прима
    1: [16, 15],   // малая секунда
    2: [9, 8],     // большая секунда
    3: [6, 5],     // малая терция
    4: [5, 4],     // большая терция
    5: [4, 3],     // кварта
    6: [10, 7],     // тритон
    7: [3, 2],     // квинта
    8: [8, 5],     // малая секста
    9: [5, 3],     // большая секста
    10: [7, 4],     // малая септима
    11: [15, 8],    // большая септима
};

// --- 2. Нормализация дробей ---

function gcd(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return Math.abs(a);
}

function normalizeRatio(n, d) {
    const g = gcd(n, d);
    return [n / g, d / g];
}

// --- 3. Главная функция: JI(midi1, midi2) → [n, d] ---

function jiFromMidi(midi1, midi2) {
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

function benedetti([n, d]) {
    return n * d;
}

function tenney([n, d]) {
    return Math.log2(n * d);
}

// --- 4. Строим 88×88 матрицу для MIDI 21–108 (A0..C8) ---

const MIDI_START = 21;       // A0
const N_KEYS = 88;           // A0..C8 включительно

// matrix[i][j] = { n, d, ratio }
const matrix = Array.from({ length: N_KEYS }, () =>
    Array.from({ length: N_KEYS }, () => null),
);

for (let i = 0; i < N_KEYS; i++) {
    const midi1 = MIDI_START + i;
    for (let j = 0; j < N_KEYS; j++) {
        const midi2 = MIDI_START + j;
        const [n, d] = jiFromMidi(midi1, midi2);
        matrix[i][j] = { n, d, ratio: n / d };
    }
}

// --- 5. Поиск экстремумов по n, d и n/d ---

let minN = Infinity, maxN = -Infinity;
let minD = Infinity, maxD = -Infinity;
let minRatio = Infinity, maxRatio = -Infinity;

let minNEntry = null, maxNEntry = null;
let minDEntry = null, maxDEntry = null;
let minRatioEntry = null, maxRatioEntry = null;

let minBen = Infinity, maxBen = -Infinity;
let minTen = Infinity, maxTen = -Infinity;
let minBenEntry = null, maxBenEntry = null;
let minTenEntry = null, maxTenEntry = null;

for (let i = 0; i < N_KEYS; i++) {
    for (let j = 0; j < N_KEYS; j++) {
        const { n, d, ratio } = matrix[i][j];
        const midi1 = MIDI_START + i;
        const midi2 = MIDI_START + j;
        const ben = benedetti([n, d]);
        const ten = tenney([n, d]);

        // n
        if (n < minN) {
            minN = n;
            minNEntry = { midi1, midi2, n, d, ratio };
        }
        if (n > maxN) {
            maxN = n;
            maxNEntry = { midi1, midi2, n, d, ratio };
        }

        // d
        if (d < minD) {
            minD = d;
            minDEntry = { midi1, midi2, n, d, ratio };
        }
        if (d > maxD) {
            maxD = d;
            maxDEntry = { midi1, midi2, n, d, ratio };
        }

        // n/d
        if (ratio < minRatio) {
            minRatio = ratio;
            minRatioEntry = { midi1, midi2, n, d, ratio };
        }
        if (ratio > maxRatio) {
            maxRatio = ratio;
            maxRatioEntry = { midi1, midi2, n, d, ratio };
        }

        // Benedetti n*d
        if (ben < minBen) {
            minBen = ben;
            minBenEntry = { midi1, midi2, n, d, ratio, benedetti: ben, tenney: ten };
        }
        if (ben > maxBen) {
            maxBen = ben;
            maxBenEntry = { midi1, midi2, n, d, ratio, benedetti: ben, tenney: ten };
        }

        // Tenney log2(n*d)
        if (ten < minTen) {
            minTen = ten;
            minTenEntry = { midi1, midi2, n, d, ratio, benedetti: ben, tenney: ten };
        }
        if (ten > maxTen) {
            maxTen = ten;
            maxTenEntry = { midi1, midi2, n, d, ratio, benedetti: ben, tenney: ten };
        }
    }
}

// --- 6. Вывод результатов ---
// 6.1. Экстремумы
console.error('Extremes for n, d, n/d on MIDI 21..108:');
console.error('min n:', minNEntry);
console.error('max n:', maxNEntry);
console.error('min d:', minDEntry);
console.error('max d:', maxDEntry);
console.error('min ratio n/d:', minRatioEntry);
console.error('max ratio n/d:', maxRatioEntry);
console.error('min Benedetti n*d:', minBenEntry);
console.error('max Benedetti n*d:', maxBenEntry);
console.error('min Tenney log2(n*d):', minTenEntry);
console.error('max Tenney log2(n*d):', maxTenEntry);

// // 6.2. Матрица JI как CSV (n/d в ячейке)
// for (let i = 0; i < N_KEYS; i++) {
//     const rowStr = matrix[i]
//         .map(({ n, d }) => `${n}/${d}`)
//         .join(',');
//     console.log(rowStr);
// }