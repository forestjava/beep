// import type { LifeRegistry } from "./LifeRegistry";
// import { HarmonicEntityPlayer } from "./HarmonicEntityPlayer";

import { LifeCell } from "./LifeCell";
import { AudioContextPlayer } from "./AudioContextPlayer";
//import { findGroupGreedy } from "./findGroupGreedy";

// defaults
import { DURATION_DEFAULT, DURATION_MIN, SPAWN_INTERVAL_DEFAULT, PIANO_SEMITONE_MIN, PIANO_SEMITONE_MAX } from "../defaults";

export class Life /*implements LifeRegistry<LifeCell>*/ {
  // settings
  static SPAWN_INTERVAL = SPAWN_INTERVAL_DEFAULT;
  static DURATION = DURATION_DEFAULT;
  // private channels = CHANNELS_DEFAULT;
  // private entropyThreshold = ENTROPY_THRESHOLD_DEFAULT;
  static PIANO_SEMITONE_FROM = PIANO_SEMITONE_MIN;
  static PIANO_SEMITONE_TO = PIANO_SEMITONE_MAX;
  // private powerDeferralBlend = POWER_DEFERRAL_BLEND_DEFAULT;



  private readonly live = new Set<LifeCell>();
  private readonly player: AudioContextPlayer = new AudioContextPlayer();
  private tickTimer: number | null = null;
  private spawnTimer: ReturnType<typeof setInterval> | null = null;
  private log: ((line: string) => void) | null = null;

  constructor() {
    const loop = (): void => {
      this.tickTimer = requestAnimationFrame(loop);
      this.tick();
    };
    this.tickTimer = requestAnimationFrame(loop);
  }


  // /** Предыдущая выбранная MIDI при спавне; первая нота равномерно случайная, далее — по энтропии. */
  // private currentKey: number | null = null;

  //  private readonly player: HarmonicEntityPlayer = new HarmonicEntityPlayer();

  async register(cell: LifeCell): Promise<void> {
    this.live.add(cell);
    //await this.player.push(cell.entity);    
  }

  async unregister(cell: LifeCell): Promise<void> {    
    //await this.player.remove(cell.entity);
    this.live.delete(cell);
  }

  async update(cell: LifeCell): Promise<void> {
    //await this.player.apply(cell.entity);
  }

  // private pickWeakestCell(): LifeCell | undefined {
  //   let best: LifeCell | undefined;
  //   for (const c of this.active) {
  //     if (!best || c.power <= best.power) best = c;
  //   }
  //   return best;
  // }

  // private consonantWeight(raw: number): number {
  //   return (this.entropyThreshold - raw) / this.entropyThreshold;
  // }

  // /** Первая нота — равномерно по диапазону клавиш; далее — взвешенный выбор через {@link randomEntropyIndex} относительно предыдущей. */
  // private pickNextSpawnMidi(): number {
  //   const pianoKeys = this.pianoSemitoneMax - this.pianoSemitoneMin + 1;
  //   let key: number;
  //   if (this.currentKey === null) {
  //     key = this.pianoSemitoneMin + Math.floor(Math.random() * pianoKeys);
  //   } else {
  //     const entropies = new Array<number>(pianoKeys);
  //     for (let i = 0; i < pianoKeys; i++) {
  //       entropies[i] = getEntropy(this.currentKey, this.pianoSemitoneMin + i);
  //     }
  //     key = this.pianoSemitoneMin + randomEntropyIndex(entropies);
  //   }
  //   this.currentKey = key;
  //   return key;
  // }

  // /**
  //  * Creates a cell, meets all pre-spawn active cells,
  //  * re-meets each unordered pair among those peers (so updated gain/power/duration propagate), then spawns it.
  //  */
  // async spawnRandomCell(): Promise<void> {

  //   const peers = [...this.active];

  //   const duration_min = Math.max(DURATION_MIN, this.tickInterval);
  //   const duration = Math.exp(Math.log(duration_min) + Math.random() * (Math.log(this.duration) - Math.log(duration_min)));

  //   const cell = new LifeCell(
  //     this,
  //     this.pickNextSpawnMidi(),
  //     //Math.random() * (this.duration / this.tickInterval),
  //     duration / this.tickInterval,
  //     0, //Math.random(),
  //     Math.random() * 2 - 1,
  //     this.powerDeferralBlend,
  //     this.tickInterval,
  //   );

  //   if (peers.length == 0) {
  //     await cell.spawn();
  //     return
  //   };

  //   const { team, teamEntropy } = findGroupGreedy([...peers, cell], this.entropyThreshold);

  //   if (team.length === 0) {
  //     cell.powerTarget = 1;

  //   } else {
  //     const weight = this.consonantWeight(teamEntropy);
  //     for (const peer of peers) {
  //       if (team.includes(peer)) {
  //         peer.powerTarget = 1; //weight;
  //       } else {
  //         peer.powerTarget = 0;
  //       }
  //       //peer.setPowerDeferralBlend(1 / peer.duration)
  //     }
  //     this.log?.(`${this.active.size + 1} channels, ${team.length} team, ${teamEntropy.toFixed(0)} entropy, ${weight.toFixed(3)} boost, [${team.map((member) => member.power.toFixed(3))}], [${team.map((member) => member.duration.toFixed(0))}]`);

  //   };

  //   await cell.spawn();
  // }


  // private async killWeakestCell(): Promise<void> {
  //   if (this.active.size >= this.channels) {
  //     const weakest = this.pickWeakestCell();
  //     if (weakest) await weakest.die();
  //     this.log?.(`killing up to ${this.active.size} channels`);
  //   }
  // }

  // /**
  //  * Один такт: спавн новой клетки, затем {@link LifeCell.tick} для всех активных.
  //  */
  // async tick(): Promise<void> {
  //   await this.killWeakestCell();
  //   await this.spawnRandomCell();
  //   for (const cell of [...this.active]) {
  //     cell.tick();
  //   }
  // }

  async spawn(): Promise<void> {
    const keys = Life.PIANO_SEMITONE_TO - Life.PIANO_SEMITONE_FROM + 1;
    const tone = Life.PIANO_SEMITONE_FROM + Math.floor(Math.random() * keys);
    const duration = Life.DURATION;
    this.log?.(`spawn ${tone} ${duration}`);

    const cell = new LifeCell(tone, duration);
    await this.register(cell);

    await this.player.play(cell);
  }

  private tick(): void {
    this.player.tick();
  }

  private scheduleSpawnTimer(): void {
    if (this.spawnTimer !== null) return;
    this.spawnTimer = setInterval(() => {
      void this.spawn();
    }, Life.SPAWN_INTERVAL);
  }

  private clearSpawnTimer(): void {
    if (this.spawnTimer !== null) {
      clearInterval(this.spawnTimer);
      this.spawnTimer = null;
    }
  }

  async play(): Promise<void> {
    await this.player.resume();
    this.scheduleSpawnTimer();
  }

  async pause(): Promise<void> {
    this.clearSpawnTimer();
    await this.player.suspend();
  }

  async shutdown(): Promise<void> {
    if (this.tickTimer !== null) {
      cancelAnimationFrame(this.tickTimer);
      this.tickTimer = null;
    }
    this.clearSpawnTimer();
    await this.player.close();
  }

  subscribe(log: (line: string) => void): void {
    this.log = log;
  }

}
