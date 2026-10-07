export interface ParsedSong {
  name: string
  band: string
}

/** Lines like "12 - Kickstart My Heart - Mötley Crüe" or "Song - Artist"; the last " - " splits artist off. */
export function parseSongLine(line: string): ParsedSong | null {
  const clean = line.trim().replace(/^\d+\s*[-–.)]\s*/, '')
  const match = /^(.*\S)\s+[-–]\s+(\S.*)$/.exec(clean)
  if (!match) return null
  return { name: match[1].trim(), band: match[2].trim() }
}

export function parseSongList(text: string) {
  const songs: ParsedSong[] = []
  const ignored: string[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const song = parseSongLine(line)
    if (song) songs.push(song)
    else ignored.push(line.trim())
  }
  return { songs, ignored }
}

const normalize = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

export const songKey = (name: string, band: string) => `${normalize(name)}|${normalize(band)}`

/** yt-dlp search the import worker understands: studio recording via a lyric video */
export const lyricSearch = (song: ParsedSong) => `ytsearch:${song.name} ${song.band} lyrics`
