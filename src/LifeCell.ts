import type { HarmonicEntity } from "./HarmonicEntity";
import type { LifeRegistry } from "./LifeRegistry";

const GAIN_MIN = 0;
const GAIN_MAX = 0.5;

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

  public boost(boostWeight: number): void {
    this.power *= boostWeight;
    //console.log("[LifeCell] boost", boostWeight, this.power);
  }

  public penalty(penaltyWeight: number): void {
    this.power /= penaltyWeight;
    //console.log("[LifeCell] penalty", penaltyWeight, this.power);
  }

  /**
   * Один глобальный такт: увеличивает счётчик тактов и при достижении duration завершает клетку.
   */
  tick(): void {
    this.lived += 1;
    if (this.lived >= this.duration) void this.die();
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
