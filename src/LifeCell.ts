import type { HarmonicEntity } from "./HarmonicEntity";
import type { HarmonicEntityPlayer } from "./HarmonicEntityPlayer";
import type { LifeRegistry } from "./LifeRegistry";

export const GAIN_MIN = 0;
export const GAIN_MAX = 0.1;

export const DURATION_MIN = 0;
export const DURATION_MAX = 250;

const INCREASE_GAIN_AFFECT = 1 / 50;
const DECREASE_GAIN_AFFECT = 1 / 100;

const INCREASE_DURATION_AFFECT = 1 / 50;
const DECREASE_DURATION_AFFECT = 1 / 100;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
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
    //const limit = 1;
    const limit = 2 * this.power;
    const delta = INCREASE_GAIN_AFFECT * consonance * (limit - this.power);
    this.power = clamp(this.power + delta, 0, limit);
  }

  private decreasePower(dissonance: number): void {
    const delta = DECREASE_GAIN_AFFECT * dissonance * this.power;
    this.power = clamp(this.power - delta, 0, 1);
    if (this.power <= 0) void this.die();
  }

  private increaseDuration(consonance: number): void {
    //const limit = DURATION_MAX;
    const limit = 2 * this.duration;
    const delta = INCREASE_DURATION_AFFECT * consonance * (limit - this.duration);
    this.duration = clamp(this.duration + delta, DURATION_MIN, limit);
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
    // if (this.lived >= this.duration) {
    //   this.duration += this.duration;
    //   this.entity.frequency = this.entity.frequency / 2;
    //   this.entity.gain = this.entity.gain / 2;
    //   this.power += this.power;
    //   this.player.apply(this.entity);
    // }
  }


  /**
   * Mutual interaction: frovaIndex; consonant or dissonant bands apply symmetrically.
   * Pushes gain updates to the audio graph for already-spawned cells.
   */
  async meet(another: LifeCell): Promise<void> {
    /*
    const consonanse = ?

    if (consonanse) {
      this.applyConsonant(consonanse);
      another.applyConsonant(consonanse);
      await this.player.apply(this.entity);
      await this.player.apply(another.entity);
    } else if (dissonanse) {
      this.applyDissonant(consonanse);
      another.applyDissonant(consonanse);
      await this.player.apply(this.entity);
      await this.player.apply(another.entity);
    } else {
      return;
    }
    */
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
