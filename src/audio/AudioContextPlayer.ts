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
            source: new AudioBufferSourceNode(this.audioContext, { 
                buffer, 
                loop: false 
            }),
            gainer: new GainNode(this.audioContext, { gain: 0 }),
            panner: new StereoPannerNode(this.audioContext),
        };

        voice.source.connect(voice.gainer);
        voice.gainer.connect(voice.panner);
        voice.panner.connect(this.audioContext.destination);        

        const t0 = this.audioContext.currentTime;
        // voice.gainer.gain.setValueCurveAtTime([0, 1], t0, AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
        // voice.gainer.gain.setValueCurveAtTime([1, 0], t0 + buffer.duration - AudioContextPlayer.GAIN_SMOOTH_TIME / 1000, t0 + buffer.duration);
        voice.gainer.gain.setValueAtTime(0, t0);
        voice.gainer.gain.linearRampToValueAtTime(1, t0 + AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
        voice.gainer.gain.setValueAtTime(1, t0 + buffer.duration - AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
        voice.gainer.gain.linearRampToValueAtTime(0, t0 + buffer.duration);
        
        setTimeout(() => {
            const crossfade: Voice = {
                kind: "Sample",
                source: new AudioBufferSourceNode(this.audioContext, { buffer }),
                gainer: new GainNode(this.audioContext, { gain: 0 }),
                panner: new StereoPannerNode(this.audioContext),
            };    
    
            crossfade.source.connect(crossfade.gainer);
            crossfade.gainer.connect(crossfade.panner);
            crossfade.panner.connect(this.audioContext.destination);
            
            const t0 = this.audioContext.currentTime;

            crossfade.gainer.gain.setValueAtTime(0, t0);
            crossfade.gainer.gain.linearRampToValueAtTime(1, t0 + AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
            crossfade.gainer.gain.setValueAtTime(1, t0 + buffer.duration - AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
            crossfade.gainer.gain.linearRampToValueAtTime(0, t0 + buffer.duration);
            
            crossfade.source.start();
        }, buffer.duration * 1000 - AudioContextPlayer.GAIN_SMOOTH_TIME);

        voice.source.start();
    }

    tick(): void {
    }

}    