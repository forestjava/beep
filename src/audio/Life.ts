import type { LifeRegistry } from "./LifeRegistry";
import { HarmonicEntityPlayer } from "./HarmonicEntityPlayer";
import { LifeCell } from "./LifeCell";
import { findGroupGreedy } from "./findGroupGreedy";
import { getEntropy } from "./consonanse";
import { randomEntropyIndex } from "./weights";

// defaults
import { DURATION_DEFAULT, DURATION_MIN, TICK_INTERVAL_DEFAULT, CHANNELS_DEFAULT, ENTROPY_THRESHOLD_DEFAULT, PIANO_SEMITONE_MIN, PIANO_SEMITONE_MAX, POWER_DEFERRAL_BLEND_DEFAULT } from "../defaults";

export class Life implements LifeRegistry<LifeCell> {
  private readonly active = new Set<LifeCell>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private log: ((line: string) => void) | null = null;

  // settings
  private tickInterval = TICK_INTERVAL_DEFAULT;
  private duration = DURATION_DEFAULT;
  private channels = CHANNELS_DEFAULT;
  private entropyThreshold = ENTROPY_THRESHOLD_DEFAULT;
  private pianoSemitoneMin = PIANO_SEMITONE_MIN;
  private pianoSemitoneMax = PIANO_SEMITONE_MAX;
  private powerDeferralBlend = POWER_DEFERRAL_BLEND_DEFAULT;

  /** Предыдущая выбранная MIDI при спавне; первая нота равномерно случайная, далее — по энтропии. */
  private currentKey: number | null = null;

  private readonly player: HarmonicEntityPlayer = new HarmonicEntityPlayer();

  async register(cell: LifeCell): Promise<void> {
    await this.player.push(cell.entity);
    this.active.add(cell);
  }

  async unregister(cell: LifeCell): Promise<void> {
    this.active.delete(cell);
    await this.player.remove(cell.entity);
  }

  async update(cell: LifeCell): Promise<void> {
    await this.player.apply(cell.entity);
  }

  private pickWeakestCell(): LifeCell | undefined {
    let best: LifeCell | undefined;
    for (const c of this.active) {
      if (!best || c.power <= best.power) best = c;
    }
    return best;
  }

  private consonantWeight(raw: number): number {
    return (this.entropyThreshold - raw) / this.entropyThreshold;
  }

  /** Первая нота — равномерно по диапазону клавиш; далее — взвешенный выбор через {@link randomEntropyIndex} относительно предыдущей. */
  private pickNextSpawnMidi(): number {
    const pianoKeys = this.pianoSemitoneMax - this.pianoSemitoneMin + 1;
    let key: number;
    if (this.currentKey === null) {
      key = this.pianoSemitoneMin + Math.floor(Math.random() * pianoKeys);
    } else {
      const entropies = new Array<number>(pianoKeys);
      for (let i = 0; i < pianoKeys; i++) {
        entropies[i] = getEntropy(this.currentKey, this.pianoSemitoneMin + i);
      }
      key = this.pianoSemitoneMin + randomEntropyIndex(entropies);
    }
    this.currentKey = key;
    return key;
  }

  /**
   * Creates a cell, meets all pre-spawn active cells,
   * re-meets each unordered pair among those peers (so updated gain/power/duration propagate), then spawns it.
   */
  async spawnRandomCell(): Promise<void> {

    const peers = [...this.active];

    const duration_min = Math.max(DURATION_MIN, this.tickInterval);
    const duration = Math.exp(Math.log(duration_min) + Math.random() * (Math.log(this.duration) - Math.log(duration_min)));

    const cell = new LifeCell(
      this,
      this.pickNextSpawnMidi(),
      //Math.random() * (this.duration / this.tickInterval),
      duration / this.tickInterval,
      0, //Math.random(),
      Math.random() * 2 - 1,
      this.powerDeferralBlend,
      this.tickInterval,
    );

    if (peers.length == 0) {
      await cell.spawn();
      return
    };

    const { team, teamEntropy } = findGroupGreedy([...peers, cell], this.entropyThreshold);

    if (team.length === 0) {
      cell.powerTarget = 1;

    } else {
      const weight = this.consonantWeight(teamEntropy);
      for (const peer of peers) {
        if (team.includes(peer)) {
          peer.powerTarget = 1; //weight;
        } else {
          peer.powerTarget = 0;
        }
        //peer.setPowerDeferralBlend(1 / peer.duration)
      }
      this.log?.(`${this.active.size + 1} channels, ${team.length} team, ${teamEntropy.toFixed(0)} entropy, ${weight.toFixed(3)} boost, [${team.map((member) => member.power.toFixed(3))}], [${team.map((member) => member.duration.toFixed(0))}]`);

    };

    await cell.spawn();
  }


  private async killWeakestCell(): Promise<void> {
    if (this.active.size >= this.channels) {
      const weakest = this.pickWeakestCell();
      if (weakest) await weakest.die();
      this.log?.(`killing up to ${this.active.size} channels`);
    }
  }

  /**
   * Один такт: спавн новой клетки, затем {@link LifeCell.tick} для всех активных.
   */
  async tick(): Promise<void> {
    await this.killWeakestCell();
    await this.spawnRandomCell();
    for (const cell of [...this.active]) {
      cell.tick();
    }
  }

  private scheduleTickTimer(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, this.tickInterval);
  }

  async play(): Promise<void> {
    await this.player.resume();
    this.scheduleTickTimer();
  }

  async pause(): Promise<void> {
    await this.player.suspend();
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async shutdown(): Promise<void> {
    await this.player.shutdown();
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setTickInterval(value: number): void {
    this.tickInterval = Math.max(1, Math.round(value));
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.scheduleTickTimer();
    }
  }

  setMaxConcurrentEntities(value: number): void {
    this.channels = value;
  }

  setEntropyThreshold(value: number): void {
    this.entropyThreshold = value;
  }

  setDuration(value: number): void {
    this.duration = value;
  }

  setGainSmoothTimeMs(value: number): void {
    this.player.setGainSmoothTimeMs(value);
  }

  setPowerDeferralBlend(value: number): void {
    this.powerDeferralBlend = value;
  }

  setPianoRange(minSemitone: number, maxSemitone: number): void {
    this.pianoSemitoneMin = minSemitone;
    this.pianoSemitoneMax = maxSemitone;
  }

  subscribe(log: (line: string) => void): void {
    this.log = log;
  }

}
