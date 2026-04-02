import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beep } from "../../BeepPlayer";
import { CHANNELS_SCALE, CHANNELS_MIN, CHANNELS_DEFAULT } from "../../defaults";

export function MaxChannelsKnob() {
  const [value, setValue] = useState(CHANNELS_DEFAULT);

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
          beep.setMaxConcurrentEntities(next);
          //}
        }}
      />
      <output className="knob-value">{value}</output>
    </div>
  );
}
