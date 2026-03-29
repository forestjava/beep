// ji_matrix_88_with_octaves.js

// 12-TET → JI базовый (в пределах одной октавы)
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

const N_KEYS = 88;

// Нормализация дроби
function gcd(a, b) {
    while (b !== 0) {
        [a, b] = [b, a % b];
    }
    return Math.abs(a);
}

function normalizeRatio(n, d) {
    const g = gcd(n, d);
    return [n / g, d / g];
}

// Строим матрицу JI с учётом октав
const matrix = [];
for (let i = 0; i < N_KEYS; i++) {
    const row = [];
    for (let j = 0; j < N_KEYS; j++) {
        const semitones = j - i;          // знак сохраняем
        const absSemi = Math.abs(semitones);

        const octaveCount = Math.floor(absSemi / 12); // число полных октав
        const k = absSemi % 12;                       // интервал в пределах октавы

        let [nBase, dBase] = semitoneToJI[k];

        // Учитываем октавы: умножаем на 2^octaveCount
        if (octaveCount > 0) {
            const factor = 2 ** octaveCount;
            // домножаем числитель, если движение вверх; знаменатель — если вниз
            if (semitones >= 0) {
                nBase *= factor;
            } else {
                dBase *= factor;
            }
        }

        const [n, d] = normalizeRatio(nBase, dBase);
        row.push(`${n}/${d}`);
    }
    matrix.push(row);
}

// // Вывод (CSV 88x88)
// for (const row of matrix) {
//     console.log(row.join(','));
// }

console.log(matrix[20][20]);
console.log(matrix[20][32]);
console.log(matrix[20][31]);
console.log(matrix[20][33]);

console.log(matrix[32][34]);
console.log(matrix[32][38]);
