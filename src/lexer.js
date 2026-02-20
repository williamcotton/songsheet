const ROOTS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
const NNS_ROOTS = new Set(['1', '2', '3', '4', '5', '6', '7'])
const ACCIDENTALS = new Set(['#', 'b'])
const QUALITY_CHARS = /[a-z0-9#+]/i

/**
 * Try to parse a chord starting at position i in line.
 * Accepts both letter roots (A-G) and NNS roots (1-7).
 * Returns { token, end } or null.
 */
function parseChordAt(line, i, stopChars) {
  const ch = line[i]
  const isNNS = NNS_ROOTS.has(ch)
  const isLetter = ROOTS.has(ch)
  if (!isNNS && !isLetter) return null

  let root = ch
  let j = i + 1

  // accidental (only for letter roots)
  if (!isNNS && j < line.length && ACCIDENTALS.has(line[j])) {
    root += line[j]
    j++
  }

  // quality: consume word chars that are valid in chord names
  let quality = ''
  while (j < line.length && QUALITY_CHARS.test(line[j]) && line[j] !== ' ' && line[j] !== '|') {
    if (stopChars && stopChars.has(line[j])) break
    quality += line[j]
    j++
  }

  // slash chord: /Bass
  let bass = ''
  if (j < line.length && line[j] === '/') {
    j++ // consume /
    if (j < line.length && (ROOTS.has(line[j]) || NNS_ROOTS.has(line[j]))) {
      const bassIsNNS = NNS_ROOTS.has(line[j])
      bass = line[j]
      j++
      if (!bassIsNNS && j < line.length && ACCIDENTALS.has(line[j])) {
        bass += line[j]
        j++
      }
    } else {
      return null // / not followed by a valid note
    }
  }

  const token = { type: 'CHORD', column: i, root, quality }
  if (bass) token.bass = bass
  if (isNNS) token.nashville = true
  return { token, end: j }
}

const DECORATOR_STOP_CHARS = new Set(['>', ']', '!'])

/**
 * Scan a line left-to-right and return an array of chord/bar-line tokens,
 * or null if the line is not a valid chord line.
 *
 * A chord line must contain at least one chord, and every non-whitespace
 * token must parse as a valid chord, decorator, or `|`.
 */
export function scanChordLine(line) {
  if (!line || line.trim().length === 0) return null

  const tokens = []
  let i = 0

  while (i < line.length) {
    // skip whitespace
    if (line[i] === ' ' || line[i] === '\t') {
      i++
      continue
    }

    const column = i

    // bar line
    if (line[i] === '|') {
      tokens.push({ type: 'BAR_LINE', column })
      i++
      continue
    }

    // diamond: <chord>
    if (line[i] === '<') {
      i++ // consume <
      const result = parseChordAt(line, i, DECORATOR_STOP_CHARS)
      if (!result) return null
      if (result.end >= line.length || line[result.end] !== '>') return null
      i = result.end + 1 // consume >
      const token = { ...result.token, column, diamond: true }
      // next char must be whitespace, end-of-line, |, or !
      if (i < line.length && line[i] === '!') {
        token.stop = true
        i++
      }
      if (i < line.length && line[i] !== ' ' && line[i] !== '\t' && line[i] !== '|') {
        return null
      }
      tokens.push(token)
      continue
    }

    // push: ^chord
    if (line[i] === '^') {
      i++ // consume ^
      const result = parseChordAt(line, i, DECORATOR_STOP_CHARS)
      if (!result) return null
      i = result.end
      const token = { ...result.token, column, push: true }
      if (i < line.length && line[i] === '!') {
        token.stop = true
        i++
      }
      if (i < line.length && line[i] !== ' ' && line[i] !== '\t' && line[i] !== '|') {
        return null
      }
      tokens.push(token)
      continue
    }

    // split measure: [chord chord ...]
    if (line[i] === '[') {
      i++ // consume [
      const chords = []
      while (i < line.length && line[i] !== ']') {
        if (line[i] === ' ' || line[i] === '\t') { i++; continue }
        const result = parseChordAt(line, i, DECORATOR_STOP_CHARS)
        if (!result) return null
        chords.push(result.token)
        i = result.end
      }
      if (i >= line.length || line[i] !== ']') return null
      i++ // consume ]
      if (chords.length < 2) return null
      // next char must be whitespace, end-of-line, or |
      if (i < line.length && line[i] !== ' ' && line[i] !== '\t' && line[i] !== '|') {
        return null
      }
      // Use the first chord as the main token, attach all chords as splitMeasure
      const first = chords[0]
      const token = {
        type: 'CHORD',
        column,
        root: first.root,
        quality: first.quality,
        splitMeasure: chords.map(c => {
          const sc = { root: c.root, type: c.quality }
          if (c.bass) sc.bass = c.bass
          if (c.nashville) sc.nashville = true
          return sc
        }),
      }
      if (first.bass) token.bass = first.bass
      if (first.nashville) token.nashville = true
      tokens.push(token)
      continue
    }

    // try to parse a chord: letter root or NNS root
    if (ROOTS.has(line[i]) || NNS_ROOTS.has(line[i])) {
      const result = parseChordAt(line, i, DECORATOR_STOP_CHARS)
      if (!result) return null
      i = result.end

      // check for stop suffix
      if (i < line.length && line[i] === '!') {
        result.token.stop = true
        i++
      }

      // next char must be whitespace, end-of-line, or |
      if (i < line.length && line[i] !== ' ' && line[i] !== '\t' && line[i] !== '|') {
        return null // not a chord line
      }

      tokens.push(result.token)
      continue
    }

    // any other non-whitespace char means this isn't a chord line
    return null
  }

  // must have at least one chord
  if (!tokens.some(t => t.type === 'CHORD')) return null

  return tokens
}

/**
 * Boolean wrapper around scanChordLine.
 */
export function isChordLine(line) {
  return scanChordLine(line) !== null
}

// Expression token types
const ExprTokenTypes = {
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  COMMA: 'COMMA',
  STAR: 'STAR',
  NUMBER: 'NUMBER',
  WORD: 'WORD',
  CHORD: 'CHORD',
  EOF: 'EOF',
}

/**
 * Tokenize an expression string like "(VERSE, CHORUS*2)" or "(D G D A)*4"
 * into a flat token array.
 */
export function lexExpression(text) {
  const tokens = []
  let i = 0
  let lastType = null

  while (i < text.length) {
    if (text[i] === ' ' || text[i] === '\t') { i++; continue }
    if (text[i] === '(') { tokens.push({ type: ExprTokenTypes.LPAREN }); lastType = ExprTokenTypes.LPAREN; i++; continue }
    if (text[i] === ')') { tokens.push({ type: ExprTokenTypes.RPAREN }); lastType = ExprTokenTypes.RPAREN; i++; continue }
    if (text[i] === ',') { tokens.push({ type: ExprTokenTypes.COMMA }); lastType = ExprTokenTypes.COMMA; i++; continue }
    if (text[i] === '*') { tokens.push({ type: ExprTokenTypes.STAR }); lastType = ExprTokenTypes.STAR; i++; continue }

    // NNS chord: digit 1-7 when previous token is not STAR
    if (NNS_ROOTS.has(text[i]) && lastType !== ExprTokenTypes.STAR) {
      let root = text[i]
      i++
      // quality
      let quality = ''
      while (i < text.length && QUALITY_CHARS.test(text[i]) && text[i] !== ' ' && text[i] !== ')' && text[i] !== ',' && text[i] !== '*') {
        quality += text[i]
        i++
      }
      // slash bass
      let bass = ''
      if (i < text.length && text[i] === '/') {
        i++
        if (i < text.length && (ROOTS.has(text[i]) || NNS_ROOTS.has(text[i]))) {
          bass = text[i]
          i++
          if (!NNS_ROOTS.has(bass) && i < text.length && ACCIDENTALS.has(text[i])) {
            bass += text[i]
            i++
          }
        }
      }
      const token = { type: ExprTokenTypes.CHORD, root, quality, nashville: true }
      if (bass) token.bass = bass
      tokens.push(token)
      lastType = ExprTokenTypes.CHORD
      continue
    }

    // number (including NNS digits when after STAR)
    if (/[0-9]/.test(text[i])) {
      let num = ''
      while (i < text.length && /[0-9]/.test(text[i])) { num += text[i]; i++ }
      tokens.push({ type: ExprTokenTypes.NUMBER, value: parseInt(num, 10) })
      lastType = ExprTokenTypes.NUMBER
      continue
    }

    // word or chord: starts with a letter
    if (/[A-Za-z]/.test(text[i])) {
      let word = ''
      while (i < text.length && /[A-Za-z0-9#b+]/.test(text[i])) { word += text[i]; i++ }

      // Determine if this is a chord (starts with A-G, followed by optional accidental + quality)
      // or a section reference word (all caps like VERSE, CHORUS)
      if (ROOTS.has(word[0]) && (word.length === 1 || !isAllCaps(word))) {
        // Parse as chord
        let root = word[0]
        let rest = word.slice(1)
        if (rest.length > 0 && ACCIDENTALS.has(rest[0])) {
          root += rest[0]
          rest = rest.slice(1)
        }
        // Check for slash bass note
        let bass = ''
        if (i < text.length && text[i] === '/') {
          i++ // consume /
          if (i < text.length && ROOTS.has(text[i])) {
            bass = text[i]
            i++
            if (i < text.length && ACCIDENTALS.has(text[i])) {
              bass += text[i]
              i++
            }
          }
        }
        const token = { type: ExprTokenTypes.CHORD, root, quality: rest }
        if (bass) token.bass = bass
        tokens.push(token)
        lastType = ExprTokenTypes.CHORD
      } else {
        tokens.push({ type: ExprTokenTypes.WORD, value: word })
        lastType = ExprTokenTypes.WORD
      }
      continue
    }

    // skip unknown
    i++
  }

  tokens.push({ type: ExprTokenTypes.EOF })
  return tokens
}

function isAllCaps(str) {
  return str === str.toUpperCase() && /^[A-Z]+$/.test(str)
}

export { ExprTokenTypes }
