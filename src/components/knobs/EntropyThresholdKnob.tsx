import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beep } from "../../BeepPlayer";
import { ENTROPY_THRESHOLD_DEFAULT } from "../../defaults";

export function EntropyThresholdKnob() {
  const [value, setValue] = useState(ENTROPY_THRESHOLD_DEFAULT);

  return (
    <div className="knob-row">
      <label className="knob-label">ENTROPY_THRESHOLD</label>
      <RotaryKnob
        min={0}
        value={Math.log2(value)}
        onChange={(turns) => {
          const userValue = 2 ** turns;
          setValue(userValue);
          beep.setEntropyThreshold(userValue);
        }}
      />
      <output className="knob-value">{String(Math.round(value))}</output>
    </div>
  );
}
