export const TICK_INTERVAL_SCALE = 1000;
export const TICK_INTERVAL_MIN = 40;
export const TICK_INTERVAL_DEFAULT = 400;

export const SPAWN_INTERVAL_SCALE = 1000;
export const SPAWN_INTERVAL_MIN = 40;
export const SPAWN_INTERVAL_DEFAULT = 1000;

export const CHANNELS_SCALE = 16;
export const CHANNELS_MIN = 4;
export const CHANNELS_DEFAULT = 16;

export const ENTROPY_THRESHOLD_DEFAULT = 128;

export const DURATION_SCALE = 10000;
export const DURATION_MIN = 40;
export const DURATION_DEFAULT = 10000;

export const PIANO_SEMITONE_MIN = 21;
export const PIANO_SEMITONE_MAX = 108;

export const GAIN_SMOOTH_TIME_SCALE = 1000;
export const GAIN_SMOOTH_TIME_MIN = 40;
export const GAIN_SMOOTH_TIME_DEFAULT = 400;

export const POWER_DEFERRAL_BLEND_DEFAULT = 0.100;

/** Base URL for FluidR3_GM (trailing slash). Instrument folder is `{name}-mp3/`. */
export const SAMPLED_SOUNDFONT_GM_BASE = "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/";

/** File extension for per-note samples under `{instrument}-mp3/` (no dot). */
export const SAMPLED_INSTRUMENT_FILE_EXT = "mp3";
