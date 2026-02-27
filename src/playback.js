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
 * Detect consecutive barlines (e.g., C || D), which usually indicate
 * repeated held measures rather than explicit bar-delimited grouping.
 */
function hasConsecutiveBars(markers) {
  let prevWasBar = false
  for (const m of markers) {
    if (m.type === 'bar') {
      if (prevWasBar) return true
      prevWasBar = true
    } else {
      prevWasBar = false
    }
  }
  return false
}

/**
 * Decide whether a line should be grouped by explicit barline boundaries.
 *
 * Heuristic:
 * - require at least one barline between chords
 * - require barline density to be at least chord density
 * - reject consecutive barlines (treated as hold repeats)
 *
 * Sparse barlines like "C C/B Am G F | Fsus4 F" stay in chord-per-measure mode.
 */
function shouldGroupByBarlines(markers) {
  const chordCount = markers.filter(m => m.type === 'chord').length
  const barCount = markers.length - chordCount
  if (chordCount === 0 || barCount === 0) return false
  if (!detectInterBarlines(markers)) return false
  if (barCount < chordCount) return false
  if (hasConsecutiveBars(markers)) return false
  return true
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

        if (shouldGroupByBarlines(markers)) {
          // Group chords by barline boundaries
          let currentChords = []
          for (let mi = 0; mi < markers.length; mi++) {
            const m = markers[mi]
            if (m.type === 'chord') {
              currentChords.push(...expandChord(m.chord, mi))
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
