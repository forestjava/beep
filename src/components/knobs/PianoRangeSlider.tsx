import { useState } from "react";
import ReactSlider from 'react-slider'
import { beep } from "../../BeepPlayer";
import { PIANO_SEMITONE_MIN, PIANO_SEMITONE_MAX } from "../../defaults";

export function PianoRangeSlider() {
  const [value, setValue] = useState([PIANO_SEMITONE_MIN, PIANO_SEMITONE_MAX]);

  return (
    <>
      <div className="piano-head">
        <span className="piano-label">PIANO</span>
        <span className="piano-readout">
          {value[0]} – {value[1]}
        </span>
      </div>
      <ReactSlider
        className="piano-slider"
        thumbClassName="piano-thumb"
        trackClassName="piano-track"
        min={PIANO_SEMITONE_MIN}
        max={PIANO_SEMITONE_MAX}
        step={1}
        pearling
        minDistance={1}
        value={[value[0], value[1]]}
        onChange={(arr) => {
          setValue([arr[0], arr[1]]);
          beep.setPianoRange(arr[0], arr[1]);
        }}
      />
    </>
  );
}
