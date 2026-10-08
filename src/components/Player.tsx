import { useRef, useState, useEffect } from 'react'
import type { Track } from '../types'
import { preloadPitch, setPitch } from '../lib/pitch'
import { formatSemitones, transposeKey } from '../lib/transpose'
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, VolumeHighIcon, VolumeLowIcon, VolumeMuteIcon } from './Icons'

const MAX_SHIFT = 6
const VOLUME_STORAGE_KEY = 'music-drop:volume'
// Keep in sync with the mobile breakpoint in App.css
const MOBILE_QUERY = '(max-width: 700px)'

function loadVolume() {
  try {
    const stored = localStorage.getItem(VOLUME_STORAGE_KEY)
    const v = stored === null ? 1 : Number(stored)
    return v >= 0 && v <= 1 ? v : 1
  } catch {
    return 1
  }
}

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
  const [volume, setVolume] = useState(loadVolume)
  const [muted, setMuted] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false)

  useEffect(() => { onNextRef.current = onNext })
  useEffect(() => { semitonesRef.current = semitones })
  useEffect(() => { preloadPitch() }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

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

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    setVolume(v)
    setMuted(v === 0)
    try { localStorage.setItem(VOLUME_STORAGE_KEY, String(v)) } catch { /* storage unavailable */ }
  }

  // On mobile the slider is tucked into a pop-up so it doesn't crowd the player;
  // the icon opens it there and mutes on desktop, where the slider is always visible
  const onVolumeIcon = () => {
    if (window.matchMedia(MOBILE_QUERY).matches) setVolumeOpen((o) => !o)
    else setMuted((m) => !m)
  }

  const progress = duration ? (currentTime / duration) * 100 : 0
  const fill = (pct: number) => `linear-gradient(to right, var(--primary), var(--accent) ${pct}%, var(--border) ${pct}%)`
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
          <button className="ctrl-btn" onClick={onPrev} disabled={!hasPrev} title="Anterior"><PrevIcon /></button>
          <button className="ctrl-btn play-btn" onClick={togglePlay} title={playing ? 'Pausar' : 'Tocar'}>
            {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </button>
          <button className="ctrl-btn" onClick={onNext} disabled={!hasNext} title="Próxima"><NextIcon /></button>
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
            style={{ background: fill(progress) }}
          />
          <span className="time">{formatTime(duration)}</span>
          <div className={`volume-control${volumeOpen ? ' open' : ''}`}>
            {/* Swallows the tap that closes the pop-up so it can't start another song */}
            {volumeOpen && <div className="volume-backdrop" onClick={() => setVolumeOpen(false)} />}
            <button
              className="ctrl-btn volume-btn"
              onClick={onVolumeIcon}
              title="Volume"
              aria-expanded={volumeOpen}
            >
              {muted || volume === 0 ? <VolumeMuteIcon /> : volume < 0.5 ? <VolumeLowIcon /> : <VolumeHighIcon />}
            </button>
            <div className="volume-popover">
              <input
                type="range"
                className="seek-bar volume-bar"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={changeVolume}
                aria-label="Volume"
                style={{ background: fill((muted ? 0 : volume) * 100) }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="player-right">
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
    </div>
  )
}
