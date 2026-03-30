/** Debug stub: будущий плеер; сейчас только логирует изменения настроек. */
export class BeepPlayer {
  setTickInterval(value: number): void {
    console.log('[BeepPlayer] TICK_INTERVAL', value)
  }

  setMaxConcurrentEntities(value: number): void {
    console.log('[BeepPlayer] MAX_CONCURRENT_ENTITIES', value)
  }

  setEntropyThreshold(value: number): void {
    console.log('[BeepPlayer] ENTROPY_THRESHOLD', value)
  }

  setDuration(value: number): void {
    console.log('[BeepPlayer] DURATION', value)
  }

  setPianoRange(minSemitone: number, maxSemitone: number): void {
    console.log('[BeepPlayer] PIANO', { minSemitone, maxSemitone })
  }

  setPlaying(playing: boolean): void {
    console.log('[BeepPlayer] playing', playing)
  }
}
