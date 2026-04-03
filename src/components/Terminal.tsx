import { useEffect, useRef } from 'react'

type TerminalProps = {
  lines: readonly string[]
}

export default function Terminal({ lines }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines])

  return (
    <div className="terminal" ref={scrollRef} role="log" aria-live="polite">
      {lines.map((line, i) => (
        <div
          key={`${i}-${line.slice(0, 48)}`}
          className="terminal-line"
          style={{ whiteSpace: 'normal' }}
        >
          {line.replace(/\r?\n/g, ' ')}
        </div>
      ))}
    </div>
  )
}
