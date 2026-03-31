import { useCallback, useState } from 'react'
import {
  DurationKnob,
  EntropyThresholdKnob,
  MaxChannelsKnob,
  TickIntervalKnob,
} from './components/knobs'
import { PianoRangeSlider } from './components/PianoRangeSlider'
import { TransportButton } from './components/TransportButton'
import { beepPlayer } from './playerSingleton'

export default function App() {
  const p = beepPlayer

  const [pianoRange, setPianoRange] = useState<[number, number]>([21, 84,])
  const [playing, setPlaying] = useState(false)

  const onPianoChange = useCallback(
    (range: [number, number]) => {
      setPianoRange(range)
      p.setPianoRange(range[0], range[1])
    },
    [p],
  )

  const togglePlay = useCallback(() => {
    setPlaying((x) => {
      const next = !x
      p.setPlaying(next)
      return next
    })
  }, [p])

  return (
    <div className="app-shell">
      <h1 className="app-title">Beep</h1>

      <div className="knobs-grid">
        <TickIntervalKnob />
        <MaxChannelsKnob />
        <EntropyThresholdKnob />
        <DurationKnob />
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

      <TransportButton playing={playing} onToggle={togglePlay} />
    </div>
  )
}
