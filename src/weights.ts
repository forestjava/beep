

function createWeightedPicker(weights: number[]) {
  const cumulative: number[] = [];
  let sum = 0;
  for (const w of weights) {
    if (w < 0) throw new Error('weights must be non-negative');
    sum += w;
    cumulative.push(sum);
  }
  const total = sum;

  return function pickIndex(): number {
    const r = Math.random() * total;
    for (let i = 0; i < cumulative.length; i++) {
      if (r < cumulative[i]) return i;
    }
    return cumulative.length - 1;
  };
}

export function randomEntropyIndex(entropies: number[]): number {
  if (entropies.length === 0) {
    throw new Error("randomEntropyIndex: entropies must be non-empty");
  }
  const max = Math.max(...entropies);
  const weights = entropies.map((entropy) => (max - entropy) / max);
  const pickIndex = createWeightedPicker(weights);
  return pickIndex();
}
