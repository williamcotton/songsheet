/**
 * Expand a chord into PlaybackChord(s). If the chord has a splitMeasure,
 * each sub-chord becomes a separate PlaybackChord; otherwise a single one.
 */
function expandChord(chord, markerIndex) {
  if (chord.splitMeasure && chord.splitMeasure.length > 0) {
    return chord.splitMeasure.map(sc => {
      const pc = { root: sc.root, type: sc.type }
      if (sc.bass) pc.bass = sc.bass
      if (sc.nashville) pc.nashville = true
      if (sc.diamond) pc.diamond = true
      if (sc.push) pc.push = true
      if (sc.stop) pc.stop = true
      if (markerIndex !== undefined) pc.markerIndex = markerIndex
      return pc
    })
  }
  const pc = { root: chord.root, type: chord.type }
  if (chord.bass) pc.bass = chord.bass
  if (chord.nashville) pc.nashville = true
  if (chord.diamond) pc.diamond = true
  if (chord.push) pc.push = true
  if (chord.stop) pc.stop = true
  if (markerIndex !== undefined) pc.markerIndex = markerIndex
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
          markers.push({ col: bar.column, type: 'bar', bar })
        }
        markers.sort((a, b) => a.col - b.col)

        // Strict bracket syntax: only [A B ...] creates multi-chord measures.
        // Barlines never group multiple adjacent chord tokens into one measure;
        // instead they repeat the current/last carried chord for another measure.
        let lastExpanded = null
        for (let mi = 0; mi < markers.length; mi++) {
          const m = markers[mi]
          if (m.type === 'chord') {
            lastExpanded = expandChord(m.chord, mi)
            measures.push(buildMeasure(lastExpanded, measureIndex, si, li, ts))
            measureIndex++
          } else if (m.type === 'bar') {
            // Use parser-provided bar chord context when available.
            // This enables leading bars on a new line (e.g. "| | G |")
            // to repeat the previous line's carried chord.
            let repeatedAtBar = null
            if (m.bar && m.bar.chord) {
              repeatedAtBar = expandChord(m.bar.chord, mi)
            } else if (lastExpanded) {
              repeatedAtBar = lastExpanded.map(c => ({ ...c, markerIndex: mi }))
            }
            if (repeatedAtBar) {
              measures.push(buildMeasure(repeatedAtBar, measureIndex, si, li, ts))
              measureIndex++
              lastExpanded = repeatedAtBar
            }
          }
        }
      }
    } else {
      // Expression-only entries (FILL, INSTRUMENTAL, etc.) — chords only, no lines
      for (let ci = 0; ci < entry.chords.length; ci++) {
        const chord = entry.chords[ci]
        const expanded = expandChord(chord, ci)
        measures.push(buildMeasure(expanded, measureIndex, si, -1, ts))
        measureIndex++
      }
    }
  }

  return measures
}
