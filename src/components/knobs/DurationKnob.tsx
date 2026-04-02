import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beep } from "../../BeepPlayer";
import { DURATION_SCALE, DURATION_MIN, DURATION_DEFAULT } from "../../defaults";

export function DurationKnob() {
  const [value, setValue] = useState(DURATION_DEFAULT);

  return (
    <div className="knob-row">
      <label className="knob-label">DURATION_MS</label>
      <RotaryKnob
        scale={DURATION_SCALE}
        discrete
        min={DURATION_MIN}
        value={value}
        onChange={(v) => {
          setValue(v);
          beep.setDuration(v);
        }}
      />
      <output className="knob-value">{value}</output>
    </div>
  );
}
