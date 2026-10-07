import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useMatch, useNavigate } from 'react-router-dom'
import './App.css'
import logo from './assets/logo.png'
import AddTracksModal from './components/AddTracksModal'
import AgendaView from './components/AgendaView'
import ChordSheet from './components/ChordSheet'
import EventDetail from './components/EventDetail'
import ImportYoutubeModal from './components/ImportYoutubeModal'
import Login from './components/Login'
import ProfileModal from './components/ProfileModal'
import Player from './components/Player'
import PlaylistView from './components/PlaylistView'
import Sidebar from './components/Sidebar'
import TrackList from './components/TrackList'
import UploadModal from './components/UploadModal'
import { supabase } from './lib/supabase'
import type { Playlist, PlaylistTrackWithTrack, Track } from './types'

const MAX_SHIFT = 6
const PITCH_STORAGE_KEY = 'music-drop:pitch'

function loadPitchMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PITCH_STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function App() {
  // undefined = still checking the stored session
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="empty-state">Carregando...</div>
  if (!session) return <Login />
  return <BandApp userId={session.user.id} />
}

function BandApp({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const playlistMatch = useMatch('/repertorios/:id')
  const selectedPlaylistId = playlistMatch?.params.id ?? null

  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [viewedPlaylistTracks, setViewedPlaylistTracks] = useState<PlaylistTrackWithTrack[]>([])
  const [queue, setQueue] = useState<Track[]>([])
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [pitchByTrack, setPitchByTrack] = useState<Record<string, number>>(loadPitchMap)
  const [profileName, setProfileName] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [showYoutube, setShowYoutube] = useState(false)
  const [showAddTracks, setShowAddTracks] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchTracks = useCallback(async () => {
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTracks(data)
    setLoading(false)
  }, [])

  const fetchPlaylists = useCallback(async () => {
    const { data } = await supabase
      .from('playlists')
      .select('*')
      .order('created_at')
    if (data) setPlaylists(data)
  }, [])

  const fetchPlaylistTracks = useCallback(async (playlistId: string) => {
    const { data } = await supabase
      .from('playlist_tracks')
      .select('*, track:tracks(*)')
      .eq('playlist_id', playlistId)
      .order('position')
    const rows = (data ?? []) as unknown as PlaylistTrackWithTrack[]
    return rows
  }, [])

  const refreshViewedPlaylist = useCallback(async () => {
    if (selectedPlaylistId) setViewedPlaylistTracks(await fetchPlaylistTracks(selectedPlaylistId))
  }, [selectedPlaylistId, fetchPlaylistTracks])

  useEffect(() => {
    fetchTracks()
    fetchPlaylists()
    supabase.from('profiles').select('name').eq('id', userId).maybeSingle()
      .then(({ data }) => setProfileName(data?.name ?? ''))
  }, [fetchTracks, fetchPlaylists, userId])

  // YouTube imports finish on the server; refresh the list when their status changes
  useEffect(() => {
    const channel = supabase
      .channel('tracks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracks' }, fetchTracks)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchTracks])

  useEffect(() => {
    if (selectedPlaylistId) refreshViewedPlaylist()
    else setViewedPlaylistTracks([])
  }, [selectedPlaylistId, refreshViewedPlaylist])

  const currentTrack = queue.find((t) => t.id === currentTrackId) ?? null
  const currentIndex = currentTrack ? queue.findIndex((t) => t.id === currentTrackId) : -1
  const audioUrl = currentTrack?.file_path
    ? supabase.storage.from('music').getPublicUrl(currentTrack.file_path).data.publicUrl
    : ''

  const semitonesFor = useCallback((trackId: string) => pitchByTrack[trackId] ?? 0, [pitchByTrack])

  const handleSemitonesChange = useCallback((trackId: string, semitones: number) => {
    const clamped = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, semitones))
    setPitchByTrack((prev) => {
      const next = { ...prev, [trackId]: clamped }
      if (clamped === 0) delete next[trackId]
      try { localStorage.setItem(PITCH_STORAGE_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }, [])

  const handleNext = useCallback(() => {
    if (currentIndex < queue.length - 1) setCurrentTrackId(queue[currentIndex + 1].id)
  }, [currentIndex, queue])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentTrackId(queue[currentIndex - 1].id)
  }, [currentIndex, queue])

  const playable = (list: Track[]) => list.filter((t) => t.status === 'ready' && t.file_path)

  const playFromAllTracks = (trackId: string) => {
    setQueue(playable(tracks))
    setCurrentTrackId(trackId)
  }

  const playFromPlaylist = (trackId: string) => {
    setQueue(playable(viewedPlaylistTracks.map((pt) => pt.track)))
    setCurrentTrackId(trackId)
  }

  const handlePlaySetlist = async (playlistId: string) => {
    const list = playable((await fetchPlaylistTracks(playlistId)).map((pt) => pt.track))
    if (list.length === 0) return
    setQueue(list)
    setCurrentTrackId(list[0].id)
  }

  const handleDeleteTrack = async (track: Track) => {
    if (track.file_path) await supabase.storage.from('music').remove([track.file_path])
    await supabase.from('tracks').delete().eq('id', track.id)
    if (currentTrackId === track.id) { setCurrentTrackId(null); setQueue([]) }
    fetchTracks()
    refreshViewedPlaylist()
  }

  const handleCreatePlaylist = async (name: string) => {
    const { data } = await supabase.from('playlists').insert({ name }).select().single()
    if (data) {
      await fetchPlaylists()
      navigate(`/repertorios/${data.id}`)
    }
  }

  const handleDeletePlaylist = async (playlistId: string) => {
    await supabase.from('playlists').delete().eq('id', playlistId)
    fetchPlaylists()
    if (selectedPlaylistId === playlistId) navigate('/musicas')
  }

  const handleAddTracksToPlaylist = async (trackIds: string[]) => {
    const maxPos =
      viewedPlaylistTracks.length > 0
        ? Math.max(...viewedPlaylistTracks.map((pt) => pt.position))
        : -1
    const rows = trackIds.map((id, i) => ({
      playlist_id: selectedPlaylistId,
      track_id: id,
      position: maxPos + 1 + i,
    }))
    await supabase.from('playlist_tracks').insert(rows)
    refreshViewedPlaylist()
    setShowAddTracks(false)
  }

  const handleRemoveFromPlaylist = async (playlistTrackId: string) => {
    await supabase.from('playlist_tracks').delete().eq('id', playlistTrackId)
    refreshViewedPlaylist()
  }

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= viewedPlaylistTracks.length) return
    const a = viewedPlaylistTracks[index]
    const b = viewedPlaylistTracks[targetIndex]
    await Promise.all([
      supabase.from('playlist_tracks').update({ position: b.position }).eq('id', a.id),
      supabase.from('playlist_tracks').update({ position: a.position }).eq('id', b.id),
    ])
    refreshViewedPlaylist()
  }

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId)

  return (
    <div className="app">
      <header className="header">
        <Link to="/agenda" className="logo"><img src={logo} alt="Página 404" /><span>Ecossistema</span></Link>
        <div className="header-actions">
          <button className="btn-youtube" onClick={() => setShowYoutube(true)}>+ YouTube</button>
          <button className="btn-primary" onClick={() => setShowUpload(true)}>+ Upload</button>
          <button className="header-user" onClick={() => setShowProfile(true)} title="Meu perfil">{profileName || 'Perfil'}</button>
          <button className="header-logout" onClick={() => supabase.auth.signOut()} title="Sair">Sair</button>
        </div>
      </header>

      <div className="content-area">
        <Sidebar
          playlists={playlists}
          trackCount={tracks.length}
          onCreatePlaylist={handleCreatePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
        />

        <main className="main" style={{ paddingBottom: currentTrack ? '110px' : '24px' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/agenda" replace />} />
            <Route
              path="/musicas"
              element={
                loading ? (
                  <div className="empty-state">Carregando...</div>
                ) : tracks.length === 0 ? (
                  <div className="empty-state">
                    <p>Nenhuma música ainda.</p>
                    <div className="header-actions">
                      <button className="btn-secondary" onClick={() => setShowYoutube(true)}>Importar do YouTube</button>
                      <button className="btn-primary" onClick={() => setShowUpload(true)}>Fazer upload</button>
                    </div>
                  </div>
                ) : (
                  <TrackList
                    tracks={tracks}
                    currentTrackId={currentTrackId}
                    onSelect={playFromAllTracks}
                    onDelete={handleDeleteTrack}
                  />
                )
              }
            />
            <Route
              path="/musicas/:id/cifra"
              element={
                loading ? <div className="empty-state">Carregando...</div> : (
                  <ChordSheet
                    tracks={tracks}
                    semitonesFor={semitonesFor}
                    onSemitonesChange={handleSemitonesChange}
                    onSaved={fetchTracks}
                  />
                )
              }
            />
            <Route
              path="/repertorios/:id"
              element={
                selectedPlaylist ? (
                  <PlaylistView
                    playlist={selectedPlaylist}
                    tracks={viewedPlaylistTracks}
                    currentTrackId={currentTrackId}
                    onPlay={playFromPlaylist}
                    onReorder={handleReorder}
                    onRemove={handleRemoveFromPlaylist}
                    onAddTracks={() => setShowAddTracks(true)}
                    onDeletePlaylist={() => handleDeletePlaylist(selectedPlaylist.id)}
                  />
                ) : (
                  <div className="empty-state">Carregando...</div>
                )
              }
            />
            <Route path="/agenda" element={<AgendaView userId={userId} playlists={playlists} />} />
            <Route
              path="/agenda/:id"
              element={<EventDetail userId={userId} playlists={playlists} onPlaySetlist={handlePlaySetlist} />}
            />
            <Route path="*" element={<Navigate to="/agenda" replace />} />
          </Routes>
        </main>
      </div>

      {currentTrack && (
        <Player
          track={currentTrack}
          audioUrl={audioUrl}
          semitones={semitonesFor(currentTrack.id)}
          onSemitonesChange={(s) => handleSemitonesChange(currentTrack.id, s)}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < queue.length - 1}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { fetchTracks(); setShowUpload(false); navigate('/musicas') }}
        />
      )}

      {showYoutube && (
        <ImportYoutubeModal
          onClose={() => setShowYoutube(false)}
          onSuccess={() => { fetchTracks(); setShowYoutube(false); navigate('/musicas') }}
        />
      )}

      {showProfile && (
        <ProfileModal
          userId={userId}
          name={profileName}
          onClose={() => setShowProfile(false)}
          onSaved={(name) => { setProfileName(name); setShowProfile(false) }}
        />
      )}

      {showAddTracks && selectedPlaylistId && (
        <AddTracksModal
          allTracks={tracks}
          existingTrackIds={new Set(viewedPlaylistTracks.map((pt) => pt.track_id))}
          onAdd={handleAddTracksToPlaylist}
          onClose={() => setShowAddTracks(false)}
        />
      )}
    </div>
  )
}

export default App
