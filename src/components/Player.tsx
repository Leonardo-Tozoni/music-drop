import { useRef, useState, useEffect } from 'react'
import type { Track } from '../types'

interface Props {
  track: Track
  audioUrl: string
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

export default function Player({ track, audioUrl, onPrev, onNext, hasPrev, hasNext }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const onNextRef = useRef(onNext)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => { onNextRef.current = onNext })

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = audioUrl
    setCurrentTime(0)
    setDuration(0)
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

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="player">
      <audio ref={audioRef} />
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
    </div>
  )
}
