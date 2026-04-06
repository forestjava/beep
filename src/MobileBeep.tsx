import { useState } from 'react'
import {
  DurationKnob,
  EntropyThresholdKnob,
  GainSmoothTimeKnob,
  MaxChannelsKnob,
  PowerDeferralBlendKnob,
  TickIntervalKnob,
  SpawnIntervalKnob,
} from './components/knobs'
import { PianoRangeSlider } from './components/knobs/PianoRangeSlider'
import { TransportButton } from './components/TransportButton'
import { beep } from './BeepPlayer'

export default function MobileBeep() {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)

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
        <SpawnIntervalKnob />
        <GainSmoothTimeKnob />
        <DurationKnob />
        {/* <MaxChannelsKnob />
        <EntropyThresholdKnob />
                
        <PowerDeferralBlendKnob /> */}
      </div>

      <div className="piano-block">
        <PianoRangeSlider />
      </div>

      <TransportButton
        playing={playing}
        loading={loading}
        onToggle={togglePlay}
      />
    </div>
  )
}
