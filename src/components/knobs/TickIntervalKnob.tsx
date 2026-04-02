import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beep } from "../../BeepPlayer";
import { TICK_INTERVAL_SCALE, TICK_INTERVAL_MIN, TICK_INTERVAL_DEFAULT } from "../../defaults";


export function TickIntervalKnob() {
  const [value, setValue] = useState(TICK_INTERVAL_DEFAULT);

  return (
    <div className="knob-row">
      <label className="knob-label">TICK_INTERVAL_MS</label>
      <RotaryKnob
        discrete
        scale={TICK_INTERVAL_SCALE}
        min={TICK_INTERVAL_MIN}
        value={value}
        onChange={(userValue) => {
          const next = Math.round(userValue);
          setValue(next);
          beep.setTickInterval(next);
        }}
      />
      <output className="knob-value">{value}</output>
    </div>
  );
}
