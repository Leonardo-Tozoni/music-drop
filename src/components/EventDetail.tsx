import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatEventDate } from '../lib/dates'
import { STATUSES, STATUS_LABEL } from '../lib/attendance'
import type { Attendance, AttendanceStatus, BandEvent, Playlist, Profile } from '../types'
import EventModal from './EventModal'

interface Props {
  userId: string
  playlists: Playlist[]
  onPlaySetlist: (playlistId: string) => void
}

export default function EventDetail({ userId, playlists, onPlaySetlist }: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState<BandEvent | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [voting, setVoting] = useState(false)

  const fetchEvent = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
    setEvent(data)
    setLoading(false)
  }, [id])

  const fetchAttendance = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('attendance').select('*').eq('event_id', id)
    if (data) setAttendance(data)
  }, [id])

  useEffect(() => {
    fetchEvent()
    fetchAttendance()
    supabase.from('profiles').select('id, name, instrument').order('name')
      .then(({ data }) => { if (data) setProfiles(data) })
  }, [fetchEvent, fetchAttendance])

  // Votes from other members show up live
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`attendance-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `event_id=eq.${id}` }, fetchAttendance)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, fetchAttendance])

  if (loading) return <div className="empty-state">Carregando...</div>
  if (!event) {
    return (
      <div className="empty-state">
        <p>Evento não encontrado.</p>
        <Link to="/agenda" className="btn-secondary">Voltar para agenda</Link>
      </div>
    )
  }

  const mine = attendance.find((a) => a.user_id === userId)
  const setlist = playlists.find((p) => p.id === event.setlist_id)
  const statusOf = (profileId: string) => attendance.find((a) => a.user_id === profileId)?.status
  const pending = profiles.filter((p) => !statusOf(p.id))

  const vote = async (status: AttendanceStatus) => {
    setVoting(true)
    // Optimistic so the button reacts instantly
    setAttendance((prev) => [
      ...prev.filter((a) => a.user_id !== userId),
      { id: mine?.id ?? 'local', event_id: event.id, user_id: userId, status, updated_at: new Date().toISOString() },
    ])
    await supabase.from('attendance').upsert(
      { event_id: event.id, user_id: userId, status, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' },
    )
    await fetchAttendance()
    setVoting(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Deletar "${event.title}"?`)) return
    await supabase.from('events').delete().eq('id', event.id)
    navigate('/agenda')
  }

  return (
    <div className="event-detail">
      <div className="pv-header">
        <div>
          <Link to="/agenda" className="back-link">← Agenda</Link>
          <h2 className="pv-title">
            <span className={`event-type ${event.type}`}>{event.type === 'show' ? 'Show' : 'Ensaio'}</span>
            {event.title}
          </h2>
          <span className="pv-meta">
            {formatEventDate(event.starts_at)}
            {event.location && ` · ${event.location}`}
          </span>
        </div>
        <div className="pv-actions">
          <button className="btn-secondary" onClick={() => setEditing(true)}>Editar</button>
          <button className="btn-danger" onClick={handleDelete}>Deletar</button>
        </div>
      </div>

      {event.notes && <p className="event-notes">{event.notes}</p>}

      {setlist && (
        <div className="event-setlist">
          <span>Repertório: <Link to={`/repertorios/${setlist.id}`}>♪ {setlist.name}</Link></span>
          <button className="btn-primary" onClick={() => onPlaySetlist(setlist.id)}>▶ Tocar repertório</button>
        </div>
      )}

      <section className="vote-section">
        <h3>Você vai?</h3>
        <div className="vote-buttons">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`vote-btn ${s}${mine?.status === s ? ' active' : ''}`}
              onClick={() => vote(s)}
              disabled={voting}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="vote-columns">
          {STATUSES.map((s) => {
            const people = profiles.filter((p) => statusOf(p.id) === s)
            return (
              <div key={s} className={`vote-column ${s}`}>
                <h4>{STATUS_LABEL[s]} <span className="sidebar-count">{people.length}</span></h4>
                {people.map((p) => <div key={p.id} className="vote-person">{p.name}</div>)}
              </div>
            )
          })}
          <div className="vote-column none">
            <h4>Sem resposta <span className="sidebar-count">{pending.length}</span></h4>
            {pending.map((p) => <div key={p.id} className="vote-person">{p.name}</div>)}
          </div>
        </div>
      </section>

      {editing && (
        <EventModal
          event={event}
          playlists={playlists}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); fetchEvent() }}
        />
      )}
    </div>
  )
}
