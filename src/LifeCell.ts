import type { HarmonicEntity } from "./HarmonicEntity";
import type { HarmonicEntityPlayer } from "./HarmonicEntityPlayer";
import type { LifeRegistry } from "./LifeRegistry";
import { frovaIndex } from "./frova";

export const GAIN_MIN = 0;
export const GAIN_MAX = 0.1;

export const DURATION_MIN = 0;
export const DURATION_MAX = 500;

const CONSONANCE_CONSONANT_MIN = 0.6;
const CONSONANCE_CONSONANT_MAX = 2;
const CONSONANCE_DISSONANT_MAX = 0.4;
const CONSONANCE_DISSONANT_MIN = 0.067;

const INCREASE_GAIN_AFFECT = 1 / 50;
const DECREASE_GAIN_AFFECT = 1 / 100;

const INCREASE_DURATION_AFFECT = 1 / 50;
const DECREASE_DURATION_AFFECT = 1 / 100;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** Maps consonant frovaIndex c ∈ (CONSONANCE_CONSONANT_MIN, CONSONANCE_CONSONANT_MAX] to t ∈ [0, 1]. */
export function normalizeConsonantStrength(c: number): number {
  const t =
    (c - CONSONANCE_CONSONANT_MIN) / (CONSONANCE_CONSONANT_MAX - CONSONANCE_CONSONANT_MIN);
  return clamp(t, 0, 1);
}

/** Maps dissonant frovaIndex d ∈ [CONSONANCE_DISSONANT_MIN, CONSONANCE_DISSONANT_MAX) to u ∈ (0, 1]. */
export function normalizeDissonantStrength(d: number): number {
  const u =
    (CONSONANCE_DISSONANT_MAX - d) /
    (CONSONANCE_DISSONANT_MAX - CONSONANCE_DISSONANT_MIN);
  return clamp(u, 0, 1);
}

export class LifeCell {
  /** Сколько глобальных тактов клетка уже «прожила» в фазе active. */
  private lived = 0;
  /** Порог: смерть при lived >= duration (может меняться при meet). */
  private duration: number;
  private power: number;

  constructor(
    private readonly player: HarmonicEntityPlayer,
    private readonly lifecycle: LifeRegistry<LifeCell>,
    readonly entity: HarmonicEntity,
    initialLifespanTicks: number,
    initialPower: number,
  ) {
    this.duration = initialLifespanTicks;
    this.power = initialPower;
  }

  get frequency(): number {
    return this.entity.frequency;
  }

  getPower(): number {
    return this.power;
  }

  private increaseGain(consonance: number): void {
    const delta = INCREASE_GAIN_AFFECT * consonance * (GAIN_MAX - this.entity.gain);
    this.entity.gain = clamp(this.entity.gain + delta, GAIN_MIN, GAIN_MAX);
    this.player.apply(this.entity);
  }

  private decreaseGain(dissonance: number): void {
    const delta = DECREASE_GAIN_AFFECT * dissonance * (this.entity.gain - GAIN_MIN);
    this.entity.gain = clamp(this.entity.gain - delta, GAIN_MIN, GAIN_MAX);
    this.player.apply(this.entity);
  }

  private increasePower(consonance: number): void {
    const delta = INCREASE_GAIN_AFFECT * consonance * this.power;
    this.power = clamp(this.power + delta, 0, 1);
  }

  private decreasePower(dissonance: number): void {
    const delta = DECREASE_GAIN_AFFECT * dissonance * this.power;
    this.power = clamp(this.power - delta, 0, 1);
    if (this.power <= 0) void this.die();
  }

  private increaseDuration(consonance: number): void {
    //const delta = INCREASE_DURATION_AFFECT * consonance * (DURATION_MAX - this.duration);
    const delta = INCREASE_DURATION_AFFECT * consonance * this.duration;
    this.duration = clamp(this.duration + delta, DURATION_MIN, DURATION_MAX);
  }

  private decreaseDuration(dissonance: number): void {
    const delta = DECREASE_DURATION_AFFECT * dissonance * (this.duration - DURATION_MIN);
    this.duration = clamp(this.duration - delta, DURATION_MIN, DURATION_MAX);
    if (this.lived >= this.duration) void this.die();
  }

  private applyConsonant(consonance: number): void {
    this.increaseGain(consonance);
    this.increaseDuration(consonance);
    this.increasePower(consonance);
  }

  private applyDissonant(dissonance: number): void {
    this.decreaseGain(dissonance);
    this.decreaseDuration(dissonance);
    this.decreasePower(dissonance);
  }

  /**
   * Один глобальный такт: увеличивает счётчик тактов и при достижении duration завершает клетку.
   */
  tick(): void {
    this.lived += 1;
    if (this.lived >= this.duration) void this.die();
  }

  /**
   * Mutual interaction: frovaIndex; consonant or dissonant bands apply symmetrically.
   * Pushes gain updates to the audio graph for already-spawned cells.
   */
  async meet(another: LifeCell): Promise<void> {
    const consonanse = frovaIndex(this.frequency, another.frequency);

    if (consonanse > CONSONANCE_CONSONANT_MIN) {
      this.applyConsonant(consonanse);
      another.applyConsonant(consonanse);
    } else if (consonanse < CONSONANCE_DISSONANT_MAX) {
      this.applyDissonant(consonanse);
      another.applyDissonant(consonanse);
    } else {
      return;
    }

    await this.player.apply(this.entity);
    await this.player.apply(another.entity);
  }

  /** Register voice, join lifecycle set. */
  async spawn(): Promise<void> {
    await this.player.push(this.entity);
    this.lifecycle.register(this);
  }

  /** Remove from lifecycle and audio; idempotent. */
  async die(): Promise<void> {
    this.lifecycle.unregister(this);
    await this.player.remove(this.entity);
  }
}
