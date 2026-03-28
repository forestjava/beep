import type { HarmonicEntity } from "./HarmonicEntity";
import type { HarmonicEntityPlayer } from "./HarmonicEntityPlayer";
import { LifeCell, GAIN_MIN, GAIN_MAX, DURATION_MIN, DURATION_MAX } from "./LifeCell";
import type { LifeRegistry } from "./LifeRegistry";

// было бы забавно с течением игры увеличивать интервал интервенции, уменьшать максимальное количество клеток и понижать верхний порог частоты PIANO_SEMITONE_MAX 

const TICK_INTERVAL_MS = 25;
const MAX_CONCURRENT_ENTITIES = 32;

/**
 * Standard 88-key piano range A0…C8 (ISO 16:1975 concert pitch A4 = 440 Hz,
 * 12-tone equal temperament: f = 440 * 2^(n/12), n = semitones from A4).
 */
const PIANO_SEMITONE_MIN = -48;
const PIANO_SEMITONE_MAX = 24;

function randomPaletteFrequency(): number {
  const span = PIANO_SEMITONE_MAX - PIANO_SEMITONE_MIN + 1;
  const n = PIANO_SEMITONE_MIN + Math.floor(Math.random() * span);
  return 440 * 2 ** (n / 12);
}

export class Life implements LifeRegistry<LifeCell> {
  private readonly active = new Set<LifeCell>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly player: HarmonicEntityPlayer) { }

  /** @internal */
  register(cell: LifeCell): void {
    this.active.add(cell);
  }

  /** @internal */
  unregister(cell: LifeCell): void {
    this.active.delete(cell);
  }

  getActiveCells(): ReadonlySet<LifeCell> {
    return this.active;
  }

  private pickWeakestCell(): LifeCell | undefined {
    let best: LifeCell | undefined;
    for (const c of this.active) {
      if (!best || c.getPower() <= best.getPower()) best = c;
    }
    return best;
  }

  /**
   * Enforces {@link MAX_CONCURRENT_ENTITIES}, then creates a cell, meets all pre-spawn active cells,
   * re-meets each unordered pair among those peers (so updated gain/power/duration propagate), then spawns it.
   */
  async spawnRandomCell(): Promise<void> {
    while (this.active.size >= MAX_CONCURRENT_ENTITIES) {
      const victim = this.pickWeakestCell();
      if (!victim) break;
      await victim.die();
    }

    const peers = [...this.active];

    const entity: HarmonicEntity = {
      gain: Math.random() * (GAIN_MAX - GAIN_MIN) + GAIN_MIN,
      frequency: randomPaletteFrequency(),
      pan: Math.random() * 2 - 1,
    };
    const cell = new LifeCell(
      this.player,
      this,
      entity,
      Math.random() * (DURATION_MAX - DURATION_MIN) + DURATION_MIN,
      Math.random());

    for (const other of peers) {
      await cell.meet(other);
    }

    // it is very bad idea to use nested loops here
    // for (let i = 0; i < peers.length; i++) {
    //   for (let j = i + 1; j < peers.length; j++) {
    //     await peers[i].meet(peers[j]);
    //   }
    // }

    await cell.spawn();
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

  start(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

}
