import type { HarmonicEntity } from "./HarmonicEntity";
import { loadSampleBuffer, midiToSoundfontFilename } from "./soundfontSample";
import {
  GAIN_SMOOTH_TIME_DEFAULT,
  SAMPLED_INSTRUMENT_BASE_URL,
  SAMPLED_INSTRUMENT_FILE_EXT,
  USE_SAMPLED_HARMONIC,
} from "../defaults";

/** Wall-clock slack so timers align with audio render timeline, in seconds. */
const SLACK_TIME_MS = 100;

function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms + SLACK_TIME_MS);
  });
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

/**
 * Routes {@link HarmonicEntity} instances through Web Audio: per entity either an oscillator or a
 * looped soundfont sample, plus gain and stereo pan. Entities are keyed by object identity.
 */
export class HarmonicEntityPlayer {
  readonly audioContext: AudioContext;
  private readonly voices = new Map<HarmonicEntity, Voice>();
  private readonly sampleBufferPromises = new Map<number, Promise<AudioBuffer>>();
  private gainSmoothTimeMs = GAIN_SMOOTH_TIME_DEFAULT;

  constructor(audioContext = new AudioContext()) {
    this.audioContext = audioContext;
  }

  setGainSmoothTimeMs(ms: number): void {
    this.gainSmoothTimeMs = ms;
  }

  /**
   * Suspends audio time progression, releases the audio device, and reduces power use.
   * Resolves when the context has actually entered `suspended`.
   */
  suspend(): Promise<void> {
    return this.audioContext.suspend();
  }

  /**
   * Resumes time progression for a previously suspended context.
   * Resolves after the transition (typically to `running`).
   */
  resume(): Promise<void> {
    return this.audioContext.resume();
  }

  /** Current {@link AudioContext} lifecycle state (`running` | `suspended` | `closed`). */
  get state(): AudioContextState {
    return this.audioContext.state;
  }

  /** Snapshot of entities currently registered (after {@link push}, before {@link remove}). */
  getActiveEntities(): HarmonicEntity[] {
    return [...this.voices.keys()];
  }

  private sampleUrlForMidi(midi: number): string {
    const base = SAMPLED_INSTRUMENT_BASE_URL.endsWith("/")
      ? SAMPLED_INSTRUMENT_BASE_URL
      : `${SAMPLED_INSTRUMENT_BASE_URL}/`;
    return `${base}${midiToSoundfontFilename(midi, SAMPLED_INSTRUMENT_FILE_EXT)}`;
  }

  private async loadSampleBufferCached(midi: number): Promise<AudioBuffer | null> {
    let promise = this.sampleBufferPromises.get(midi);
    if (!promise) {
      promise = loadSampleBuffer(this.audioContext, this.sampleUrlForMidi(midi));
      this.sampleBufferPromises.set(midi, promise);
    }
    try {
      return await promise;
    } catch (err) {
      this.sampleBufferPromises.delete(midi);
      console.error("HarmonicEntityPlayer: sample load failed", { midi, err });
      return null;
    }
  }

  private connectVoiceChain(
    sourceNode: AudioNode,
    gainNode: GainNode,
    panNode: StereoPannerNode,
  ): void {
    sourceNode.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(this.audioContext.destination);
  }

  /**
   * Register an entity: wire nodes, start the source, and track for sync/removal.
   * Requires {@link state} `running` (e.g. after {@link resume} from a user gesture).
   * Resolves after the attack fade has elapsed (wall clock).
   */
  async push(entity: HarmonicEntity): Promise<void> {
    if (this.voices.has(entity)) return;

    if (this.audioContext.state !== "running") {
      throw new Error(
        "HarmonicEntityPlayer.push requires AudioContext state 'running'; call await resume() (e.g. from user activation) first.",
      );
    }

    const t0 = this.audioContext.currentTime;
    const gainNode = new GainNode(this.audioContext, { gain: 0 });
    if (entity.gain > 0) {
      gainNode.gain.setValueCurveAtTime([0, entity.gain], t0, this.gainSmoothTimeMs / 1000);
    }
    const panNode = new StereoPannerNode(this.audioContext, { pan: entity.pan });

    let voice: Voice;

    if (USE_SAMPLED_HARMONIC) {
      const buffer = await this.loadSampleBufferCached(entity.midi);
      if (buffer) {
        const sourceNode = new AudioBufferSourceNode(this.audioContext, { buffer });
        sourceNode.loop = true;
        /*
         * Full-buffer loop keeps the note sounding until remove(). If you hear clicks or the
         * attack repeating, try tuning loopStart / loopEnd (sustain region), metadata-driven
         * loop points, or separate sustain samples — not part of the minimal build.
         */
        sourceNode.playbackRate.value = 1;
        this.connectVoiceChain(sourceNode, gainNode, panNode);
        sourceNode.start();
        voice = { kind: "Sample", sourceNode, gainNode, panNode };
      } else {
        const sourceNode = new OscillatorNode(this.audioContext, {
          frequency: midiToFrequency(entity.midi),
        });
        this.connectVoiceChain(sourceNode, gainNode, panNode);
        sourceNode.start();
        voice = { kind: "Oscillator", sourceNode, gainNode, panNode };
      }
    } else {
      const sourceNode = new OscillatorNode(this.audioContext, {
        frequency: midiToFrequency(entity.midi),
      });
      this.connectVoiceChain(sourceNode, gainNode, panNode);
      sourceNode.start();
      voice = { kind: "Oscillator", sourceNode, gainNode, panNode };
    }

    this.voices.set(entity, voice);
    await delay(this.gainSmoothTimeMs);
  }

  /**
   * Fade gain to zero, stop the source, and disconnect nodes — releases the voice fully.
   * Idempotent if the entity is not registered. Resolves after the release fade (wall clock).
   */
  async remove(entity: HarmonicEntity): Promise<void> {
    const voice = this.voices.get(entity);
    if (!voice) return;
    this.voices.delete(entity);

    const t0 = this.audioContext.currentTime;
    const g = voice.gainNode.gain;
    if (g.value > 0) {
      g.cancelScheduledValues(t0);
      g.setValueCurveAtTime([g.value, 0], t0, this.gainSmoothTimeMs / 1000);
    }

    await delay(this.gainSmoothTimeMs);

    try {
      voice.sourceNode.stop();
    } catch {
      /* already stopped */
    }
    voice.sourceNode.disconnect();
    voice.gainNode.disconnect();
    voice.panNode.disconnect();
  }

  /** Push current {@link HarmonicEntity.gain} and {@link HarmonicEntity.pan} into the graph (pitch is not updated after {@link push}). */
  async apply(entity: HarmonicEntity): Promise<void> {
    const voice = this.voices.get(entity);
    if (!voice) return;

    const t0 = this.audioContext.currentTime;
    const g = voice.gainNode.gain;
    if (entity.gain !== g.value) {
      g.cancelScheduledValues(t0);
      g.setValueCurveAtTime([g.value, entity.gain], t0, this.gainSmoothTimeMs / 1000);
    }

    const p = voice.panNode.pan;
    if (entity.pan !== p.value) {
      p.cancelScheduledValues(t0);
      p.setValueCurveAtTime([p.value, entity.pan], t0, this.gainSmoothTimeMs / 1000);
    }

    await delay(this.gainSmoothTimeMs);
  }

  /** Remove all voices and close the context. */
  async shutdown(): Promise<void> {
    await Promise.all([...this.voices.keys()].map((e) => this.remove(e)));
    await this.audioContext.close();
  }
}
