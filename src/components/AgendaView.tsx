import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDay, formatEventDate, formatMonth } from '../lib/dates'
import { STATUS_LABEL } from '../lib/attendance'
import type { Attendance, BandEvent, EventType, Playlist } from '../types'
import EventModal from './EventModal'

interface Props {
  userId: string
  playlists: Playlist[]
}

export default function AgendaView({ userId, playlists }: Props) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<BandEvent[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [filter, setFilter] = useState<EventType | 'todos'>('todos')
  const [showPast, setShowPast] = useState(false)
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    const [{ data: ev }, { data: att }] = await Promise.all([
      supabase.from('events').select('*').order('starts_at'),
      supabase.from('attendance').select('*'),
    ])
    if (ev) setEvents(ev)
    if (att) setAttendance(att)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Events from earlier today still count as upcoming
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const filtered = events.filter((e) => filter === 'todos' || e.type === filter)
  const upcoming = filtered.filter((e) => new Date(e.starts_at) >= todayStart)
  const past = filtered.filter((e) => new Date(e.starts_at) < todayStart).reverse()

  const renderEvent = (ev: BandEvent) => {
    const votes = attendance.filter((a) => a.event_id === ev.id)
    const mine = votes.find((a) => a.user_id === userId)
    const going = votes.filter((a) => a.status === 'vou').length
    const setlist = playlists.find((p) => p.id === ev.setlist_id)
    return (
      <Link key={ev.id} to={`/agenda/${ev.id}`} className={`event-card ${ev.type}`}>
        <div className="event-date">
          <span className="event-day">{formatDay(ev.starts_at)}</span>
          <span className="event-month">{formatMonth(ev.starts_at)}</span>
        </div>
        <div className="event-info">
          <div className="event-title">
            <span className={`event-type ${ev.type}`}>{ev.type === 'show' ? 'Show' : 'Ensaio'}</span>
            {ev.title}
          </div>
          <div className="event-meta">
            {formatEventDate(ev.starts_at)}
            {ev.location && ` · ${ev.location}`}
            {setlist && ` · ♪ ${setlist.name}`}
          </div>
        </div>
        <div className="event-vote-summary">
          <span className="event-going">{going} vão</span>
          <span className={`vote-chip ${mine?.status ?? 'none'}`}>
            {mine ? STATUS_LABEL[mine.status] : 'Responder'}
          </span>
        </div>
      </Link>
    )
  }

  return (
    <div className="agenda-view">
      <div className="pv-header">
        <div>
          <h2 className="pv-title">Agenda</h2>
          <span className="pv-meta">Shows e ensaios da banda</span>
        </div>
        <div className="pv-actions">
          <div className="segmented">
            {(['todos', 'ensaio', 'show'] as const).map((f) => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f === 'todos' ? 'Todos' : f === 'ensaio' ? 'Ensaios' : 'Shows'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => setCreating(true)}>+ Novo evento</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Carregando...</div>
      ) : upcoming.length === 0 ? (
        <div className="empty-state">
          <p>Nada marcado.</p>
          <button className="btn-primary" onClick={() => setCreating(true)}>Marcar ensaio ou show</button>
        </div>
      ) : (
        <div className="event-list">{upcoming.map(renderEvent)}</div>
      )}

      {past.length > 0 && (
        <div className="past-events">
          <button className="btn-secondary" onClick={() => setShowPast((s) => !s)}>
            {showPast ? 'Esconder' : 'Mostrar'} eventos passados ({past.length})
          </button>
          {showPast && <div className="event-list past">{past.map(renderEvent)}</div>}
        </div>
      )}

      {creating && (
        <EventModal
          playlists={playlists}
          onClose={() => setCreating(false)}
          onSaved={(id) => { setCreating(false); navigate(`/agenda/${id}`) }}
        />
      )}
    </div>
  )
}
