import { getConsonance } from "./consonanse";
import type { HarmonicEntity } from "./HarmonicEntity";
import type { LifeRegistry } from "./LifeRegistry";

export const GAIN_MIN = 0;
export const GAIN_MAX = 0.1;

export const DURATION_MIN = 0;
export const DURATION_MAX = 250;

const CONSONANCE_THRESHOLD = 5;
const CONSONANCE_MIN = 0;
const CONSONANCE_MAX = 15;

const INCREASE_GAIN_AFFECT = 1; //1 / 50;
const DECREASE_GAIN_AFFECT = 1; //1 / 100;

const INCREASE_DURATION_AFFECT = 1; //1 / 50;
const DECREASE_DURATION_AFFECT = 1; //1 / 100;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** Tenney: меньше raw → консонантнее. Вес 1 у «идеала», 0 у порога (граница с диссонансом). */
function consonantBoostWeight(raw: number): number {
  const span = CONSONANCE_THRESHOLD - CONSONANCE_MIN;
  if (span <= 0) return 0;
  return clamp((CONSONANCE_THRESHOLD - raw) / span, 0, 1);
}

/** Tenney: больше raw → диссонантнее. 0 у порога, 1 при CONSONANCE_MAX и выше. */
function dissonantPenaltyWeight(raw: number): number {
  const span = CONSONANCE_MAX - CONSONANCE_THRESHOLD;
  if (span <= 0) return 1;
  return clamp((raw - CONSONANCE_THRESHOLD) / span, 0, 1);
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

  /** Участвует в реестре и аудио; до {@link spawn} только локальное состояние. */
  private spawned = false;

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
    this._pan = pan;
    this.entity = {
      frequency: midiToFrequency(this._midi),
      gain: powerToGain(this._power),
      pan: this._pan,
    };
  }

  get midi(): number {
    return this._midi;
  }

  set midi(v: number) {
    this._midi = v;
    this.pushEntityFromSources();
  }

  get power(): number {
    return this._power;
  }

  set power(v: number) {
    this._power = v;
    this.pushEntityFromSources();
  }

  get pan(): number {
    return this._pan;
  }

  set pan(v: number) {
    this._pan = clamp(v, -1, 1);
    this.pushEntityFromSources();
  }

  get duration(): number {
    return this._duration;
  }

  set duration(v: number) {
    this._duration = v;
  }

  private pushEntityFromSources(): void {
    this.entity.frequency = midiToFrequency(this._midi);
    this.entity.gain = powerToGain(this._power);
    this.entity.pan = this._pan;
    if (this.spawned) void this.lifecycle.update(this);
  }

  private increasePower(boostWeight: number): void {
    const goal = 2 * this.power;
    //const goal = 1;
    const delta = INCREASE_GAIN_AFFECT * boostWeight * (goal - this.power);
    this.power += delta;
  }

  private decreasePower(penaltyWeight: number): void {
    const delta = DECREASE_GAIN_AFFECT * penaltyWeight * this.power;
    this.power -= delta;
    if (this.power <= 0) void this.die();
  }

  private increaseDuration(boostWeight: number): void {
    //const goal = 2 * this.duration;
    const goal = this.duration + DURATION_MAX;
    const delta = INCREASE_DURATION_AFFECT * boostWeight * (goal - this.duration);
    this.duration += delta;
  }

  private decreaseDuration(penaltyWeight: number): void {
    const delta = DECREASE_DURATION_AFFECT * penaltyWeight * (this.duration - DURATION_MIN);
    this.duration -= delta;
    if (this.lived >= this.duration) void this.die();
  }

  private boost(boostWeight: number): void {
    this.increaseDuration(boostWeight);
    this.increasePower(boostWeight);
  }

  private penalty(penaltyWeight: number): void {
    this.decreaseDuration(penaltyWeight);
    this.decreasePower(penaltyWeight);
  }

  /**
   * Один глобальный такт: увеличивает счётчик тактов и при достижении duration завершает клетку.
   */
  tick(): void {
    this.lived += 1;
    if (this.lived >= this.duration) {
      if (this.power > 1 && this.midi > 12) {
        this.power -= 1;
        this.midi -= 12;
        this.duration *= 2;
      }
      else void this.die();
    }
  }

  /**
   * Mutual interaction: frovaIndex; consonant or dissonant bands apply symmetrically.
   * Pushes gain updates to the audio graph for already-spawned cells.
   */
  async meet(another: LifeCell): Promise<void> {
    const consonance = getConsonance(this, another);
    if (consonance <= CONSONANCE_THRESHOLD) {
      const w = consonantBoostWeight(consonance);
      this.boost(w);
      another.boost(w);
    } else {
      const d = dissonantPenaltyWeight(consonance);
      this.penalty(d);
      another.penalty(d);
    }
  }

  /** Register voice, join lifecycle set. */
  async spawn(): Promise<void> {
    await this.lifecycle.register(this);
    this.spawned = true;
  }

  /** Remove from lifecycle and audio; idempotent. */
  async die(): Promise<void> {
    if (this.spawned) await this.lifecycle.unregister(this);
    this.spawned = false;
  }
}
