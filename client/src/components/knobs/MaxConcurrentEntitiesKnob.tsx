import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beepPlayer } from "../../playerSingleton";
import { formatKnobReadout } from "./formatKnobReadout";

const MIN = 0;

export function MaxConcurrentEntitiesKnob() {
  const [value, setValue] = useState(0);

  return (
    <div className="knob-row">
      <label className="knob-label">MAX_CONCURRENT_ENTITIES</label>
      <RotaryKnob
        value={value}
        onChange={(v) => {
          setValue(v);
          beepPlayer.setMaxConcurrentEntities(v);
        }}
        min={MIN}
      />
      <output className="knob-value">{formatKnobReadout(value)}</output>
    </div>
  );
}
