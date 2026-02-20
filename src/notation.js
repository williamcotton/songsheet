import { noteToSemitone, semitoneToNote } from './transpose.js'

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11] // semitones for scale degrees 1-7
const NNS_DIGITS = ['1', '2', '3', '4', '5', '6', '7']

/**
 * Convert a chord's root to a Nashville number relative to the given key.
 * Returns { root, prefixAccidental } where root is '1'-'7' and prefixAccidental
 * is '' (exact match), 'b' (flat of a scale degree), or '#' (sharp of a scale degree).
 */
function rootToNashville(root, keySemitone) {
  const chordSemitone = noteToSemitone(root)
  const interval = ((chordSemitone - keySemitone) + 12) % 12

  // Exact scale degree match
  const exactIdx = MAJOR_SCALE.indexOf(interval)
  if (exactIdx !== -1) {
    return { root: NNS_DIGITS[exactIdx], prefixAccidental: '' }
  }

  // Flat of the next scale degree
  const sharpIdx = MAJOR_SCALE.indexOf((interval + 1) % 12)
  if (sharpIdx !== -1) {
    return { root: NNS_DIGITS[sharpIdx], prefixAccidental: 'b' }
  }

  // Sharp of the previous scale degree
  const flatIdx = MAJOR_SCALE.indexOf((interval + 11) % 12)
  if (flatIdx !== -1) {
    return { root: NNS_DIGITS[flatIdx], prefixAccidental: '#' }
  }

  // Shouldn't reach here, but fallback
  return { root: root, prefixAccidental: '' }
}

/**
 * Convert a Nashville number root back to a letter note.
 */
function nashvilleToRoot(root, keySemitone, prefixAccidental, preferFlats) {
  const digit = parseInt(root, 10)
  if (digit < 1 || digit > 7) return root

  let semitone = (MAJOR_SCALE[digit - 1] + keySemitone) % 12
  if (prefixAccidental === 'b') semitone = (semitone + 11) % 12
  else if (prefixAccidental === '#') semitone = (semitone + 1) % 12

  return semitoneToNote(semitone, preferFlats)
}

function convertChord(chord, keySemitone, toNNS, preferFlats) {
  if (!chord || !chord.root) return chord

  if (toNNS) {
    // Already nashville — leave as-is
    if (chord.nashville) return chord

    const { root: nnsRoot, prefixAccidental } = rootToNashville(chord.root, keySemitone)
    const result = { ...chord, root: nnsRoot, nashville: true }
    if (prefixAccidental) {
      result.type = prefixAccidental + chord.type
    }
    // Convert bass note too
    if (chord.bass) {
      const { root: nnsBass, prefixAccidental: bassAcc } = rootToNashville(chord.bass, keySemitone)
      result.bass = (bassAcc || '') + nnsBass
    }
    if (chord.splitMeasure) {
      result.splitMeasure = chord.splitMeasure.map(c => convertChord(c, keySemitone, true, preferFlats))
    }
    return result
  } else {
    // To standard — only convert nashville chords
    if (!chord.nashville) return chord

    // Extract prefix accidental from type if present
    let prefixAccidental = ''
    let type = chord.type
    if (type.startsWith('b') || type.startsWith('#')) {
      prefixAccidental = type[0]
      type = type.slice(1)
    }

    const newRoot = nashvilleToRoot(chord.root, keySemitone, prefixAccidental, preferFlats)
    const result = { ...chord, root: newRoot, type }
    delete result.nashville

    if (chord.bass) {
      // Bass could have prefix accidental too (e.g., 'b3')
      let bassPre = ''
      let bassDigit = chord.bass
      if (bassDigit.startsWith('b') || bassDigit.startsWith('#')) {
        bassPre = bassDigit[0]
        bassDigit = bassDigit.slice(1)
      }
      const digit = parseInt(bassDigit, 10)
      if (digit >= 1 && digit <= 7) {
        result.bass = nashvilleToRoot(bassDigit, keySemitone, bassPre, preferFlats)
      }
    }

    if (chord.splitMeasure) {
      result.splitMeasure = chord.splitMeasure.map(c => convertChord(c, keySemitone, false, preferFlats))
    }

    return result
  }
}

function convertLines(lines, keySemitone, toNNS, preferFlats) {
  return lines.map(line => ({
    ...line,
    chords: line.chords.map(c => ({
      ...convertChord(c, keySemitone, toNNS, preferFlats),
      column: c.column,
    })),
    characters: line.characters.map(ch => {
      if (ch.chord) {
        return { ...ch, chord: convertChord(ch.chord, keySemitone, toNNS, preferFlats) }
      }
      return ch
    }),
  }))
}

function convertExpressionNode(node, keySemitone, toNNS, preferFlats) {
  if (!node) return node
  switch (node.type) {
    case 'chord_list':
      return { ...node, chords: node.chords.map(c => convertChord(c, keySemitone, toNNS, preferFlats)) }
    case 'sequence':
      return { ...node, items: node.items.map(item => convertExpressionNode(item, keySemitone, toNNS, preferFlats)) }
    case 'repeat':
      return { ...node, body: convertExpressionNode(node.body, keySemitone, toNNS, preferFlats) }
    default:
      return node
  }
}

function detectPreferFlats(song) {
  for (const key in song.sections) {
    for (const chord of song.sections[key].chords) {
      if (chord.root && chord.root.length === 2 && chord.root[1] === 'b') return true
    }
  }
  return false
}

function convertSong(song, key, toNNS) {
  const keySemitone = noteToSemitone(key)
  const preferFlats = detectPreferFlats(song)

  const newSections = {}
  for (const sKey in song.sections) {
    const section = song.sections[sKey]
    newSections[sKey] = {
      ...section,
      chords: section.chords.map(c => convertChord(c, keySemitone, toNNS, preferFlats)),
      lines: convertLines(section.lines, keySemitone, toNNS, preferFlats),
    }
  }

  const newStructure = song.structure.map(entry => ({
    ...entry,
    chords: entry.chords.map(c => convertChord(c, keySemitone, toNNS, preferFlats)),
    lines: convertLines(entry.lines, keySemitone, toNNS, preferFlats),
    expression: convertExpressionNode(entry.expression, keySemitone, toNNS, preferFlats),
  }))

  return {
    ...song,
    sections: newSections,
    structure: newStructure,
  }
}

/**
 * Convert a song with letter-root chords to Nashville Number System notation.
 */
export function toNashville(song, key) {
  return convertSong(song, key, true)
}

/**
 * Convert a song with Nashville Number System chords back to standard letter roots.
 */
export function toStandard(song, key) {
  return convertSong(song, key, false)
}
