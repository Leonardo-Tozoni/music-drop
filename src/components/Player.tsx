import { useRef, useState, useEffect } from 'react'
import type { Track } from '../types'
import { preloadPitch, setPitch } from '../lib/pitch'
import { formatSemitones, transposeKey } from '../lib/transpose'

const MAX_SHIFT = 6

interface Props {
  track: Track
  audioUrl: string
  semitones: number
  onSemitonesChange: (semitones: number) => void
  onPrev: () => void
  onNext: () => void
  hasPrev: boolean
  hasNext: boolean
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function Player({
  track, audioUrl, semitones, onSemitonesChange, onPrev, onNext, hasPrev, hasNext,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const onNextRef = useRef(onNext)
  const semitonesRef = useRef(semitones)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => { onNextRef.current = onNext })
  useEffect(() => { semitonesRef.current = semitones })
  useEffect(() => { preloadPitch() }, [])

  // Pitch can also change from the chord sheet while this track plays
  useEffect(() => {
    if (audioRef.current) setPitch(audioRef.current, semitones)
  }, [semitones])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = audioUrl
    setCurrentTime(0)
    setDuration(0)
    setPitch(audio, semitonesRef.current)
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
  }, [audioUrl])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoaded = () => setDuration(audio.duration)
    const onEnded = () => { setPlaying(false); onNextRef.current() }
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const t = Number(e.target.value)
    audio.currentTime = t
    setCurrentTime(t)
  }

  const shift = (next: number) => {
    const audio = audioRef.current
    if (!audio) return
    const clamped = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, next))
    // Called inside the click so the AudioContext can be unlocked
    setPitch(audio, clamped)
    onSemitonesChange(clamped)
  }

  const progress = duration ? (currentTime / duration) * 100 : 0
  const shiftedKey = semitones !== 0 && track.key ? transposeKey(track.key, semitones) : null

  return (
    <div className="player">
      <audio ref={audioRef} crossOrigin="anonymous" />
      <div className="player-info">
        <div className="player-name">{track.name}</div>
        <div className="player-meta">{track.band} · {track.key}</div>
      </div>
      <div className="player-center">
        <div className="player-controls">
          <button className="ctrl-btn" onClick={onPrev} disabled={!hasPrev} title="Anterior">⏮</button>
          <button className="ctrl-btn play-btn" onClick={togglePlay} title={playing ? 'Pausar' : 'Tocar'}>
            {playing ? '⏸' : '▶'}
          </button>
          <button className="ctrl-btn" onClick={onNext} disabled={!hasNext} title="Próxima">⏭</button>
        </div>
        <div className="player-progress">
          <span className="time">{formatTime(currentTime)}</span>
          <input
            type="range"
            className="seek-bar"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={seek}
            style={{ background: `linear-gradient(to right, var(--primary) ${progress}%, var(--border) 0%)` }}
          />
          <span className="time">{formatTime(duration)}</span>
        </div>
      </div>
      <div className="pitch-control">
        <span className="pitch-label">Tom</span>
        <button
          className="pitch-btn"
          onClick={() => shift(semitones - 1)}
          disabled={semitones <= -MAX_SHIFT}
          title="Meio tom abaixo"
        >−</button>
        <span className={`pitch-value${semitones !== 0 ? ' shifted' : ''}`}>
          {shiftedKey ? `${track.key} → ${shiftedKey}` : track.key || '—'}
          {semitones !== 0 && <small> ({formatSemitones(semitones)})</small>}
        </span>
        <button
          className="pitch-btn"
          onClick={() => shift(semitones + 1)}
          disabled={semitones >= MAX_SHIFT}
          title="Meio tom acima"
        >+</button>
        {semitones !== 0 && (
          <button className="pitch-reset" onClick={() => shift(0)} title="Tom original">↺</button>
        )}
      </div>
    </div>
  )
}
