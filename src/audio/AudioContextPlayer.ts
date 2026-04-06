import { GAIN_SMOOTH_TIME_DEFAULT } from "../defaults";
import type { LifeCell } from "./LifeCell";
import { loadSampleBuffer, sampleUrl } from "./soundfontSample";

function midiToFrequency(midi: number): number {
    return 440 * 2 ** ((midi - 69) / 12);
}
  
type Voice =
  | {
    kind: "Oscillator";
    sourceNode: OscillatorNode;
    gainNode: GainNode;
    panNode: StereoPannerNode;
  }
  | {
    kind: "Sample";
    sourceNode: AudioBufferSourceNode;
    gainNode: GainNode;
    panNode: StereoPannerNode;
  };

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

        const voice: Voice = {
            kind: "Sample",
            sourceNode: new AudioBufferSourceNode(this.audioContext, { 
                buffer, 
                loop: false 
            }),
            gainNode: new GainNode(this.audioContext, { gain: 1 }),
            panNode: new StereoPannerNode(this.audioContext),
        };

        voice.sourceNode.connect(voice.gainNode);
        voice.gainNode.connect(voice.panNode);
        voice.panNode.connect(this.audioContext.destination);        

        const t0 = this.audioContext.currentTime;
        voice.gainNode.gain.setValueCurveAtTime([0, 1], t0, AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
        voice.sourceNode.start();

    }

    
}    