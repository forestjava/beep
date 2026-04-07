import { GAIN_SMOOTH_TIME_DEFAULT } from "../defaults";
import type { LifeCell } from "./LifeCell";
import { loadSampleBuffer, sampleUrl } from "./soundfontSample";

function midiToFrequency(midi: number): number {
    return 440 * 2 ** ((midi - 69) / 12);
}
  
type Voice =
  | {
    kind: "Oscillator";
    source: OscillatorNode;
    gainer: GainNode;
    panner: StereoPannerNode;
  }
  | {
    kind: "Sample";
    source: AudioBufferSourceNode;
    gainer: GainNode;
    panner: StereoPannerNode;
    timeout: ReturnType<typeof setTimeout> | null;
  } 
//   | {
//     kind: "Crossfade";
//     samples: {
//         source: AudioBufferSourceNode;
//         gainer: GainNode;
//         timeout: ReturnType<typeof setTimeout> | null;
//     }[];
//     panner: StereoPannerNode;
//   };

type ScheduledEffect = {
  time: number;   // audioCtx.currentTime, в секундах
  fn: (t0: number) => Promise<void>;
};

const SLACK_TIME_MS = 10;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms + SLACK_TIME_MS);
    });
}
export class AudioContextPlayer {
    static GAIN_SMOOTH_TIME = GAIN_SMOOTH_TIME_DEFAULT;

    readonly audioContext: AudioContext;
    readonly samplesCache = new Map<string, Promise<AudioBuffer>>();

    constructor() {
        this.audioContext = new AudioContext();
    }

    async resume(): Promise<void> {
        await this.audioContext.resume();
    }

    async suspend(): Promise<void> {
        await this.audioContext.suspend();
    }

    async close(): Promise<void> {
        await this.audioContext.close();
    }

    private queue: ScheduledEffect[] = [];

    schedule(fn: (t0: number) => Promise<void>, audioTime: number) {
      this.queue.push({ time: audioTime, fn });
      this.queue.sort((a, b) => a.time - b.time);
    }
  
    flush(currentAudioTime: number) {
      while (this.queue.length && this.queue[0].time <= currentAudioTime) {
        const effect = this.queue.shift()!;
        void effect.fn(effect.time);
      }
    }

    tick(): void {
      if (this.audioContext.state !== "running") return;
      this.flush(this.audioContext.currentTime);
    }

    private async getSampleBuffer(instrument: string, midi: number): Promise<AudioBuffer> {
      const key = `${instrument}-${midi}`;
      const cache = this.samplesCache.get(key);
      if (!cache) {
        const promise = loadSampleBuffer(this.audioContext, sampleUrl(instrument, midi));
        this.samplesCache.set(key, promise);
        return await promise;
      } else {
          return await cache;
      }
    }

    async play(cell: LifeCell): Promise<void> {
        const instrument = "church_organ";
        const buffer = await this.getSampleBuffer(instrument, cell.tone);

        const playSample = async (t0: number) => {
          const source = new AudioBufferSourceNode(this.audioContext, { buffer, loop: false });
          const gainer = new GainNode(this.audioContext, { gain: 0 });
          const panner = new StereoPannerNode(this.audioContext);
          source.connect(gainer);
          gainer.connect(panner);
          panner.connect(this.audioContext.destination);

          gainer.gain.setValueAtTime(0, t0);
          gainer.gain.linearRampToValueAtTime(1, t0 + AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
          gainer.gain.setValueAtTime(1, t0 + buffer.duration - AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
          gainer.gain.linearRampToValueAtTime(0, t0 + buffer.duration);

          source.start(t0);
          source.stop(t0 + buffer.duration);
      };

      const t0 = this.audioContext.currentTime;
      const crossStart1 = t0 + buffer.duration - AudioContextPlayer.GAIN_SMOOTH_TIME / 1000;
      const crossStart2 = crossStart1 + buffer.duration - AudioContextPlayer.GAIN_SMOOTH_TIME / 1000;

      this.schedule(playSample, t0);
      this.schedule(playSample, crossStart1);
      this.schedule(playSample, crossStart2);
    }

}    