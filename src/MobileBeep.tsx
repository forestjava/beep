import { useState } from 'react'
import {
  DurationKnob,
  EntropyThresholdKnob,
  GainSmoothTimeKnob,
  MaxChannelsKnob,
  // PowerDeferralBlendKnob,
  TickIntervalKnob,
} from './components/knobs'
import { PianoRangeSlider } from './components/PianoRangeSlider'
import { TransportButton } from './components/TransportButton'
import { beep } from './BeepPlayer'

export default function MobileBeep() {
  const [pianoRange, setPianoRange] = useState<[number, number]>([21, 108])
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)

  const onPianoChange = (range: [number, number]) => {
    setPianoRange(range)
    beep.setPianoRange(range[0], range[1])
  }

  const togglePlay = async () => {
    if (loading) return
    setLoading(true)
    if (playing) await beep.pause()
    else await beep.play()
    setPlaying(!playing)
    setLoading(false)
  }

  return (
    <div className="app-shell">
      <h1 className="app-title">Beep</h1>

      <div className="knobs-grid">
        <TickIntervalKnob />
        <MaxChannelsKnob />
        <EntropyThresholdKnob />
        <DurationKnob />
        <GainSmoothTimeKnob />
        {/* <PowerDeferralBlendKnob /> */}
      </div>

      <div className="piano-block">
        <div className="piano-head">
          <span className="piano-label">PIANO</span>
          <span className="piano-readout">
            {pianoRange[0]} – {pianoRange[1]}
          </span>
        </div>
        <PianoRangeSlider value={pianoRange} onChange={onPianoChange} />
      </div>

      <TransportButton
        playing={playing}
        loading={loading}
        onToggle={togglePlay}
      />
    </div>
  )
}
