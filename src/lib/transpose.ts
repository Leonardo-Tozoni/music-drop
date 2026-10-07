const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NOTE_INDEX: Record<string, number> = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4,
  'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11,
}

// Major keys written with flats; minor keys with flats are listed by their root
const FLAT_MAJOR = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'])
const FLAT_MINOR = new Set(['D', 'G', 'C', 'F', 'Bb', 'Eb'])

const CHORD_RE = /^([A-G][#b]?)((?:maj|min|dim|aug|sus|add|m|M|º|°|\+|-|\d|\(|\)|#|b)*)(?:\/([A-G][#b]?))?$/
const NON_CHORD_TOKEN_RE = /^(\||\|\||%|x\d+|\(?x\d+\)?)$/i

function shiftNote(note: string, semitones: number, preferFlats: boolean) {
  const idx = NOTE_INDEX[note]
  if (idx === undefined) return note
  const next = (((idx + semitones) % 12) + 12) % 12
  return (preferFlats ? FLATS : SHARPS)[next]
}

export function isChord(token: string) {
  return CHORD_RE.test(token)
}

export function transposeChord(chord: string, semitones: number, preferFlats = false) {
  const m = CHORD_RE.exec(chord)
  if (!m) return chord
  const [, root, suffix, bass] = m
  const newRoot = shiftNote(root, semitones, preferFlats)
  return bass ? `${newRoot}${suffix}/${shiftNote(bass, semitones, preferFlats)}` : `${newRoot}${suffix}`
}

function keyPrefersFlats(key: string) {
  const m = CHORD_RE.exec(key.trim())
  if (!m) return false
  const [, root, suffix] = m
  const minor = /^m(?!aj)/.test(suffix)
  return minor ? FLAT_MINOR.has(root) : FLAT_MAJOR.has(root)
}

export function transposeKey(key: string, semitones: number) {
  const trimmed = key.trim()
  if (!isChord(trimmed)) return key
  // Try sharps first; switch to flats if the resulting key is conventionally written with flats
  const sharp = transposeChord(trimmed, semitones, false)
  const flat = transposeChord(trimmed, semitones, true)
  return keyPrefersFlats(flat) ? flat : sharp
}

export function isChordLine(line: string) {
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  let chords = 0
  for (const t of tokens) {
    if (isChord(t)) chords++
    else if (!NON_CHORD_TOKEN_RE.test(t)) return false
  }
  return chords > 0
}

function transposeLine(line: string, semitones: number, preferFlats: boolean) {
  // Keep each chord in its original column so it stays above the right syllable
  let out = ''
  for (const match of line.matchAll(/\S+/g)) {
    const col = match.index
    if (out.length < col) out += ' '.repeat(col - out.length)
    else if (out.length > 0) out += ' '
    out += isChord(match[0]) ? transposeChord(match[0], semitones, preferFlats) : match[0]
  }
  return out
}

/**
 * Transposes every chord line in a chord sheet. Lyric lines are left untouched.
 * `originalKey` decides sharps vs flats; without it, flats are used only if the sheet already uses them.
 */
export function transposeSheet(text: string, semitones: number, originalKey?: string) {
  if (semitones % 12 === 0) return text
  const lines = text.split(/\r?\n/)
  const preferFlats = originalKey && isChord(originalKey.trim())
    ? keyPrefersFlats(transposeKey(originalKey, semitones))
    : lines.some((l) => isChordLine(l) && /\b[A-G]b/.test(l))
  return lines
    .map((l) => (isChordLine(l) ? transposeLine(l, semitones, preferFlats) : l))
    .join('\n')
}

export function formatSemitones(semitones: number) {
  return semitones > 0 ? `+${semitones}` : String(semitones)
}
