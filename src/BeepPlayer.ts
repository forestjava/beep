import { HarmonicEntityPlayer } from './audio/HarmonicEntityPlayer'
import { Life } from './audio/Life'

export class BeepPlayer {
  private life?: Life;
  private player?: HarmonicEntityPlayer;

  constructor() {
    this.player = new HarmonicEntityPlayer()
    this.life = new Life(this.player)
  }

  setTickInterval(value: number): void {
    void value
  }

  setMaxConcurrentEntities(value: number): void {
    void value
  }

  setEntropyThreshold(value: number): void {
    void value
  }

  setDuration(value: number): void {
    void value
  }

  setPianoRange(minSemitone: number, maxSemitone: number): void {
    void minSemitone
    void maxSemitone
  }

  async play(): Promise<void> {
    this.player = new HarmonicEntityPlayer()
    this.life = new Life(this.player)
    this.life.start();
  }

  async stop(): Promise<void> {
    await this.life?.stop()
    await this.player?.shutdown()
  }

  async setPlayingAsync(playing: boolean): Promise<void> {
    if (playing) await this.play()
    else await this.stop()
  }
}
