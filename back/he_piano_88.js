// he_piano_88.js
import { EntropyCalculator } from 'harmonic-entropy';

// Параметры HE:
// maxCents >= максимальный интервал (88 клавиш ≈ 87 полутонов ≈ 8700 центов)
const entropy = new EntropyCalculator({
    maxCents: 9000,  // с запасом
    // остальные параметры берутся по умолчанию:
    // N: 10000, s: 0.01, a: 1, series: 'tenney'
});

// 88 клавиш стандартного рояля: A0 (MIDI 21) .. C8 (MIDI 108)[web:88][web:93]
// Интервал в полутонах = разность MIDI-номеров
// HE считаем по cents = semitones * 100
const N_KEYS = 88;
const A0_MIDI = 21;

// Соберём все пары (i < j) и посчитаем HE
const rows = [];
for (let i = 0; i < N_KEYS; i++) {
    for (let j = i + 1; j < N_KEYS; j++) {
        const midi1 = A0_MIDI + i;
        const midi2 = A0_MIDI + j;
        const semitones = midi2 - midi1;
        const cents = semitones * 100;

        const he = entropy.ofCents(cents); // натуральные единицы (нат)[web:21]

        rows.push({
            key1Index: i + 1,      // 1..88
            key2Index: j + 1,
            midi1,
            midi2,
            semitones,
            cents,
            he
        });
    }
}

// Вывод в CSV‑формате (можно перекинуть в pandas / Excel)
console.log('key1,key2,midi1,midi2,semitones,cents,he');
for (const r of rows) {
    console.log(
        [
            r.key1Index,
            r.key2Index,
            r.midi1,
            r.midi2,
            r.semitones,
            r.cents,
            r.he.toFixed(9)
        ].join(',')
    );
}