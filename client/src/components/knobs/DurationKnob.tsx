import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beepPlayer } from "../../playerSingleton";

export function DurationKnob() {
  const [value, setValue] = useState(3200);

  return (
    <div className="knob-row">
      <label className="knob-label">DURATION</label>
      <RotaryKnob
        scale={3200}
        discrete
        min={40}
        value={value}
        onChange={(v) => {
          setValue(v);
          beepPlayer.setDuration(v);
        }}
      />
      <output className="knob-value">{value}</output>
    </div>
  );
}
