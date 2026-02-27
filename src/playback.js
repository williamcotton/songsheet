/**
 * Expand a chord into PlaybackChord(s). If the chord has a splitMeasure,
 * each sub-chord becomes a separate PlaybackChord; otherwise a single one.
 */
function expandChord(chord) {
  if (chord.splitMeasure && chord.splitMeasure.length > 0) {
    return chord.splitMeasure.map(sc => {
      const pc = { root: sc.root, type: sc.type }
      if (sc.bass) pc.bass = sc.bass
      if (sc.nashville) pc.nashville = true
      if (sc.diamond) pc.diamond = true
      if (sc.push) pc.push = true
      if (sc.stop) pc.stop = true
      return pc
    })
  }
  const pc = { root: chord.root, type: chord.type }
  if (chord.bass) pc.bass = chord.bass
  if (chord.nashville) pc.nashville = true
  if (chord.diamond) pc.diamond = true
  if (chord.push) pc.push = true
  if (chord.stop) pc.stop = true
  return [pc]
}

/**
 * Build a PlaybackMeasure from an array of expanded PlaybackChords.
 * Divides beats equally among the chords.
 */
function buildMeasure(chords, measureIndex, structureIndex, lineIndex, ts) {
  const beats = ts.beats
  const beatPerChord = chords.length > 0 ? beats / chords.length : beats
  const assignedChords = chords.map((c, i) => ({
    ...c,
    beatStart: i * beatPerChord,
    durationInBeats: beatPerChord,
  }))
  return {
    measureIndex,
    structureIndex,
    lineIndex,
    timeSignature: ts,
    chords: assignedChords,
  }
}

/**
 * Check if barlines on this line actually separate chords (e.g., | G | C | D |)
 * vs. just trailing after all chords (e.g., A C D |).
 * Returns true only when a barline appears between two chords.
 */
function detectInterBarlines(markers) {
  let seenChord = false
  let seenBarAfterChord = false
  for (const m of markers) {
    if (m.type === 'chord') {
      if (seenBarAfterChord) return true
      seenChord = true
    } else if (m.type === 'bar' && seenChord) {
      seenBarAfterChord = true
    }
  }
  return false
}

/**
 * Build the playback timeline from the song's structure array.
 *
 * @param {Array} structure - song.structure entries
 * @param {Object|null} timeSignature - { beats, value } or null (defaults to 4/4)
 * @returns {Array} PlaybackMeasure[]
 */
export function buildPlaybackTimeline(structure, timeSignature) {
  const ts = timeSignature || { beats: 4, value: 4 }
  const measures = []
  let measureIndex = 0

  for (let si = 0; si < structure.length; si++) {
    const entry = structure[si]

    if (entry.lines.length > 0) {
      // Lines with chords and barlines
      for (let li = 0; li < entry.lines.length; li++) {
        const line = entry.lines[li]
        if (line.chords.length === 0 && line.barLines.length === 0) continue

        // Merge chords and barlines into column-sorted markers
        const markers = []
        for (const chord of line.chords) {
          markers.push({ col: chord.column, type: 'chord', chord })
        }
        for (const bar of line.barLines) {
          markers.push({ col: bar.column, type: 'bar' })
        }
        markers.sort((a, b) => a.col - b.col)

        // Detect whether barlines actually separate chords on this line.
        // Pattern: chord...bar...chord means barlines are measure separators.
        // Pattern: chord chord... bar (trailing only) means barlines are phrase markers.
        const hasInterBarlines = detectInterBarlines(markers)

        if (hasInterBarlines) {
          // Group chords by barline boundaries
          let currentChords = []
          for (const m of markers) {
            if (m.type === 'chord') {
              currentChords.push(...expandChord(m.chord))
            } else {
              // Bar line: flush accumulated chords as a measure
              if (currentChords.length > 0) {
                measures.push(buildMeasure(currentChords, measureIndex, si, li, ts))
                measureIndex++
                currentChords = []
              }
              // Leading barline with no preceding chords → discard (visual marker only)
            }
          }
          // Any remaining chords after the last barline form a measure
          if (currentChords.length > 0) {
            measures.push(buildMeasure(currentChords, measureIndex, si, li, ts))
            measureIndex++
          }
        } else {
          // No inter-barlines: each chord is its own measure.
          // Trailing barlines repeat the preceding chord for one additional measure.
          let lastExpanded = null
          for (const m of markers) {
            if (m.type === 'chord') {
              lastExpanded = expandChord(m.chord)
              measures.push(buildMeasure(lastExpanded, measureIndex, si, li, ts))
              measureIndex++
            } else if (m.type === 'bar' && lastExpanded) {
              measures.push(buildMeasure([...lastExpanded], measureIndex, si, li, ts))
              measureIndex++
            }
          }
        }
      }
    } else {
      // Expression-only entries (FILL, INSTRUMENTAL, etc.) — chords only, no lines
      for (const chord of entry.chords) {
        const expanded = expandChord(chord)
        measures.push(buildMeasure(expanded, measureIndex, si, -1, ts))
        measureIndex++
      }
    }
  }

  return measures
}
