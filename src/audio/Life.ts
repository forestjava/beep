import type { LifeRegistry } from "./LifeRegistry";
import { HarmonicEntityPlayer } from "./HarmonicEntityPlayer";
import { LifeCell } from "./LifeCell";
import { getEntropy } from "./consonanse";
import { randomEntropyIndex } from "./weights";

// defaults
import { DURATION_DEFAULT, TICK_INTERVAL_DEFAULT, CHANNELS_DEFAULT, ENTROPY_THRESHOLD_DEFAULT, PIANO_SEMITONE_MIN, PIANO_SEMITONE_MAX } from "../defaults";

export class Life implements LifeRegistry<LifeCell> {
  private readonly active = new Set<LifeCell>();
  private timer: ReturnType<typeof setInterval> | null = null;

  // settings
  private tickInterval = TICK_INTERVAL_DEFAULT;
  private duration = DURATION_DEFAULT;
  private channels = CHANNELS_DEFAULT;
  private entropyThreshold = ENTROPY_THRESHOLD_DEFAULT;
  private pianoSemitoneMin = PIANO_SEMITONE_MIN;
  private pianoSemitoneMax = PIANO_SEMITONE_MAX;

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

  private consonantBoostWeight(raw: number): number {
    return (this.entropyThreshold - raw) / this.entropyThreshold;
  }

  // @ts-expect-error reserved for dissonance weighting
  private dissonantPenaltyWeight(raw: number): number {
    return raw / this.entropyThreshold;
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
    while (this.active.size >= this.channels) {
      const victim = this.pickWeakestCell();
      if (!victim) break;
      await victim.die();
    }

    const peers = [...this.active];

    const cell = new LifeCell(
      this,
      this.pickNextSpawnMidi(),
      Math.random() * (this.duration / this.tickInterval),
      0,
      Math.random() * 2 - 1,
    );

    if (peers.length == 0) {
      await cell.spawn();
      return
    };

    const sorted = peers.sort((a, b) => getEntropy(cell.midi, a.midi) - getEntropy(cell.midi, b.midi));
    const team: LifeCell[] = [];

    const steps: Array<{
      chordEntropy: number;
      accepted: boolean;
    }> = [];

    for (const peer of sorted) {
      const chordEntropy = getEntropy(cell.midi, ...team.map((t) => t.midi), peer.midi);
      const accepted = chordEntropy < this.entropyThreshold;
      steps.push({
        chordEntropy,
        accepted,
      });
      if (accepted) team.push(peer);
      else break;
    }

    const hasFriends = steps.filter((s) => s.accepted).length > 0;
    if (hasFriends) {
      const acceptedIndex = steps.filter((s) => s.accepted).length - 1;
      const teamEntropy = steps[acceptedIndex].chordEntropy;

      // console.log("[Life] team", {
      //   teamSize: team.length,
      //   teamEntropy: teamEntropy.toFixed(4),
      // });

      team.push(cell);
      for (const peer of peers) {
        if (team.includes(peer)) {
          peer.boost(this.consonantBoostWeight(teamEntropy));
          peer.protection = true;
        } else {
          // const xEntropy = getEntropy(peer.midi, ...team.map((t) => t.midi));
          // peer.penalty(this.dissonantPenaltyWeight(xEntropy));
          peer.protection = false;
        }
      }

      await cell.spawn();
    }
  }

  /**
   * Один такт: спавн новой клетки, затем {@link LifeCell.tick} для всех активных.
   */
  async tick(): Promise<void> {
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

  setPianoRange(minSemitone: number, maxSemitone: number): void {
    this.pianoSemitoneMin = minSemitone;
    this.pianoSemitoneMax = maxSemitone;
  }

}
