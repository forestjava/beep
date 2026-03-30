export function formatKnobReadout(u: number): string {
  const r = Math.round(u * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
