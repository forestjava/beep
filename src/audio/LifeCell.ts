import type { HarmonicEntity } from "./HarmonicEntity";
import type { LifeRegistry } from "./LifeRegistry";

const GAIN_MIN = 0;
const GAIN_MAX = 0.4;

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
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

  /** Доля разницы `powerTarget - power` за один тик; задаётся извне (крутилка → {@link Life.setPowerDeferralBlend}). */
  private powerDeferralBlend: number;

  /** Целевой вес; текущий `power` догоняет её в {@link tick}. */
  powerTarget: number;

  public duration: number;
  public protection: boolean;

  /** Синтез; поля обновляются из источников midi/power/pan внутри клетки. */
  readonly entity: HarmonicEntity;

  private readonly lifecycle: LifeRegistry<LifeCell>;

  constructor(
    lifecycle: LifeRegistry<LifeCell>,
    midi: number,
    duration: number,
    power: number,
    pan: number,
    powerDeferralBlend: number,
  ) {
    this.lifecycle = lifecycle;
    this._midi = midi;
    this._power = power;
    this.powerTarget = power;
    this._pan = pan;
    this.powerDeferralBlend = powerDeferralBlend;
    this.entity = {
      midi: this._midi,
      gain: powerToGain(this._power),
      pan: this._pan,
    };

    this.duration = duration;
    this.protection = false;
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
    this._pan = v;
    this.pushEntityFromSources();
  }

  setPowerDeferralBlend(v: number): void {
    this.powerDeferralBlend = v;
  }

  private pushEntityFromSources(): void {
    this.entity.midi = this._midi;
    this.entity.gain = powerToGain(this._power);
    this.entity.pan = this._pan;
    if (this.spawned) void this.lifecycle.update(this);
  }

  tick(): void {
    this.lived += 1;
    if (this.lived >= this.duration && !this.protection) void this.die();
    else {
      const delta = this.powerTarget - this.power;
      if (delta !== 0) {
        this.power += delta * this.powerDeferralBlend;
      }
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
