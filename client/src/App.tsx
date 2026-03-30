import { useCallback, useState } from 'react'
import {
  DurationKnob,
  EntropyThresholdKnob,
  MaxConcurrentEntitiesKnob,
  TickIntervalKnob,
} from './components/knobs'
import { PianoRangeSlider } from './components/PianoRangeSlider'
import { TransportButton } from './components/TransportButton'
import {
  PIANO_SEMITONE_MAX,
  PIANO_SEMITONE_MIN,
} from './piano'
import { beepPlayer } from './playerSingleton'

export default function App() {
  const p = beepPlayer

  const [pianoRange, setPianoRange] = useState<[number, number]>([
    PIANO_SEMITONE_MIN,
    PIANO_SEMITONE_MAX,
  ])
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

      <TickIntervalKnob />
      <MaxConcurrentEntitiesKnob />
      <EntropyThresholdKnob />
      <DurationKnob />

      <div className="piano-block">
        <div className="piano-head">
          <span className="piano-label">PIANO</span>
          <span className="piano-readout">
            {pianoRange[0]} – {pianoRange[1]}
          </span>
        </div>
        <PianoRangeSlider value={pianoRange} onChange={onPianoChange} />
        <p className="piano-hint">
          Диапазон 20–100 (полутоны), шаг 1. По умолчанию {PIANO_SEMITONE_MIN}–
          {PIANO_SEMITONE_MAX}
        </p>
      </div>

      <TransportButton playing={playing} onToggle={togglePlay} />
    </div>
  )
}
