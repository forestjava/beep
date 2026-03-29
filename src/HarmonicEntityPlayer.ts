import {
  AudioContext,
  GainNode,
  OscillatorNode,
  StereoPannerNode,
} from "node-web-audio-api";
import type { HarmonicEntity } from "./HarmonicEntity";

/** Linear gain smoothing for attack (0 → level) and release (level → 0), in seconds. */
const SMOOTH_TIME = 0.04;
/** Wall-clock slack so timers align with audio render timeline, in seconds. */
const SLACK_TIME = 0.01;

function delay(s: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
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

  constructor(audioContext = new AudioContext()) {
    this.audioContext = audioContext;
  }

  /** Snapshot of entities currently registered (after {@link push}, before {@link remove}). */
  getActiveEntities(): HarmonicEntity[] {
    return [...this.voices.keys()];
  }

  /**
   * Register an entity: wire nodes, start the oscillator, and track for sync/removal.
   * Resolves after the attack fade has elapsed (wall clock).
   */
  async push(entity: HarmonicEntity): Promise<void> {
    if (this.voices.has(entity)) return;

    void this.audioContext.resume();

    const t0 = this.audioContext.currentTime;
    const gainNode = new GainNode(this.audioContext);
    gainNode.gain.setValueAtTime(0, t0);
    gainNode.gain.linearRampToValueAtTime(
      entity.gain,
      t0 + SMOOTH_TIME,
    );
    const oscillator = new OscillatorNode(this.audioContext, {
      frequency: entity.frequency,
      type: "sine",
    });
    const panner = new StereoPannerNode(this.audioContext, { pan: entity.pan });

    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(this.audioContext.destination);
    oscillator.start();

    this.voices.set(entity, { oscillator, gainNode, panner });
    await delay(SMOOTH_TIME + SLACK_TIME);
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
    g.cancelScheduledValues(t0);
    g.linearRampToValueAtTime(0, t0 + SMOOTH_TIME);

    await delay(SMOOTH_TIME + SLACK_TIME);

    try {
      voice.oscillator.stop();
    } catch {
      /* already stopped */
    }
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
    g.cancelScheduledValues(t0);
    g.exponentialRampToValueAtTime(entity.gain, t0 + SMOOTH_TIME);

    const f = voice.oscillator.frequency;
    f.cancelScheduledValues(t0);
    f.exponentialRampToValueAtTime(entity.frequency, t0 + SMOOTH_TIME);

    const p = voice.panner.pan;
    p.cancelScheduledValues(t0);
    p.linearRampToValueAtTime(entity.pan, t0 + SMOOTH_TIME);

    await delay(SMOOTH_TIME + SLACK_TIME);
  }

  /** Remove all voices and close the context. */
  async shutdown(): Promise<void> {
    await Promise.all([...this.voices.keys()].map((e) => this.remove(e)));
    await this.audioContext.close();
  }
}
