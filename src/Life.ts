import type { HarmonicEntityPlayer } from "./HarmonicEntityPlayer";
import { LifeCell, DURATION_MIN, DURATION_MAX } from "./LifeCell";
import type { LifeRegistry } from "./LifeRegistry";

// было бы забавно с течением игры увеличивать интервал интервенции, уменьшать максимальное количество клеток и понижать верхний порог частоты PIANO_SEMITONE_MAX

const TICK_INTERVAL_MS = 25;
const MAX_CONCURRENT_ENTITIES = 32;

const PIANO_SEMITONE_MIN = 21;
const PIANO_SEMITONE_MAX = 108;

export class Life implements LifeRegistry<LifeCell> {
  private readonly active = new Set<LifeCell>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly player: HarmonicEntityPlayer) { }

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


    const cell = new LifeCell(
      this,
      Math.floor(Math.random() * (PIANO_SEMITONE_MAX - PIANO_SEMITONE_MIN + 1)) + PIANO_SEMITONE_MIN,
      Math.random() * (DURATION_MAX - DURATION_MIN) + DURATION_MIN,
      Math.random(),
      Math.random() * 2 - 1,
    );

    for (const other of peers) {
      await cell.meet(other);
    }

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
