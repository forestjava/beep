import { Life } from './audio/Life'

export class BeepPlayer {
  private life: Life = new Life();

  setTickInterval(value: number): void {
    this.life.setTickInterval(value);
  }

  setMaxConcurrentEntities(value: number): void {
    void value
  }

  setEntropyThreshold(value: number): void {
    void value
  }

  setDuration(value: number): void {
    this.life.setDuration(value);
  }

  setPianoRange(minSemitone: number, maxSemitone: number): void {
    void minSemitone
    void maxSemitone
  }

  async play(): Promise<void> {
    await this.life.play();
  }

  async pause(): Promise<void> {
    await this.life.pause();
  }

  async shutdown(): Promise<void> {
    await this.life.shutdown()
  }

}

export const beep = new BeepPlayer();
