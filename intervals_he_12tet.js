// intervals_he_12tet.js
import { EntropyCalculator } from 'harmonic-entropy';

// Параметры HE в духе Эрлиха / Tonalsoft[web:21][web:43]
const entropy = new EntropyCalculator({
    maxCents: 9000,  // до 87 полутонов = 8700 центов
    N: 10000,
    s: 0.01,
    a: 1,
    series: 'tenney',
});

// 12-TET: интервал в k полутонах → ratio = 2^(k/12)
function ratioFromSemitones(k) {
    return Math.pow(2, k / 12);
}

// Benedetti и Tenney для дроби n/d ≈ ratio.
// Здесь мы не восстанавливаем точную JI-дробь, а используем
// «эффективные» n,d из 2^(k/12). Для настоящего JI нужно подставлять
// конкретные n/d (как в таблице Эрлиха), но для 12-TET это
// просто формальная метка.
function benedettiFromRatio(r) {
    // условно n=r, d=1
    const n = r;
    const d = 1;
    return n * d;
}

function tenneyFromRatio(r) {
    // Tenney height = log2(n*d); здесь n=r, d=1 → log2(r)
    return Math.log2(r);
}

// Таблица по всем интервалам 0..87 полутонов
console.log('semitones,cents,ratio,benedetti,tenney,he');

for (let k = 0; k <= 87; k++) {
    const cents = k * 100;
    const ratio = ratioFromSemitones(k);
    const nd = benedettiFromRatio(ratio);
    const th = tenneyFromRatio(ratio);
    const he = entropy.ofCents(cents); // HE в натах[web:21]

    console.log([
        k,
        cents,
        ratio.toFixed(6),
        nd.toFixed(6),
        th.toFixed(6),
        he.toFixed(9),
    ].join(','));
}