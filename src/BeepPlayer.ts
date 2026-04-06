import { AudioContextPlayer } from './audio/AudioContextPlayer';
import { Life } from './audio/Life'

export class BeepPlayer {
  private life: Life = new Life();

  setTickInterval(value: number): void {
    Life.TICK_INTERVAL = value;
  }

  setSpawnInterval(value: number): void {
    Life.SPAWN_INTERVAL = value;
  }

  setMaxConcurrentEntities(value: number): void {
    //this.life.setMaxConcurrentEntities(value);
  }

  setEntropyThreshold(value: number): void {
    //this.life.setEntropyThreshold(value);
  }

  setDuration(value: number): void {
    //this.life.setDuration(value);
  }

  setGainSmoothTimeMs(value: number): void {
    AudioContextPlayer.GAIN_SMOOTH_TIME = value;
  }

  setPowerDeferralBlend(value: number): void {
    //this.life.setPowerDeferralBlend(value);
  }

  setPianoRange(minSemitone: number, maxSemitone: number): void {
    Life.PIANO_SEMITONE_MIN = minSemitone;
    Life.PIANO_SEMITONE_MAX = maxSemitone;
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
