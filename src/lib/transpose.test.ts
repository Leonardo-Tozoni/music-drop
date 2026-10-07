import { describe, expect, it } from 'vitest'
import { isChordLine, transposeChord, transposeKey, transposeSheet } from './transpose'
import { parseSongLine, parseSongList } from './songList'

describe('parseSongLine', () => {
  it('drops numbering and splits on the last dash', () => {
    expect(parseSongLine('12 - Kickstart My Heart - Mötley Crüe')).toEqual({ name: 'Kickstart My Heart', band: 'Mötley Crüe' })
    expect(parseSongLine('You Shook Me All Night Long - AC/DC')).toEqual({ name: 'You Shook Me All Night Long', band: 'AC/DC' })
    expect(parseSongLine("19 - Separate Ways (Worlds Apart) - Journey")).toEqual({ name: 'Separate Ways (Worlds Apart)', band: 'Journey' })
  })

  it('ignores lines without artist', () => {
    expect(parseSongLine('BIS')).toBeNull()
  })

  it('parses a whole setlist', () => {
    const { songs, ignored } = parseSongList('5 - More Than a Feeling - Boston\n\nBIS\n28 - Times Like Theese - Foo Fighters')
    expect(songs).toHaveLength(2)
    expect(ignored).toEqual(['BIS'])
  })
})

describe('transposeChord', () => {
  it('shifts simple chords', () => {
    expect(transposeChord('G', 2)).toBe('A')
    expect(transposeChord('Am', -2)).toBe('Gm')
    expect(transposeChord('B', 1)).toBe('C')
  })

  it('keeps suffix and shifts bass note', () => {
    expect(transposeChord('C#m7/G#', 1)).toBe('Dm7/A')
    expect(transposeChord('Dmaj7(9)', 2)).toBe('Emaj7(9)')
  })

  it('uses flats when asked', () => {
    expect(transposeChord('A', 1, true)).toBe('Bb')
  })
})

describe('transposeKey', () => {
  it('picks conventional spelling', () => {
    expect(transposeKey('C', 3)).toBe('Eb')
    expect(transposeKey('C', 2)).toBe('D')
    expect(transposeKey('Am', 1)).toBe('Bbm')
    expect(transposeKey('Em', 2)).toBe('F#m')
  })
})

describe('isChordLine', () => {
  it('detects chord lines', () => {
    expect(isChordLine('G     D/F#   Em   C')).toBe(true)
    expect(isChordLine('| Am | F | x2')).toBe(true)
  })

  it('ignores lyric lines', () => {
    expect(isChordLine('E o amor que eu sinto')).toBe(false)
    expect(isChordLine('A vida é bela')).toBe(false)
    expect(isChordLine('')).toBe(false)
  })
})

describe('transposeSheet', () => {
  it('transposes chords and leaves lyrics', () => {
    const sheet = 'G       D\nE o amor que eu sinto'
    expect(transposeSheet(sheet, 2, 'G')).toBe('A       E\nE o amor que eu sinto')
  })

  it('keeps chord columns when names grow', () => {
    expect(transposeSheet('C   G', 1)).toBe('C#  G#')
    expect(transposeSheet('C G', 1)).toBe('C# G#')
  })

  it('follows key spelling convention', () => {
    expect(transposeSheet('C   G', 1, 'C')).toBe('Db  Ab')
  })

  it('returns text unchanged at 0 or 12', () => {
    expect(transposeSheet('G D', 0)).toBe('G D')
    expect(transposeSheet('G D', 12)).toBe('G D')
  })
})
