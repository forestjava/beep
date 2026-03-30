import ReactSlider from 'react-slider'

export type PianoRangeSliderProps = {
  value: readonly [number, number]
  onChange: (range: [number, number]) => void
}

export function PianoRangeSlider(props: PianoRangeSliderProps) {
  const { value, onChange } = props

  return (
    <ReactSlider
      className="piano-slider"
      thumbClassName="piano-thumb"
      trackClassName="piano-track"
      min={20}
      max={100}
      step={1}
      pearling
      minDistance={1}
      value={[value[0], value[1]]}
      onChange={(v) => {
        const arr = v as number[]
        onChange([Math.round(arr[0]!), Math.round(arr[1]!)])
      }}
      ariaLabel={['Нижняя граница полутонов', 'Верхняя граница полутонов']}
    />
  )
}
