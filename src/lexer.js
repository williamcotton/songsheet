const ROOTS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
const ACCIDENTALS = new Set(['#', 'b'])
const QUALITY_CHARS = /[a-z0-9#+]/i

/**
 * Scan a line left-to-right and return an array of chord/bar-line tokens,
 * or null if the line is not a valid chord line.
 *
 * A chord line must contain at least one chord, and every non-whitespace
 * token must parse as a valid chord or `|`.
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

    // try to parse a chord: root + optional accidental + optional quality
    if (ROOTS.has(line[i])) {
      let root = line[i]
      i++

      // accidental
      if (i < line.length && ACCIDENTALS.has(line[i])) {
        root += line[i]
        i++
      }

      // quality: consume word chars that are valid in chord names
      let quality = ''
      while (i < line.length && QUALITY_CHARS.test(line[i]) && line[i] !== ' ' && line[i] !== '|') {
        quality += line[i]
        i++
      }

      // slash chord: /Bass
      let bass = ''
      if (i < line.length && line[i] === '/') {
        i++ // consume /
        if (i < line.length && ROOTS.has(line[i])) {
          bass = line[i]
          i++
          if (i < line.length && ACCIDENTALS.has(line[i])) {
            bass += line[i]
            i++
          }
        } else {
          return null // / not followed by a valid note
        }
      }

      // next char must be whitespace, end-of-line, or |
      if (i < line.length && line[i] !== ' ' && line[i] !== '\t' && line[i] !== '|') {
        return null // not a chord line
      }

      const token = { type: 'CHORD', column, root, quality }
      if (bass) token.bass = bass
      tokens.push(token)
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

  while (i < text.length) {
    if (text[i] === ' ' || text[i] === '\t') { i++; continue }
    if (text[i] === '(') { tokens.push({ type: ExprTokenTypes.LPAREN }); i++; continue }
    if (text[i] === ')') { tokens.push({ type: ExprTokenTypes.RPAREN }); i++; continue }
    if (text[i] === ',') { tokens.push({ type: ExprTokenTypes.COMMA }); i++; continue }
    if (text[i] === '*') { tokens.push({ type: ExprTokenTypes.STAR }); i++; continue }

    // number
    if (/[0-9]/.test(text[i])) {
      let num = ''
      while (i < text.length && /[0-9]/.test(text[i])) { num += text[i]; i++ }
      tokens.push({ type: ExprTokenTypes.NUMBER, value: parseInt(num, 10) })
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
      } else {
        tokens.push({ type: ExprTokenTypes.WORD, value: word })
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
