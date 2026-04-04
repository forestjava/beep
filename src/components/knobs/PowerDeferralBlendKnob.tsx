import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beep } from "../../BeepPlayer";
import { POWER_DEFERRAL_BLEND_DEFAULT } from "../../defaults";

export function PowerDeferralBlendKnob() {
  const [value, setValue] = useState(POWER_DEFERRAL_BLEND_DEFAULT);

  return (
    <div className="knob-row">
      <label className="knob-label">POWER_DEFERRAL</label>
      <RotaryKnob
        min={0}
        value={value}
        onChange={(v) => {
          setValue(v);
          beep.setPowerDeferralBlend(v);
        }}
      />
      <output className="knob-value">{value.toFixed(3)}</output>
    </div>
  );
}
