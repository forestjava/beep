import type { HarmonicEntity } from "./HarmonicEntity";
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

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function powerToGain(power: number): number {
  return GAIN_MIN + clamp(power, 0, 1) * (GAIN_MAX - GAIN_MIN);
}

export class LifeCell {
  /** Сколько глобальных тактов клетка уже «прожила» в фазе active. */
  private lived = 0;

  private _midi: number;
  private _power: number;
  private _pan: number;
  private _duration: number;

  /** Синтез; поля обновляются из источников midi/power/pan внутри клетки. */
  readonly entity: HarmonicEntity;

  constructor(
    private readonly lifecycle: LifeRegistry<LifeCell>,
    midi: number,
    duration: number,
    power: number,
    pan: number,
  ) {
    this._midi = midi;
    this._duration = duration;
    this._power = power;
    this._pan = clamp(pan, -1, 1);
    this.entity = {
      frequency: midiToFrequency(this._midi),
      gain: powerToGain(this._power),
      pan: this._pan,
    };
  }

  private get midi(): number {
    return this._midi;
  }

  private set midi(v: number) {
    this._midi = v;
    this.pushEntityFromSources();
  }

  private get power(): number {
    return this._power;
  }

  private set power(v: number) {
    this._power = v;
    this.pushEntityFromSources();
  }

  private get pan(): number {
    return this._pan;
  }

  private set pan(v: number) {
    this._pan = clamp(v, -1, 1);
    this.pushEntityFromSources();
  }

  private get duration(): number {
    return this._duration;
  }

  private set duration(v: number) {
    this._duration = v;
  }

  private pushEntityFromSources(): void {
    this.entity.frequency = midiToFrequency(this._midi);
    this.entity.gain = powerToGain(this._power);
    this.entity.pan = this._pan;
    void this.lifecycle.update(this);
  }

  private increasePower(consonance: number): void {
    const goal = 2 * this.power;
    const delta = INCREASE_GAIN_AFFECT * consonance * (goal - this.power);
    this.power += delta;
  }

  private decreasePower(dissonance: number): void {
    const delta = DECREASE_GAIN_AFFECT * dissonance * this.power;
    this.power -= delta;
    if (this.power <= 0) void this.die();
  }

  private increaseDuration(consonance: number): void {
    const goal = 2 * this.duration;
    const delta = INCREASE_DURATION_AFFECT * consonance * (goal - this.duration);
    this.duration += delta;
  }

  private decreaseDuration(dissonance: number): void {
    const delta = DECREASE_DURATION_AFFECT * dissonance * (this.duration - DURATION_MIN);
    this.duration -= delta;
    if (this.lived >= this.duration) void this.die();
  }

  private applyConsonant(consonance: number): void {
    this.increaseDuration(consonance);
    this.increasePower(consonance);
  }

  private applyDissonant(dissonance: number): void {
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
    await this.lifecycle.register(this);
  }

  /** Remove from lifecycle and audio; idempotent. */
  async die(): Promise<void> {
    await this.lifecycle.unregister(this);
  }
}
