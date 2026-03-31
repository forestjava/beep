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
        discrete
        scale={CHANNELS_SCALE}
        min={CHANNELS_MIN}
        value={value}
        onChange={(userValue) => {
          const next = Math.round(userValue);
          //if (next !== value) {
          setValue(next);
          beepPlayer.setMaxConcurrentEntities(next);
          //}
        }}
      />
      <output className="knob-value">{String(value)}</output>
    </div>
  );
}
