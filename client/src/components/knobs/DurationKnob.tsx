import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beepPlayer } from "../../playerSingleton";
import { formatKnobReadout } from "./formatKnobReadout";

export function DurationKnob() {
  const [value, setValue] = useState(0);

  return (
    <div className="knob-row">
      <label className="knob-label">DURATION</label>
      <RotaryKnob
        value={value}
        onChange={(v) => {
          setValue(v);
          beepPlayer.setDuration(v);
        }}
      />
      <output className="knob-value">{formatKnobReadout(value)}</output>
    </div>
  );
}
