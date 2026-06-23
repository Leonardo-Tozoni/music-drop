import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import type { Track, Playlist, PlaylistTrackWithTrack } from './types'
import Sidebar from './components/Sidebar'
import TrackList from './components/TrackList'
import PlaylistView from './components/PlaylistView'
import Player from './components/Player'
import UploadModal from './components/UploadModal'
import AddTracksModal from './components/AddTracksModal'
import './App.css'

function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [viewedPlaylistTracks, setViewedPlaylistTracks] = useState<PlaylistTrackWithTrack[]>([])
  const [queue, setQueue] = useState<Track[]>([])
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showAddTracks, setShowAddTracks] = useState(false)
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
    if (data) setViewedPlaylistTracks(data as unknown as PlaylistTrackWithTrack[])
  }, [])

  useEffect(() => {
    fetchTracks()
    fetchPlaylists()
  }, [fetchTracks, fetchPlaylists])

  useEffect(() => {
    if (selectedPlaylistId) fetchPlaylistTracks(selectedPlaylistId)
    else setViewedPlaylistTracks([])
  }, [selectedPlaylistId, fetchPlaylistTracks])

  const currentTrack = queue.find((t) => t.id === currentTrackId) ?? null
  const currentIndex = currentTrack ? queue.findIndex((t) => t.id === currentTrackId) : -1
  const audioUrl = currentTrack
    ? supabase.storage.from('music').getPublicUrl(currentTrack.file_path).data.publicUrl
    : ''

  const handleNext = useCallback(() => {
    if (currentIndex < queue.length - 1) setCurrentTrackId(queue[currentIndex + 1].id)
  }, [currentIndex, queue])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentTrackId(queue[currentIndex - 1].id)
  }, [currentIndex, queue])

  const playFromAllTracks = (trackId: string) => {
    setQueue(tracks)
    setCurrentTrackId(trackId)
  }

  const playFromPlaylist = (trackId: string) => {
    setQueue(viewedPlaylistTracks.map((pt) => pt.track))
    setCurrentTrackId(trackId)
  }

  const handleDeleteTrack = async (track: Track) => {
    await supabase.storage.from('music').remove([track.file_path])
    await supabase.from('tracks').delete().eq('id', track.id)
    if (currentTrackId === track.id) { setCurrentTrackId(null); setQueue([]) }
    fetchTracks()
    if (selectedPlaylistId) fetchPlaylistTracks(selectedPlaylistId)
  }

  const handleCreatePlaylist = async (name: string) => {
    const { data } = await supabase.from('playlists').insert({ name }).select().single()
    if (data) {
      await fetchPlaylists()
      setSelectedPlaylistId(data.id)
    }
  }

  const handleDeletePlaylist = async (playlistId: string) => {
    await supabase.from('playlists').delete().eq('id', playlistId)
    fetchPlaylists()
    if (selectedPlaylistId === playlistId) setSelectedPlaylistId(null)
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
    fetchPlaylistTracks(selectedPlaylistId!)
    setShowAddTracks(false)
  }

  const handleRemoveFromPlaylist = async (playlistTrackId: string) => {
    await supabase.from('playlist_tracks').delete().eq('id', playlistTrackId)
    fetchPlaylistTracks(selectedPlaylistId!)
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
    fetchPlaylistTracks(selectedPlaylistId!)
  }

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId)

  return (
    <div className="app">
      <header className="header">
        <span className="logo">🎵 Music Drop</span>
        <button className="btn-primary" onClick={() => setShowUpload(true)}>
          + Upload
        </button>
      </header>

      <div className="content-area">
        <Sidebar
          playlists={playlists}
          selectedPlaylistId={selectedPlaylistId}
          trackCount={tracks.length}
          onSelectAll={() => setSelectedPlaylistId(null)}
          onSelectPlaylist={setSelectedPlaylistId}
          onCreatePlaylist={handleCreatePlaylist}
          onDeletePlaylist={handleDeletePlaylist}
        />

        <main className="main" style={{ paddingBottom: currentTrack ? '96px' : '24px' }}>
          {loading ? (
            <div className="empty-state">Carregando...</div>
          ) : selectedPlaylist ? (
            <PlaylistView
              playlist={selectedPlaylist}
              tracks={viewedPlaylistTracks}
              currentTrackId={currentTrackId}
              onPlay={playFromPlaylist}
              onReorder={handleReorder}
              onRemove={handleRemoveFromPlaylist}
              onAddTracks={() => setShowAddTracks(true)}
              onDeletePlaylist={() => handleDeletePlaylist(selectedPlaylistId!)}
            />
          ) : tracks.length === 0 ? (
            <div className="empty-state">
              <p>Nenhuma música ainda.</p>
              <button className="btn-primary" onClick={() => setShowUpload(true)}>
                Fazer primeiro upload
              </button>
            </div>
          ) : (
            <TrackList
              tracks={tracks}
              currentTrackId={currentTrackId}
              onSelect={playFromAllTracks}
              onDelete={handleDeleteTrack}
            />
          )}
        </main>
      </div>

      {currentTrack && (
        <Player
          track={currentTrack}
          audioUrl={audioUrl}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < queue.length - 1}
        />
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { fetchTracks(); setShowUpload(false) }}
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
