import { scanChordLine, isChordLine, lexExpression, ExprTokenTypes } from './lexer.js'

// ─── Token-to-Chord Helpers ──────────────────────────────────────────

/**
 * Convert a lexer CHORD token into a chord object for the AST.
 * Propagates optional fields: bass, nashville, diamond, push, stop, splitMeasure.
 */
function tokenToChord(token) {
  const chord = { root: token.root, type: token.quality }
  if (token.bass) chord.bass = token.bass
  if (token.nashville) chord.nashville = true
  if (token.diamond) chord.diamond = true
  if (token.push) chord.push = true
  if (token.stop) chord.stop = true
  if (token.splitMeasure) chord.splitMeasure = token.splitMeasure
  return chord
}

/**
 * Like tokenToChord but also preserves column position.
 */
function tokenToPositionedChord(token) {
  const chord = tokenToChord(token)
  chord.column = token.column
  return chord
}

// ─── Expression Parser (recursive descent) ───────────────────────────

/**
 * Grammar:
 *   Expression = Sequence
 *   Sequence   = Item (',' Item)*
 *   Item       = Atom ('*' Number)?
 *   Atom       = SectionRef | ChordList | '(' Sequence ')'
 *
 * Returns an expression AST node.
 */
export function parseExpression(text) {
  const tokens = lexExpression(text)
  let pos = 0

  function peek() { return tokens[pos] }
  function advance() { return tokens[pos++] }
  function expect(type) {
    const t = advance()
    if (t.type !== type) throw new Error(`Expected ${type} but got ${t.type}`)
    return t
  }

  function parseSequence() {
    const items = [parseItem()]
    while (peek().type === ExprTokenTypes.COMMA) {
      advance() // consume comma
      items.push(parseItem())
    }
    return items.length === 1 ? items[0] : { type: 'sequence', items }
  }

  function parseItem() {
    let node = parseAtom()
    if (peek().type === ExprTokenTypes.STAR) {
      advance() // consume *
      const num = expect(ExprTokenTypes.NUMBER)
      node = { type: 'repeat', body: node, count: num.value }
    }
    return node
  }

  function parseAtom() {
    const t = peek()

    if (t.type === ExprTokenTypes.LPAREN) {
      advance() // consume (
      const seq = parseSequence()
      expect(ExprTokenTypes.RPAREN)
      return seq
    }

    if (t.type === ExprTokenTypes.WORD) {
      advance()
      return { type: 'section_ref', name: t.value.toLowerCase() }
    }

    if (t.type === ExprTokenTypes.CHORD) {
      // collect consecutive chords
      const chords = []
      while (peek().type === ExprTokenTypes.CHORD) {
        const c = advance()
        chords.push(tokenToChord(c))
      }
      return { type: 'chord_list', chords }
    }

    throw new Error(`Unexpected token: ${t.type}`)
  }

  const result = parseSequence()
  return result
}

/**
 * Resolve an expression AST into a flat array of chord objects,
 * looking up section references in the sections dict.
 */
export function resolveExpression(expr, sections) {
  if (!expr) return []

  switch (expr.type) {
    case 'section_ref': {
      const section = sections[expr.name]
      return section ? [...section.chords] : []
    }
    case 'chord_list':
      return [...expr.chords]
    case 'sequence':
      return expr.items.flatMap(item => resolveExpression(item, sections))
    case 'repeat': {
      const body = resolveExpression(expr.body, sections)
      const result = []
      for (let i = 0; i < expr.count; i++) result.push(...body)
      return result
    }
    default:
      return []
  }
}

/**
 * Resolve an expression AST into a single compact line preserving
 * chord and bar line structure from section references.
 * Multi-line sections are flattened: "D | G | A C D |" on one row.
 * Returns [] for chord_list expressions (no line structure to inherit).
 */
export function resolveExpressionLines(expr, sections) {
  if (!expr) return []
  const markers = collectExprMarkers(expr, sections)
  if (markers.length === 0) return []
  return [compactMarkersToLine(markers)]
}

function collectExprMarkers(expr, sections) {
  switch (expr.type) {
    case 'section_ref': {
      const section = sections[expr.name]
      if (!section) return []
      const result = []
      for (const line of section.lines) {
        const lineMarkers = []
        for (const chord of line.chords) {
          const marker = { col: chord.column, type: 'chord', root: chord.root, quality: chord.type }
          if (chord.bass) marker.bass = chord.bass
          if (chord.nashville) marker.nashville = true
          if (chord.diamond) marker.diamond = true
          if (chord.push) marker.push = true
          if (chord.stop) marker.stop = true
          if (chord.splitMeasure) marker.splitMeasure = chord.splitMeasure
          lineMarkers.push(marker)
        }
        for (const col of line.barLines) {
          lineMarkers.push({ col, type: 'bar' })
        }
        lineMarkers.sort((a, b) => a.col - b.col)
        result.push(...lineMarkers)
      }
      return result
    }
    case 'chord_list':
      return []
    case 'sequence':
      return expr.items.flatMap(item => collectExprMarkers(item, sections))
    case 'repeat': {
      const body = collectExprMarkers(expr.body, sections)
      const result = []
      for (let i = 0; i < expr.count; i++) result.push(...body)
      return result
    }
    default:
      return []
  }
}

function compactMarkersToLine(markers) {
  const chords = []
  const barLines = []
  let col = 0
  for (const m of markers) {
    if (col > 0) col += 1
    if (m.type === 'chord') {
      const name = m.root + m.quality + (m.bass ? '/' + m.bass : '')
      const chord = { root: m.root, type: m.quality, column: col }
      if (m.bass) chord.bass = m.bass
      if (m.nashville) chord.nashville = true
      if (m.diamond) chord.diamond = true
      if (m.push) chord.push = true
      if (m.stop) chord.stop = true
      if (m.splitMeasure) chord.splitMeasure = m.splitMeasure
      chords.push(chord)
      col += name.length
    } else {
      barLines.push(col)
      col += 1
    }
  }
  return { chords, barLines, lyrics: '', characters: [] }
}

// ─── Chord-Lyric Parsing ─────────────────────────────────────────────

/**
 * Build character alignment array for a single lyric line paired with chord tokens.
 */
function buildCharacterAlignment(chordTokens, lyricLine) {
  if (!lyricLine) return []

  // Build a map of column → chord/barLine
  const chordMap = new Map()
  const barLineSet = new Set()
  if (chordTokens) {
    for (const token of chordTokens) {
      if (token.type === 'CHORD') {
        chordMap.set(token.column, tokenToChord(token))
      } else if (token.type === 'BAR_LINE') {
        barLineSet.add(token.column)
      }
    }
  }

  const characters = []
  for (let i = 0; i < lyricLine.length; i++) {
    const entry = { character: lyricLine[i] }
    if (chordMap.has(i)) {
      entry.chord = chordMap.get(i)
    }
    if (barLineSet.has(i)) {
      entry.barLine = true
    }
    characters.push(entry)
  }
  return characters
}

/**
 * Parse a block of interleaved chord/lyric lines into structured line objects.
 * Returns { lines, chords, lyrics }.
 */
function parseChordLyricBlock(text) {
  const rawLines = text.split('\n')
  const lines = []
  const allChords = []
  const allLyrics = []
  let i = 0

  while (i < rawLines.length) {
    const line = rawLines[i]
    const tokens = scanChordLine(line)

    if (tokens) {
      // This is a chord line — next non-chord line is its paired lyric
      const chordTokens = tokens
      const chords = tokens.filter(t => t.type === 'CHORD').map(t => tokenToPositionedChord(t))
      const barLines = tokens.filter(t => t.type === 'BAR_LINE').map(t => t.column)

      i++
      // Find the paired lyric line (next line that isn't a chord line)
      let lyricLine = ''
      if (i < rawLines.length && !isChordLine(rawLines[i])) {
        lyricLine = rawLines[i]
        i++
      }

      allChords.push(...chords.map(c => {
        const ch = { root: c.root, type: c.type }
        if (c.bass) ch.bass = c.bass
        if (c.nashville) ch.nashville = true
        if (c.diamond) ch.diamond = true
        if (c.push) ch.push = true
        if (c.stop) ch.stop = true
        if (c.splitMeasure) ch.splitMeasure = c.splitMeasure
        return ch
      }))
      if (lyricLine) allLyrics.push(lyricLine)

      lines.push({
        chords,
        barLines,
        lyrics: lyricLine,
        characters: buildCharacterAlignment(chordTokens, lyricLine),
      })
    } else {
      // Lyric-only line (no chord line above it)
      if (line.trim().length > 0) {
        allLyrics.push(line)
        lines.push({
          chords: [],
          barLines: [],
          lyrics: line,
          characters: line.split('').map(ch => ({ character: ch })),
        })
      }
      i++
    }
  }

  return { lines, chords: allChords, lyrics: allLyrics }
}

// ─── Block Classification ────────────────────────────────────────────

const isCaps = str => str.toUpperCase() === str && /[A-Z]/.test(str)

function classifyBlock(text, index, sections) {
  const trimmed = text.trim()
  const lines = trimmed.split('\n')

  // First block is always title
  if (index === 0) return { type: 'title', text: trimmed }

  // LABEL: with body (e.g., "PRECHORUS:\nD\n Lyrics...")
  const labelBodyMatch = trimmed.match(/^([A-Z][A-Z0-9 ]*):[\s]*\n([\s\S]+)$/m)
  if (labelBodyMatch) {
    return { type: 'section_label', label: labelBodyMatch[1].toLowerCase(), body: labelBodyMatch[2] }
  }

  // Directive with expression: "INSTRUMENTAL: (VERSE, CHORUS*2)"
  const directiveMatch = trimmed.match(/^([A-Z][A-Z0-9 ]*):\s*(.+)$/)
  if (directiveMatch) {
    return { type: 'directive', label: directiveMatch[1].toLowerCase(), expression: directiveMatch[2] }
  }

  // Single-line all-caps with multiplier: "CHORUS*2"
  const repeatMatch = trimmed.match(/^([A-Z][A-Z0-9 ]*)\*(\d+)$/)
  if (repeatMatch) {
    return { type: 'section_ref_repeat', name: repeatMatch[1].toLowerCase(), count: parseInt(repeatMatch[2], 10) }
  }

  // Single-line all-caps reference: "CHORUS", "BRIDGE", "FILL"
  if (lines.length === 1 && isCaps(trimmed) && /^[A-Z][A-Z0-9 ]*$/.test(trimmed)) {
    return { type: 'section_ref', name: trimmed.toLowerCase() }
  }

  // Check if any line is a chord line — use original text lines to preserve columns
  const origLines = text.split('\n')
  const hasChords = origLines.some(l => isChordLine(l))
  const hasLyrics = origLines.some(l => !isChordLine(l) && l.trim().length > 0)

  if (hasChords && hasLyrics) {
    return { type: 'chord_lyric', text }
  }
  if (hasChords && !hasLyrics) {
    return { type: 'chord_only', text }
  }
  if (hasLyrics) {
    return { type: 'lyric_only', text }
  }

  return { type: 'unknown', text: trimmed }
}

// ─── Main parse() ────────────────────────────────────────────────────

export function parse(rawSongsheet) {
  const normalized = rawSongsheet.replace(/\r\n/g, '\n')
  // Split on double newlines (one or more blank lines)
  const rawBlocks = normalized.replace(/^\s*\n/gm, '\n').split('\n\n')

  const sections = {}
  const structure = []
  let title = ''
  let author = ''
  let bpm = null
  let timeSignature = null
  let key = null

  for (let blockIndex = 0; blockIndex < rawBlocks.length; blockIndex++) {
    const rawBlock = rawBlocks[blockIndex]
    if (!rawBlock.trim()) continue

    const block = classifyBlock(rawBlock, blockIndex, sections)

    switch (block.type) {
      case 'title': {
        let text = block.text
        const metaMatch = text.match(/\(([^)]*(?:\d+\s*bpm|\d+\/\d+\s*time|[A-G][b#]?\s*key)[^)]*)\)/i)
        if (metaMatch) {
          const metaStr = metaMatch[1]
          const bpmInner = metaStr.match(/(\d+)\s*bpm/i)
          if (bpmInner) {
            bpm = parseInt(bpmInner[1], 10)
          }
          const timeMatch = metaStr.match(/(\d+)\/(\d+)\s*time/i)
          if (timeMatch) {
            timeSignature = { beats: parseInt(timeMatch[1], 10), value: parseInt(timeMatch[2], 10) }
          }
          const keyMatch = metaStr.match(/([A-G][b#]?)\s*key/i)
          if (keyMatch) {
            key = keyMatch[1]
          }
          text = text.replace(metaMatch[0], '').trim()
        }
        const parts = text.split(' - ')
        title = parts[0] || ''
        author = parts[1] || ''
        break
      }

      case 'chord_lyric':
      case 'chord_only': {
        const parsed = parseChordLyricBlock(block.text)
        const sectionType = inferSectionType(sections, parsed.lyrics, parsed.chords)
        addSection(sections, sectionType, parsed)
        structure.push(buildStructureEntry(sections, sectionType, parsed))
        break
      }

      case 'lyric_only': {
        const sectionType = inferSectionType(sections, block.text.split('\n').filter(l => l.trim()), [])
        const verse = sections.verse
        // Inherit chord pattern from first verse definition
        let parsed
        if (verse) {
          parsed = buildInheritedLyricBlock(block.text, verse)
        } else {
          const lyrics = block.text.split('\n').filter(l => l.trim())
          parsed = { lines: lyrics.map(l => ({ chords: [], barLines: [], lyrics: l, characters: l.split('').map(ch => ({ character: ch })) })), chords: [], lyrics }
        }
        addSection(sections, sectionType, parsed)
        structure.push(buildStructureEntry(sections, sectionType, parsed))
        break
      }

      case 'section_label': {
        const parsed = parseChordLyricBlock(block.body)
        addSection(sections, block.label, parsed)
        structure.push(buildStructureEntry(sections, block.label, parsed))
        break
      }

      case 'directive': {
        const expr = parseExpression(block.expression)
        const resolvedChords = resolveExpression(expr, sections)
        const resolvedLines = resolveExpressionLines(expr, sections)
        const parsed = { lines: resolvedLines, chords: resolvedChords, lyrics: [] }
        addSection(sections, block.label, parsed)
        const entry = buildStructureEntry(sections, block.label, parsed)
        entry.expression = expr
        structure.push(entry)
        break
      }

      case 'section_ref': {
        const section = sections[block.name]
        const parsed = section
          ? { lines: [...section.lines], chords: [...section.chords], lyrics: [...section.lyrics] }
          : { lines: [], chords: [], lyrics: [] }
        addSection(sections, block.name, parsed, true)
        structure.push(buildStructureEntry(sections, block.name, parsed))
        break
      }

      case 'section_ref_repeat': {
        for (let r = 0; r < block.count; r++) {
          const section = sections[block.name]
          const parsed = section
            ? { lines: [...section.lines], chords: [...section.chords], lyrics: [...section.lyrics] }
            : { lines: [], chords: [], lyrics: [] }
          addSection(sections, block.name, parsed, true)
          structure.push(buildStructureEntry(sections, block.name, parsed))
        }
        break
      }
    }
  }

  return { title, author, bpm, timeSignature, key, sections, structure }
}

function inferSectionType(sections, lyrics, chords) {
  const hasLyrics = lyrics && lyrics.length > 0
  const hasChords = chords && chords.length > 0

  if (!sections.verse) {
    if (hasLyrics && hasChords) return 'verse'
  }

  if (sections.verse && sections.verse.count === 1 && hasLyrics && hasChords && !sections.chorus) {
    return 'chorus'
  }

  if (sections.verse && sections.verse.count >= 1 && hasLyrics && hasChords && sections.chorus && !sections.bridge) {
    return 'bridge'
  }

  if (sections.verse && sections.verse.count >= 1 && hasLyrics && !hasChords && sections.chorus) {
    return 'verse'
  }

  // fallback: verse for lyric content, or verse for anything else
  if (hasLyrics && !hasChords) return 'verse'
  if (hasChords) return 'verse'

  return 'verse'
}

function addSection(sections, sectionType, parsed, refOnly = false) {
  if (!sections[sectionType]) {
    sections[sectionType] = {
      count: 0,
      chords: parsed.chords,
      lyrics: parsed.lyrics,
      lines: parsed.lines,
    }
  }
  sections[sectionType].count++
}

function buildStructureEntry(sections, sectionType, parsed) {
  const section = sections[sectionType]
  return {
    sectionType,
    sectionIndex: section.count - 1,
    chords: parsed.chords,
    lyrics: parsed.lyrics,
    lines: parsed.lines,
    expression: null,
  }
}

/**
 * Build a lyric-only block that inherits the chord pattern from the given verse section.
 */
function buildInheritedLyricBlock(text, verseSection) {
  const rawLines = text.split('\n').filter(l => l.trim())
  const lines = []
  const allLyrics = []

  for (let i = 0; i < rawLines.length; i++) {
    const lyricLine = rawLines[i]
    allLyrics.push(lyricLine)

    // Try to inherit chord info from the matching verse line
    const verseLine = verseSection.lines[i]
    if (verseLine) {
      const characters = buildCharacterAlignment(
        verseLine.chords.map(c => ({ type: 'CHORD', column: c.column, root: c.root, quality: c.type })),
        lyricLine
      )
      lines.push({
        chords: verseLine.chords,
        barLines: verseLine.barLines,
        lyrics: lyricLine,
        characters,
      })
    } else {
      lines.push({
        chords: [],
        barLines: [],
        lyrics: lyricLine,
        characters: lyricLine.split('').map(ch => ({ character: ch })),
      })
    }
  }

  return { lines, chords: verseSection.chords, lyrics: allLyrics }
}
