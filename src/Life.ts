import type { LifeRegistry } from "./LifeRegistry";
import type { HarmonicEntityPlayer } from "./HarmonicEntityPlayer";
import { getEntropy } from "./consonanse";
import { LifeCell } from "./LifeCell";

const TICK_INTERVAL_MS = 400;
const MAX_CONCURRENT_ENTITIES = 16;

const ENTROPY_THRESHOLD = 30;

const DURATION_MS = 8000;
const DURATION_TICKS = DURATION_MS / TICK_INTERVAL_MS;

const PIANO_SEMITONE_MIN = 21;
const PIANO_SEMITONE_MAX = 96; //108;

/**
 * Tenney: меньше raw → консонантнее. При raw = 0 вес 2 (максимальный буст);
 * при raw = threshold — 0 (порог, буста нет); между ними линейно.
 */
function consonantBoostWeight(raw: number): number {
  return 1 + (ENTROPY_THRESHOLD - raw) / ENTROPY_THRESHOLD;
}

/**
 * Tenney: ожидается raw > threshold. Возвращает raw/threshold — во сколько раз энтропия выше порога
 * (множитель силы штрафа: чем дальше за порогом, тем сильнее).
 */
function dissonantPenaltyWeight(raw: number): number {
  return raw / ENTROPY_THRESHOLD;
}

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
      if (!best || c.power <= best.power) best = c;
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
      Math.random() * DURATION_TICKS,
      Math.random(),
      Math.random() * 2 - 1,
    );

    if (peers.length == 0) {
      await cell.spawn();
      return
    };

    const sorted = peers.sort((a, b) => getEntropy(cell, a) - getEntropy(cell, b));
    const team: LifeCell[] = [];

    const steps: Array<{
      chordEntropy: number;
      accepted: boolean;
    }> = [];

    for (const peer of sorted) {
      const chordEntropy = getEntropy(cell, ...team, peer);
      const accepted = chordEntropy < ENTROPY_THRESHOLD;
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

      console.log("[Life] team", {
        teamSize: team.length,
        teamEntropy: teamEntropy.toFixed(4),
      });

      team.push(cell);
      for (const peer of peers) {
        if (team.includes(peer)) {
          peer.boost(consonantBoostWeight(teamEntropy));
        } else {
          const xEntropy = getEntropy(peer, ...team);
          peer.penalty(dissonantPenaltyWeight(xEntropy));
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
