import { describe, it, expect } from 'vitest'
import { scanChordLine, isChordLine, lexExpression, ExprTokenTypes } from '../src/lexer.js'

describe('isChordLine', () => {
  it('detects simple chord lines', () => {
    expect(isChordLine('   A      G    ')).toBe(true)
    expect(isChordLine('   A      G    Bm   ')).toBe(true)
    expect(isChordLine('A      G')).toBe(true)
    expect(isChordLine('A      G    ')).toBe(true)
    expect(isChordLine('    A      G')).toBe(true)
  })

  it('detects chord lines with qualities', () => {
    expect(isChordLine('Bm B7')).toBe(true)
    expect(isChordLine('Am C G D7')).toBe(true)
    expect(isChordLine('D7')).toBe(true)
  })

  it('rejects lyric lines', () => {
    expect(isChordLine('This Is A Test Of Things')).toBe(false)
    expect(isChordLine('Blue mountain road, North Carolina,')).toBe(false)
    expect(isChordLine("I've been to Asheville once before")).toBe(false)
  })

  it('rejects empty/blank lines', () => {
    expect(isChordLine('')).toBe(false)
    expect(isChordLine('   ')).toBe(false)
  })

  it('detects lines with bar lines', () => {
    expect(isChordLine('| A | G | D |')).toBe(true)
    expect(isChordLine('A | G')).toBe(true)
  })
})

describe('scanChordLine', () => {
  it('returns tokens for valid chord lines', () => {
    const tokens = scanChordLine('G                               F')
    expect(tokens).not.toBeNull()
    expect(tokens.length).toBe(2)
    expect(tokens[0]).toEqual({ type: 'CHORD', column: 0, root: 'G', quality: '' })
    expect(tokens[1]).toEqual({ type: 'CHORD', column: 32, root: 'F', quality: '' })
  })

  it('parses accidentals in root', () => {
    const tokens = scanChordLine('Bb Am')
    expect(tokens[0].root).toBe('Bb')
    expect(tokens[1].root).toBe('A')
    expect(tokens[1].quality).toBe('m')
  })

  it('parses qualities', () => {
    const tokens = scanChordLine('D7 Am Cmaj7 G#m')
    expect(tokens[0]).toMatchObject({ root: 'D', quality: '7' })
    expect(tokens[1]).toMatchObject({ root: 'A', quality: 'm' })
    expect(tokens[2]).toMatchObject({ root: 'C', quality: 'maj7' })
    expect(tokens[3]).toMatchObject({ root: 'G#', quality: 'm' })
  })

  it('parses bar lines', () => {
    const tokens = scanChordLine('| A | G |')
    expect(tokens.filter(t => t.type === 'BAR_LINE').length).toBe(3)
    expect(tokens.filter(t => t.type === 'CHORD').length).toBe(2)
  })

  it('returns null for lyric lines', () => {
    expect(scanChordLine('This is a lyric line')).toBeNull()
    expect(scanChordLine('Blue mountain road')).toBeNull()
  })

  it('returns null for empty lines', () => {
    expect(scanChordLine('')).toBeNull()
    expect(scanChordLine('   ')).toBeNull()
  })

  it('preserves column positions', () => {
    const tokens = scanChordLine('       G                           Am')
    expect(tokens[0].column).toBe(7)
    expect(tokens[1].column).toBe(35)
  })
})

describe('lexExpression', () => {
  it('tokenizes simple chord list', () => {
    const tokens = lexExpression('D G D A')
    const chords = tokens.filter(t => t.type === ExprTokenTypes.CHORD)
    expect(chords.length).toBe(4)
    expect(chords.map(c => c.root)).toEqual(['D', 'G', 'D', 'A'])
  })

  it('tokenizes parenthesized repeat', () => {
    const tokens = lexExpression('(D G D A)*4')
    expect(tokens[0].type).toBe(ExprTokenTypes.LPAREN)
    expect(tokens[tokens.length - 2].type).toBe(ExprTokenTypes.NUMBER)
    expect(tokens[tokens.length - 2].value).toBe(4)
  })

  it('tokenizes section references', () => {
    const tokens = lexExpression('(VERSE, CHORUS*2)')
    const words = tokens.filter(t => t.type === ExprTokenTypes.WORD)
    expect(words.map(w => w.value)).toEqual(['VERSE', 'CHORUS'])
  })

  it('tokenizes mixed expressions', () => {
    const tokens = lexExpression('D G D A D')
    const chords = tokens.filter(t => t.type === ExprTokenTypes.CHORD)
    expect(chords.length).toBe(5)
  })
})
