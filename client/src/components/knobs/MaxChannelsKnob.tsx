import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beepPlayer } from "../../playerSingleton";

const CHANNELS_SCALE = 16;
const CHANNELS_MIN = 16;

export function MaxChannelsKnob() {
  const [value, setValue] = useState(CHANNELS_MIN);

  return (
    <div className="knob-row">
      <label className="knob-label">MAX_CONCURRENT_ENTITIES</label>
      <RotaryKnob
        min={CHANNELS_MIN / CHANNELS_SCALE}
        value={value / CHANNELS_SCALE}
        onChange={(turns) => {
          const next = Math.round(turns * CHANNELS_SCALE);
          if (next !== value) {
            setValue(next);
            beepPlayer.setMaxConcurrentEntities(next);
          }
        }}
      />
      <output className="knob-value">{String(value)}</output>
    </div>
  );
}
