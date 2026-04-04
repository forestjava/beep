import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beep } from "../../BeepPlayer";
import {
  GAIN_SMOOTH_TIME_SCALE,
  GAIN_SMOOTH_TIME_MIN,
  GAIN_SMOOTH_TIME_DEFAULT,
} from "../../defaults";

export function GainSmoothTimeKnob() {
  const [value, setValue] = useState(GAIN_SMOOTH_TIME_DEFAULT);

  return (
    <div className="knob-row">
      <label className="knob-label">GAIN_SMOOTH_MS</label>
      <RotaryKnob
        scale={GAIN_SMOOTH_TIME_SCALE}
        discrete
        min={GAIN_SMOOTH_TIME_MIN}
        value={value}
        onChange={(v) => {
          setValue(v);
          beep.setGainSmoothTimeMs(v);
        }}
      />
      <output className="knob-value">{value}</output>
    </div>
  );
}
