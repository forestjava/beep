import { Life } from './audio/Life'

export class BeepPlayer {
  private life: Life = new Life();

  setTickInterval(value: number): void {
    this.life.setTickInterval(value);
  }

  setMaxConcurrentEntities(value: number): void {
    this.life.setMaxConcurrentEntities(value);
  }

  setEntropyThreshold(value: number): void {
    this.life.setEntropyThreshold(value);
  }

  setDuration(value: number): void {
    this.life.setDuration(value);
  }

  setGainSmoothTimeMs(value: number): void {
    this.life.setGainSmoothTimeMs(value);
  }

  setPowerDeferralBlend(value: number): void {
    this.life.setPowerDeferralBlend(value);
  }

  setPianoRange(minSemitone: number, maxSemitone: number): void {
    this.life.setPianoRange(minSemitone, maxSemitone);
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

  subscribe(log: (line: string) => void): void {
    this.life.subscribe(log);
  }

}

export const beep = new BeepPlayer();
