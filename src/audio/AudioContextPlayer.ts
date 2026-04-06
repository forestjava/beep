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

/*    
    async playGame(cells: LifeCell[]): Promise<void> {
      const instrument = "church_organ";
      const buffer = await this.getSampleBuffer(instrument, cell.tone);      
      const voice = new Voice();
      voice
        .start()
        .attack(AudioContextPlayer.GAIN_SMOOTH_TIME)
        .stay(buffer.duration - AudioContextPlayer.GAIN_SMOOTH_TIME)
        .release(AudioContextPlayer.GAIN_SMOOTH_TIME)
        .stop()

      voice
        .cancelScheduledValues()
        .gain(0.5)  
    }  
*/

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
            timeout: null,
        };

        voice.source.connect(voice.gainer);
        voice.gainer.connect(voice.panner);
        voice.panner.connect(this.audioContext.destination);        

        voice.source.start();

        const t0 = this.audioContext.currentTime;
        voice.gainer.gain.setValueAtTime(0, t0);
        voice.gainer.gain.linearRampToValueAtTime(1, t0 + AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
        
        voice.gainer.gain.setValueAtTime(1, t0 + buffer.duration - AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
        voice.gainer.gain.linearRampToValueAtTime(0, t0 + buffer.duration);

        await delay(buffer.duration * 1000);
        
        voice.source.stop();
        // этот подход хорош тем, что возвращает нормальный Promise без setTimeout,
        // и delay можно использовать один общий для всей цепочки
        // но его нельзя прервать
    }

    async playTimeout(cell: LifeCell): Promise<void> {
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
            timeout: setTimeout(() => {
              const t0 = this.audioContext.currentTime;
              voice.gainer.gain.setValueAtTime(1, t0);
              voice.gainer.gain.linearRampToValueAtTime(0, t0 + AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
              //voice.source.stop();
            }, buffer.duration * 1000 - AudioContextPlayer.GAIN_SMOOTH_TIME),
        };

        voice.source.connect(voice.gainer);
        voice.gainer.connect(voice.panner);
        voice.panner.connect(this.audioContext.destination);
        voice.source.start();   

        const t0 = this.audioContext.currentTime;
        voice.gainer.gain.setValueAtTime(0, t0);
        voice.gainer.gain.linearRampToValueAtTime(1, t0 + AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
        
    }

    async playCrossfade(cell: LifeCell): Promise<void> {
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
            timeout: null,
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

        const crossfadeDelayMs = buffer.duration * 1000 - AudioContextPlayer.GAIN_SMOOTH_TIME;
        const scheduleNextCrossfade = (): void => {
            const crossfade: Voice = {
                kind: "Sample",
                source: new AudioBufferSourceNode(this.audioContext, { buffer }),
                gainer: new GainNode(this.audioContext, { gain: 0 }),
                panner: new StereoPannerNode(this.audioContext),
                timeout: null,
            };

            crossfade.source.connect(crossfade.gainer);
            crossfade.gainer.connect(crossfade.panner);
            crossfade.panner.connect(this.audioContext.destination);

            const tCross = this.audioContext.currentTime;

            crossfade.gainer.gain.setValueAtTime(0, tCross);
            crossfade.gainer.gain.linearRampToValueAtTime(1, tCross + AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
            crossfade.gainer.gain.setValueAtTime(1, tCross + buffer.duration - AudioContextPlayer.GAIN_SMOOTH_TIME / 1000);
            crossfade.gainer.gain.linearRampToValueAtTime(0, tCross + buffer.duration);

            crossfade.source.start();
            setTimeout(scheduleNextCrossfade, crossfadeDelayMs);
        };
        setTimeout(scheduleNextCrossfade, crossfadeDelayMs);

        voice.source.start();
        // этот подход кажется более перспективным, так как позволяет оперировать с эффектами так же,
        // как и с отдельными голосами, через setTimeout (который, впрочем, можно заервнут и в Promise),
        // который можно прервать.
    }

    tick(): void {
    }

}    