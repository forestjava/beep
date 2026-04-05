import type { HarmonicEntity } from "./HarmonicEntity";
import { GAIN_SMOOTH_TIME_DEFAULT } from "../defaults";

/** Wall-clock slack so timers align with audio render timeline, in seconds. */
const SLACK_TIME_MS = 100;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms + SLACK_TIME_MS);
  });
}

type Voice = {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  panner: StereoPannerNode;
};

/**
 * Routes {@link HarmonicEntity} instances through Web Audio: one oscillator + gain per entity.
 * Entities are keyed by object identity so the same reference can be updated or removed later.
 */
export class HarmonicEntityPlayer {
  readonly audioContext: AudioContext;
  private readonly voices = new Map<HarmonicEntity, Voice>();
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

  /**
   * Register an entity: wire nodes, start the oscillator, and track for sync/removal.
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
      console.log("push", [0, entity.gain.toFixed(3)]);
    }
    const oscillator = new OscillatorNode(this.audioContext, { frequency: entity.frequency });
    const panner = new StereoPannerNode(this.audioContext, { pan: entity.pan });

    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.audioContext.destination);
    oscillator.start();

    this.voices.set(entity, { oscillator, gainNode, panner });
    await delay(this.gainSmoothTimeMs);
  }

  /**
   * Fade gain to zero, stop the oscillator, and disconnect both nodes — releases the voice fully.
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

    voice.oscillator.stop();
    voice.oscillator.disconnect();
    voice.gainNode.disconnect();
    voice.panner.disconnect();

  }

  /** Push current {@link HarmonicEntity.gain}, {@link HarmonicEntity.frequency}, {@link HarmonicEntity.pan} into the graph. */
  async apply(entity: HarmonicEntity): Promise<void> {
    const voice = this.voices.get(entity);
    if (!voice) return;

    const t0 = this.audioContext.currentTime;
    const g = voice.gainNode.gain;
    if (entity.gain !== g.value) {
      g.cancelScheduledValues(t0);
      g.setValueCurveAtTime([g.value, entity.gain], t0, this.gainSmoothTimeMs / 1000);
    }

    const f = voice.oscillator.frequency;
    if (entity.frequency !== f.value) {
      f.cancelScheduledValues(t0);
      f.setValueCurveAtTime([f.value, entity.frequency], t0, this.gainSmoothTimeMs / 1000);
    }

    const p = voice.panner.pan;
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
