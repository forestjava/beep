import { useEffect, useState } from 'react'
import Terminal from './components/Terminal'
import MobileBeep from './MobileBeep'
import { beep } from './BeepPlayer'

const LOG_CAP = 150

export default function DesktopPage() {
  const [logLines, setLogLines] = useState<string[]>([])

  useEffect(() => {
    beep.subscribe((line) => {
      setLogLines((prev) => [...prev, line].slice(-LOG_CAP));
    })
  }, [])

  return (
    <div className="desktop-shell">
      <div className="desktop-mobile-column">
        <MobileBeep />
      </div>
      <aside className="desktop-extended">
        <Terminal lines={logLines} />
      </aside>
    </div>
  )
}
