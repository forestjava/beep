// ji_chord_intervals.js
// JI-отношения для аккордов (как в ji_matrix_midi_21_108.js): от базы и по ступеням.
// Произведение всех чисел в парах [n,d]: Π n_i * Π d_i (= Benedetti для списка).

const semitoneToJI = {
    0: [1, 1],
    1: [16, 15],
    2: [9, 8],
    3: [6, 5],
    4: [5, 4],
    5: [4, 3],
    6: [10, 7],
    7: [3, 2],
    8: [8, 5],
    9: [5, 3],
    10: [7, 4],
    11: [15, 8],
};

function gcd(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return Math.abs(a);
}

function normalizeRatio(n, d) {
    const g = gcd(n, d);
    return [n / g, d / g];
}

/** Положительный интервал вверх от 0 (как jiFromMidi(0, semi) при semi >= 0). */
function jiFromSemitonesUp(semitones) {
    const s = semitones | 0;
    if (s < 0) throw new Error(`expected upward semitones, got ${semitones}`);
    const octaves = Math.floor(s / 12);
    const k = s % 12;
    let [nBase, dBase] = semitoneToJI[k];
    if (octaves > 0) {
        nBase *= 2 ** octaves;
    }
    return normalizeRatio(nBase, dBase);
}

function formatRatio([n, d]) {
    return `${n}/${d}`;
}

function productOfRatios(ratios) {
    let p = 1;
    for (const r of ratios) {
        for (const x of r) {
            p *= x;
        }
    }
    return p;
}

function tenneyFromBenedetti(b) {
    return Math.log2(b);
}

/**
 * Тоны аккорда над корнем (полутоны вверх), по возрастанию высоты.
 * add9: последний ступенчатый интервал G→D = квинта (7 п.т.), не секста.
 */
const chords = [
    { name: 'Мажорное трезвучие (C)', tones: [4, 7] },
    { name: 'Минорное трезвучие (Cm)', tones: [3, 7] },
    { name: 'Доминантовый септаккорд (C7)', tones: [4, 7, 10] },
    { name: 'Минорный септаккорд (Cm7)', tones: [3, 7, 10] },
    { name: 'Мажорный септаккорд (Cmaj7)', tones: [4, 7, 11] },
    { name: 'Подвесной Sus2 (Csus2)', tones: [2, 7] },
    { name: 'Подвесной Sus4 (Csus4)', tones: [5, 7] },
    { name: 'Мажорный add9 (Cadd9)', tones: [4, 7, 14] },
    { name: 'Минорный add9 (Cmadd9)', tones: [3, 7, 14] },
    { name: 'Мажорный с секстой (C6)', tones: [4, 7, 9] },
    { name: 'Минорный с секстой (Cm6)', tones: [3, 7, 9] },
    { name: 'Уменьшённое трезвучие (Cdim)', tones: [3, 6] },
    { name: 'Полууменьшенный септаккорд (Cm7♭5)', tones: [3, 6, 10] },
    { name: 'Полностью уменьшённый септаккорд (C°7)', tones: [3, 6, 9] },
];

function analyzeChord({ name, tones }) {
    const fromRoot = tones.map((t) => jiFromSemitonesUp(t));
    const stacked = [];
    let prev = 0;
    for (const t of tones) {
        stacked.push(jiFromSemitonesUp(t - prev));
        prev = t;
    }
    const prodRoot = productOfRatios(fromRoot);
    const prodStack = productOfRatios(stacked);
    return {
        name,
        tones,
        fromRoot: fromRoot.map(formatRatio),
        stacked: stacked.map(formatRatio),
        productAllFromRoot: prodRoot,
        productAllStacked: prodStack,
        tenneyFromRoot: tenneyFromBenedetti(prodRoot),
        tenneyStacked: tenneyFromBenedetti(prodStack),
    };
}

function main() {
    const rows = chords.map(analyzeChord);
    for (const r of rows) {
        console.log('---');
        console.log(r.name);
        console.log('  Относительно базы:', r.fromRoot.join(', '));
        console.log('  Относительно следующего звука:', r.stacked.join(', '));
        console.log(
            '  Произведение всех n и d от базы:',
            r.productAllFromRoot,
            '  Tenney log2:',
            r.tenneyFromRoot.toFixed(4),
        );
        console.log(
            '  Произведение всех n и d по ступеням:',
            r.productAllStacked,
            '  Tenney log2:',
            r.tenneyStacked.toFixed(4),
        );
    }
}

main();
