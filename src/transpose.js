const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const NOTE_TO_SEMITONE = {}
for (let i = 0; i < SHARP_NOTES.length; i++) {
  NOTE_TO_SEMITONE[SHARP_NOTES[i]] = i
  NOTE_TO_SEMITONE[FLAT_NOTES[i]] = i
}

export function noteToSemitone(root) {
  const val = NOTE_TO_SEMITONE[root]
  if (val === undefined) throw new Error(`Unknown note: ${root}`)
  return val
}

export function semitoneToNote(semitone, preferFlats) {
  const normalized = ((semitone % 12) + 12) % 12
  return preferFlats ? FLAT_NOTES[normalized] : SHARP_NOTES[normalized]
}

export function transposeChord(chord, semitones, preferFlats) {
  const semitone = noteToSemitone(chord.root)
  const newRoot = semitoneToNote(semitone + semitones, preferFlats)
  const result = { root: newRoot, type: chord.type }
  if (chord.bass) {
    const bassSemitone = noteToSemitone(chord.bass)
    result.bass = semitoneToNote(bassSemitone + semitones, preferFlats)
  }
  return result
}

/**
 * Detect whether the song uses flats (Bb, Eb, etc.) in its chords.
 */
function detectPreferFlats(song) {
  for (const key in song.sections) {
    for (const chord of song.sections[key].chords) {
      if (chord.root && chord.root.length === 2 && chord.root[1] === 'b') return true
    }
  }
  return false
}

function transposeChordObj(chord, semitones, preferFlats) {
  if (!chord || !chord.root) return chord
  return transposeChord(chord, semitones, preferFlats)
}

function transposeLines(lines, semitones, preferFlats) {
  return lines.map(line => ({
    ...line,
    chords: line.chords.map(c => ({ ...transposeChordObj(c, semitones, preferFlats), column: c.column })),
    characters: line.characters.map(ch => {
      if (ch.chord) {
        return { ...ch, chord: transposeChordObj(ch.chord, semitones, preferFlats) }
      }
      return ch
    }),
  }))
}

/**
 * Transpose an expression AST node.
 */
function transposeExpressionNode(node, semitones, preferFlats) {
  if (!node) return node
  switch (node.type) {
    case 'chord_list':
      return { ...node, chords: node.chords.map(c => transposeChordObj(c, semitones, preferFlats)) }
    case 'sequence':
      return { ...node, items: node.items.map(item => transposeExpressionNode(item, semitones, preferFlats)) }
    case 'repeat':
      return { ...node, body: transposeExpressionNode(node.body, semitones, preferFlats) }
    default:
      return node
  }
}

/**
 * Transpose all chords in a parsed song by the given number of semitones.
 * Returns a new song object (does not mutate the input).
 */
export function transpose(song, semitones, options = {}) {
  const preferFlats = options.preferFlats !== undefined
    ? options.preferFlats
    : detectPreferFlats(song)

  // Transpose sections
  const newSections = {}
  for (const key in song.sections) {
    const section = song.sections[key]
    newSections[key] = {
      ...section,
      chords: section.chords.map(c => transposeChordObj(c, semitones, preferFlats)),
      lines: transposeLines(section.lines, semitones, preferFlats),
    }
  }

  // Transpose structure
  const newStructure = song.structure.map(entry => ({
    ...entry,
    chords: entry.chords.map(c => transposeChordObj(c, semitones, preferFlats)),
    lines: transposeLines(entry.lines, semitones, preferFlats),
    expression: transposeExpressionNode(entry.expression, semitones, preferFlats),
  }))

  return {
    ...song,
    sections: newSections,
    structure: newStructure,
  }
}
