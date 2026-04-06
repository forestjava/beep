import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beep } from "../../BeepPlayer";
import {
  SPAWN_INTERVAL_SCALE,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_DEFAULT,
} from "../../defaults";

export function SpawnIntervalKnob() {
  const [value, setValue] = useState(SPAWN_INTERVAL_DEFAULT);

  return (
    <div className="knob-row">
      <label className="knob-label">SPAWN_INTERVAL_MS</label>
      <RotaryKnob
        discrete
        scale={SPAWN_INTERVAL_SCALE}
        min={SPAWN_INTERVAL_MIN}
        value={value}
        onChange={(userValue) => {
          const next = Math.round(userValue);
          setValue(next);
          beep.setSpawnInterval(next);
        }}
      />
      <output className="knob-value">{value}</output>
    </div>
  );
}
