import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beepPlayer } from "../../playerSingleton";
import { formatKnobReadout } from "./formatKnobReadout";

export function EntropyThresholdKnob() {
  const [value, setValue] = useState(0);

  return (
    <div className="knob-row">
      <label className="knob-label">ENTROPY_THRESHOLD</label>
      <RotaryKnob
        value={value}
        onChange={(v) => {
          setValue(v);
          beepPlayer.setEntropyThreshold(v);
        }}
      />
      <output className="knob-value">{formatKnobReadout(value)}</output>
    </div>
  );
}
