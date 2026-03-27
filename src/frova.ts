import Fraction from "fraction.js";

/** Default upper bound on the denominator when approximating the frequency ratio. */
export const DEFAULT_FROVA_MAX_DENOM = 16;

/**
 * Best rational approximation to `ratio` with denominator ≤ `maxDenom`, using continued-fraction
 * convergents (and the semiconvergent tie-break from Python's `Fraction.limit_denominator`).
 */
function approximateRatioWithBoundedDenominator(
  ratio: Fraction,
  maxDenom: number,
): Fraction {
  const terms = ratio.abs().toContinued();
  const maxD = BigInt(maxDenom);
  let hM2 = 0n;
  let hM1 = 1n;
  let kM2 = 1n;
  let kM1 = 0n;
  const target = ratio.abs().valueOf();

  for (let i = 0; i < terms.length; i++) {
    const a = terms[i];
    const h = a * hM1 + hM2;
    const k = a * kM1 + kM2;
    if (k > maxD) {
      if (kM1 === 0n) {
        return new Fraction(1n, 1n);
      }
      const t = (maxD - kM2) / kM1;
      const hCand = t * hM1 + hM2;
      const kCand = t * kM1 + kM2;
      const errCand = Math.abs(Number(hCand) / Number(kCand) - target);
      const errPrev = Math.abs(Number(hM1) / Number(kM1) - target);
      if (errCand <= errPrev) {
        return new Fraction(hCand, kCand);
      }
      return new Fraction(hM1, kM1);
    }
    hM2 = hM1;
    hM1 = h;
    kM2 = kM1;
    kM1 = k;
  }

  return new Fraction(hM1, kM1);
}

/**
 * Dimensionless Frova-style index C(m,n) = (m + n) / (m · n) for two positive frequencies.
 * The interval is reduced to a frequency ratio r = max(f1,f2) / min(f1,f2), approximated by a
 * reduced fraction m:n with denominator ≤ `maxDenom` (via `fraction.js` continued fractions), then C is applied.
 * Larger values correspond to simpler / more consonant intervals in this sense (e.g. unison > fifth).
 */
export function frovaIndex(
  f1: number,
  f2: number,
  maxDenom: number = DEFAULT_FROVA_MAX_DENOM,
): number {
  if (f1 <= 0 || f2 <= 0) {
    throw new RangeError("frovaIndex: frequencies must be positive");
  }
  const maxF = Math.max(f1, f2);
  const minF = Math.min(f1, f2);
  const ratioFrac = new Fraction(maxF).div(minF);
  const { n: m, d: n } = approximateRatioWithBoundedDenominator(ratioFrac, maxDenom);
  const mNum = Number(m);
  const nNum = Number(n);
  return (mNum + nNum) / (mNum * nNum);
}
