import type { HarmonicEntity } from "./HarmonicEntity";
import { loadSampleBuffer, midiToSoundfontFilename } from "./soundfontSample";
import {
  GAIN_SMOOTH_TIME_DEFAULT,
  SAMPLED_INSTRUMENT_FILE_EXT,
  SAMPLED_SOUNDFONT_GM_BASE,
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

/** FluidR3_GM folder names (without `-mp3`), by [duration row][MIDI column]. */
// @ts-ignore unused
const INSTRUMENT_GRID: readonly (readonly string[])[] = [
  [
    "acoustic_bass",
    "electric_bass_finger",
    "pizzicato_strings",
    "synth_drum",
    "xylophone",
    "piccolo",
  ],
  [
    "taiko_drum",
    "timpani",
    "acoustic_guitar_steel",
    "trumpet",
    "xylophone",
    "flute",
  ],
  ["tuba", "trombone", "cello", "violin", "flute", "piccolo"],
  [
    "church_organ",
    "church_organ",
    "acoustic_grand_piano",
    "acoustic_grand_piano",
    "string_ensemble_1",
    "choir_aahs",
  ],
];

// @ts-ignore unused
function durationRow(lifetimeMs: number): number {
  if (lifetimeMs < 200) return 0;
  if (lifetimeMs < 800) return 1;
  if (lifetimeMs < 3000) return 2;
  return 3;
}

// @ts-ignore unused
function midiColumn(midi: number): number {
  if (midi < 24) return 0;
  if (midi < 35) return 0;
  if (midi < 48) return 1;
  if (midi < 57) return 2;
  if (midi < 81) return 3;
  if (midi < 96) return 4;
  return 5;
}

// @ts-ignore unused
function pickFluidInstrument(lifetimeMs: number, midi: number): string {
  //return INSTRUMENT_GRID[durationRow(lifetimeMs)]![midiColumn(midi)]!;
  return "church_organ";
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
  private readonly sampleBufferPromises = new Map<string, Promise<AudioBuffer>>();
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

  private sampleBufferCacheKey(instrument: string, midi: number): string {
    return `${instrument}\t${midi}`;
  }

  private sampleUrl(instrument: string, midi: number): string {
    const root = SAMPLED_SOUNDFONT_GM_BASE.endsWith("/")
      ? SAMPLED_SOUNDFONT_GM_BASE
      : `${SAMPLED_SOUNDFONT_GM_BASE}/`;
    return `${root}${instrument}-mp3/${midiToSoundfontFilename(midi, SAMPLED_INSTRUMENT_FILE_EXT)}`;
  }

  private async loadSampleBufferCached(
    instrument: string,
    midi: number,
  ): Promise<AudioBuffer | null> {
    const key = this.sampleBufferCacheKey(instrument, midi);
    let promise = this.sampleBufferPromises.get(key);
    if (!promise) {
      promise = loadSampleBuffer(this.audioContext, this.sampleUrl(instrument, midi));
      this.sampleBufferPromises.set(key, promise);
    }
    try {
      return await promise;
    } catch (err) {
      this.sampleBufferPromises.delete(key);
      console.error("HarmonicEntityPlayer: sample load failed", { instrument, midi, err });
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
      const instrument = pickFluidInstrument(entity.sampleLifetimeMs, entity.midi);
      const buffer = await this.loadSampleBufferCached(instrument, entity.midi);
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
