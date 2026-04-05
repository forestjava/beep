export const TICK_INTERVAL_SCALE = 1000;
export const TICK_INTERVAL_MIN = 40;
export const TICK_INTERVAL_DEFAULT = 100;

export const CHANNELS_SCALE = 16;
export const CHANNELS_MIN = 4;
export const CHANNELS_DEFAULT = 64;

export const ENTROPY_THRESHOLD_DEFAULT = 128;

export const DURATION_SCALE = 10000;
export const DURATION_MIN = 40;
export const DURATION_DEFAULT = 8000;

export const PIANO_SEMITONE_MIN = 21;
export const PIANO_SEMITONE_MAX = 84;

export const GAIN_SMOOTH_TIME_SCALE = 1000;
export const GAIN_SMOOTH_TIME_MIN = 40;
export const GAIN_SMOOTH_TIME_DEFAULT = 800;

export const POWER_DEFERRAL_BLEND_DEFAULT = 0.200;

/** When true, voices use gleitz-style soundfont samples; otherwise {@link OscillatorNode}. */
export const USE_SAMPLED_HARMONIC = true;
export const SAMPLED_INSTRUMENT_BASE_URL = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/rock_organ-mp3/";

/** File extension for {@link SAMPLED_INSTRUMENT_BASE_URL} (no dot). */
export const SAMPLED_INSTRUMENT_FILE_EXT = "mp3";