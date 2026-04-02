import { useState } from "react";
import { RotaryKnob } from "../RotaryKnob";
import { beepPlayer } from "../../playerSingleton";

/** Один полный оборот ручки соответствует диапазону 0…1000 в единицах интервала. */
const TICK_INTERVAL_SCALE = 1000;
const TICK_INTERVAL_MIN = 40;

export function TickIntervalKnob() {
  const [value, setValue] = useState(200);

  return (
    <div className="knob-row">
      <label className="knob-label">TICK_INTERVAL</label>
      <RotaryKnob
        discrete
        scale={TICK_INTERVAL_SCALE}
        min={TICK_INTERVAL_MIN}
        value={value}
        onChange={(userValue) => {
          const next = Math.round(userValue);
          setValue(next);
          beepPlayer.setTickInterval(next);
        }}
      />
      <output className="knob-value">{value}</output>
    </div>
  );
}
